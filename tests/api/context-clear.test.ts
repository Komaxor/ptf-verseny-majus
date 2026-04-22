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
  return new Request("http://localhost/api/context-clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/context-clear", () => {
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

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 1 }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 401 when session token does not match any user", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const userChain = makeChain({ data: null, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => userChain),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("bad-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 1 }) as never);

    expect(res.status).toBe(401);
  });

  it("returns 400 when round is 0 (below valid range)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => userChain),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 0 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when round is 4 (above valid range)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => userChain),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 4 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when round is missing from body", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => userChain),
    } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({}) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 200 and inserts to april_context_clears on valid clear (round 1)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const insertChain = makeChain({ data: null, error: null });
    const insertFn = vi.fn(() => insertChain);
    (insertChain as Record<string, unknown>).insert = insertFn;

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_context_clears") {
          return { insert: insertFn };
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 1 }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", round: 1 }),
    );
  });

  it("returns 200 for valid round 3", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-2" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const insertFn = vi.fn(() => makeChain({ data: null, error: null }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_context_clears") return { insert: insertFn };
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/context-clear/route");
    const res = await POST(makeRequest({ round: 3 }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
