import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChain(
  result: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const chain: Record<string, unknown> = {};
  const chainMethods = [
    "from",
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "rpc",
  ];
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

function makeCookieStore(token: string | undefined = undefined) {
  return {
    get: vi.fn((name: string) => {
      if (name === "competition_session" && token !== undefined) {
        return { value: token };
      }
      return undefined;
    }),
    set: vi.fn(),
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/set-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/set-username", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session cookie", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => makeChain()),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "TestUser" }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 when session token does not match any user", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const userChain = makeChain({ data: null, error: { message: "no rows" } });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "no rows" } }),
    );
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => userChain),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("bad-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "TestUser" }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when username is empty string", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => makeChain()),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "" }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when username is whitespace only", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => makeChain()),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "   " }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when username is missing from body", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => makeChain()),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({}) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when username exceeds 50 characters", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => makeChain()),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const longName = "A".repeat(51);
    const res = await POST(makeRequest({ username: longName }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 for exactly 50 characters (valid boundary)", async () => {
    // 50 chars is allowed — should NOT be 400 for a solved user
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: true };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const updateChain = makeChain({ data: null, error: null });
    let userCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userChain : updateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const exactName = "A".repeat(50);
    const res = await POST(makeRequest({ username: exactName }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 403 when user has not solved the competition", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "ValidName" }) as never);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 200 for a solved user with a valid username", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: true };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const updateChain = makeChain({ data: null, error: null });
    let userCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userChain : updateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/set-username/route");
    const res = await POST(makeRequest({ username: "Kovács Béla" }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
