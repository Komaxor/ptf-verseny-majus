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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/solve-metrics", () => {
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

    const { GET } = await import("@/app/api/solve-metrics/route");
    const res = await GET({} as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
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

    const { GET } = await import("@/app/api/solve-metrics/route");
    const res = await GET({} as never);

    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no game state", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: null, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
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

    const { GET } = await import("@/app/api/solve-metrics/route");
    const res = await GET({} as never);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 200 with per-round breakdown containing correct fields", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gameState = {
      user_id: "user-1",
      round1_started_at: "2026-04-25T13:00:00Z",
      round1_completed_at: "2026-04-25T13:10:00Z",
      round2_started_at: "2026-04-25T13:12:00Z",
      round2_completed_at: "2026-04-25T13:22:00Z",
      round3_started_at: "2026-04-25T13:24:00Z",
      round3_completed_at: "2026-04-25T13:40:00Z",
    };
    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    // may_chat_sessions: two sessions — one for round 1, one for round 2
    const sessions = [
      { round: 1, message_count: 5 },
      { round: 2, message_count: 3 },
    ];
    const sessionsChain = makeChain({ data: sessions, error: null });

    // may_failed_attempts: two failures in round 1
    const failed = [{ round: 1 }, { round: 1 }];
    const failedChain = makeChain({ data: failed, error: null });

    // may_hint_clicks: one click in round 2
    const hints = [{ round: 2 }];
    const hintsChain = makeChain({ data: hints, error: null });

    // may_tool_calls: one call in round 3
    const tools = [{ round: 3 }];
    const toolsChain = makeChain({ data: tools, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_game_state") return gsChain;
        if (table === "may_chat_sessions") return sessionsChain;
        if (table === "may_failed_attempts") return failedChain;
        if (table === "may_hint_clicks") return hintsChain;
        if (table === "may_tool_calls") return toolsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { GET } = await import("@/app/api/solve-metrics/route");
    const res = await GET({} as never);

    expect(res.status).toBe(200);
    const body = await res.json();

    // Top-level fields
    expect(body).toHaveProperty("totalTimeSeconds");
    expect(body).toHaveProperty("totalMessages");
    expect(body).toHaveProperty("totalHints");
    expect(body).toHaveProperty("totalFailedAttempts");
    expect(body).toHaveProperty("solvedAt");
    expect(body).toHaveProperty("rounds");

    // Per-round breakdown
    expect(body.rounds).toHaveLength(3);
    for (const r of body.rounds) {
      expect(r).toHaveProperty("round");
      expect(r).toHaveProperty("timeSeconds");
      expect(r).toHaveProperty("messageCount");
      expect(r).toHaveProperty("hintClicks");
      expect(r).toHaveProperty("failedAttempts");
    }

    // Verify computed totals
    expect(typeof body.totalTimeSeconds).toBe("number");
    expect(body.totalMessages).toBe(8); // 5 + 3
    expect(body.totalHints).toBe(1);
    expect(body.totalFailedAttempts).toBe(2);

    // Round 1: 10 min = 600 s
    const r1 = body.rounds.find((r: { round: number }) => r.round === 1);
    expect(r1.timeSeconds).toBe(600);
    expect(r1.messageCount).toBe(5);
    expect(r1.failedAttempts).toBe(2);
    expect(r1.hintClicks).toBe(0);

    // Round 2: 10 min = 600 s
    const r2 = body.rounds.find((r: { round: number }) => r.round === 2);
    expect(r2.timeSeconds).toBe(600);
    expect(r2.messageCount).toBe(3);
    expect(r2.hintClicks).toBe(1);

    // Round 3: 16 min = 960 s
    const r3 = body.rounds.find((r: { round: number }) => r.round === 3);
    expect(r3.timeSeconds).toBe(960);
    expect(r3.messageCount).toBe(0);

    // solvedAt should be round3_completed_at
    expect(body.solvedAt).toBe(gameState.round3_completed_at);
  });

  it("returns 200 with zero values when no session/hint/failure data", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-2" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gameState = {
      user_id: "user-2",
      round1_started_at: null,
      round1_completed_at: null,
      round2_started_at: null,
      round2_completed_at: null,
      round3_started_at: null,
      round3_completed_at: null,
    };
    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const emptyChain = makeChain({ data: [], error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_game_state") return gsChain;
        return emptyChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { GET } = await import("@/app/api/solve-metrics/route");
    const res = await GET({} as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTimeSeconds).toBe(0);
    expect(body.totalMessages).toBe(0);
    expect(body.totalHints).toBe(0);
    expect(body.totalFailedAttempts).toBe(0);
    expect(body.rounds).toHaveLength(3);
    for (const r of body.rounds) {
      expect(r.timeSeconds).toBe(0);
      expect(r.messageCount).toBe(0);
      expect(r.hintClicks).toBe(0);
      expect(r.failedAttempts).toBe(0);
    }
  });
});
