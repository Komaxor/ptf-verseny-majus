import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/round-loader", () => ({
  loadRoundConfig: vi.fn(),
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
  return new Request("http://localhost/api/hint-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Returns an ISO timestamp N minutes ago. */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/hint-click", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session cookie", async () => {
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
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1, sessionHash: "abc" }) as never,
    );

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

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1, sessionHash: "abc" }) as never,
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when round is missing", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ hintNumber: 1, sessionHash: "abc" }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when hintNumber is missing", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, sessionHash: "abc" }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when sessionHash is missing", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1 }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when round has not started (round_started_at is null)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gameState = { user_id: "user-1", round1_started_at: null };
    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1, sessionHash: "abc" }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/round not started/i);
  });

  it("returns 400 when hint is not yet unlocked (started 2 min ago, unlock at 6 min)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gameState = {
      user_id: "user-1",
      round1_started_at: minutesAgo(2),
    };
    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { loadRoundConfig } = await import("@/lib/round-loader");
    vi.mocked(loadRoundConfig).mockReturnValue({
      hints: [{ number: 1, unlock_after_minutes: 6 }],
    } as never);

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1, sessionHash: "abc" }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not yet unlocked/i);
  });

  it("returns 200 when hint is unlocked (started 10 min ago, unlock at 6 min)", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gameState = {
      user_id: "user-1",
      round1_started_at: minutesAgo(10),
    };
    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const upsertChain = makeChain({ data: null, error: null });
    const rpcChain = makeChain({ data: null, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_game_state") return gsChain;
        if (table === "may_hint_clicks") return upsertChain;
        return makeChain();
      }),
      rpc: vi.fn(() => rpcChain),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { loadRoundConfig } = await import("@/lib/round-loader");
    vi.mocked(loadRoundConfig).mockReturnValue({
      hints: [{ number: 1, unlock_after_minutes: 6 }],
    } as never);

    const { POST } = await import("@/app/api/hint-click/route");
    const res = await POST(
      makeRequest({ round: 1, hintNumber: 1, sessionHash: "session-hash-xyz" }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
