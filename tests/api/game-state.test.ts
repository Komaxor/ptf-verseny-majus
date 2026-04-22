import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Top-level mocks — reset + re-import in each test via vi.resetModules()
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/chat-logger", () => ({
  getMessagesAfterLastClear: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable Supabase query-builder mock.
 * Every builder method returns `chain` itself.
 * `.single()` is overridden to return a resolved Promise.
 */
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
  // Make the chain thenable so `await chain` resolves to result
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

/** Build a cookie store mock. */
function makeCookieStore(existingToken: string | undefined = undefined) {
  return {
    get: vi.fn((name: string) => {
      if (name === "competition_session" && existingToken !== undefined) {
        return { value: existingToken };
      }
      return undefined;
    }),
    set: vi.fn(),
  };
}

/** Mock config for an open competition with all required phase constants. */
function mockOpenCompetition() {
  vi.doMock("@/lib/config", () => ({
    COMPETITION_START: new Date("2020-01-01T00:00:00Z"),
    COMPETITION_END: new Date("2030-01-01T00:00:00Z"),
    PHASES: [
      "VIDEO_INTRO",
      "ROUND_1",
      "VIDEO_1_2",
      "ROUND_2",
      "VIDEO_2_3",
      "ROUND_3",
      "VIDEO_OUTRO",
      "SUCCESS",
    ],
    VALID_TRANSITIONS: {
      VIDEO_INTRO: "ROUND_1",
      ROUND_1: "VIDEO_1_2",
      VIDEO_1_2: "ROUND_2",
      ROUND_2: "VIDEO_2_3",
      VIDEO_2_3: "ROUND_3",
      ROUND_3: "VIDEO_OUTRO",
      VIDEO_OUTRO: "SUCCESS",
      SUCCESS: null,
    },
    PHASE_ROUND: {
      ROUND_1: 1,
      ROUND_2: 2,
      ROUND_3: 3,
    },
  }));
}

// ---------------------------------------------------------------------------
// Test suite — GET /api/game-state
// ---------------------------------------------------------------------------

describe("GET /api/game-state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session cookie", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = { from: vi.fn(() => makeChain()) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { GET } = await import("@/app/api/game-state/route");
    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 401 when session token does not match any user", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const userChain = makeChain({ data: null, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("invalid-token") as never,
    );

    const { GET } = await import("@/app/api/game-state/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no game state", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
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
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { GET } = await import("@/app/api/game-state/route");
    const res = await GET();

    expect(res.status).toBe(404);
  });

  it("returns game state for an authenticated user in a non-round phase", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "VIDEO_INTRO",
    };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const hintsChain = makeChain({ data: [], error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        if (table === "april_hint_clicks") return hintsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { GET } = await import("@/app/api/game-state/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gameState).toEqual(gameState);
    expect(body.chatMessages).toEqual([]);
    expect(body.revealedHints).toEqual([]);
  });

  it("returns game state with chat messages when in a round phase", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-2", is_solved: false };
    const gameState = {
      id: "gs-2",
      user_id: "user-2",
      current_phase: "ROUND_1",
    };
    const messages = [
      { role: "user", content: "hello", created_at: "2026-01-01T00:00:00Z" },
    ];
    const hints = [{ round: 1, hint_number: 1 }];

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const hintsChain = makeChain({ data: hints, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        if (table === "april_hint_clicks") return hintsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { getMessagesAfterLastClear } = await import("@/lib/chat-logger");
    vi.mocked(getMessagesAfterLastClear).mockResolvedValue(messages as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { GET } = await import("@/app/api/game-state/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gameState).toEqual(gameState);
    expect(body.chatMessages).toEqual(messages);
    expect(body.revealedHints).toEqual(hints);
  });
});

// ---------------------------------------------------------------------------
// Test suite — PATCH /api/game-state
// ---------------------------------------------------------------------------

describe("PATCH /api/game-state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function makePatchRequest(): Request {
    return new Request("http://localhost/api/game-state", {
      method: "PATCH",
    });
  }

  it("returns 401 without a session cookie", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = { from: vi.fn(() => makeChain()) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 401 when session token does not match any user", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const userChain = makeChain({ data: null, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("bad-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no game state", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
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
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(404);
  });

  it("returns 400 when already at SUCCESS (no valid transition)", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: true };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "SUCCESS",
    };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when round is not completed (round1_completed_at is null)", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "ROUND_1",
      round1_completed_at: null,
    };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") return gsChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/round not completed/i);
  });

  it("advances phase from VIDEO_INTRO to ROUND_1", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "VIDEO_INTRO",
      round1_started_at: null,
    };
    const updatedState = {
      ...gameState,
      current_phase: "ROUND_1",
      round1_started_at: new Date().toISOString(),
    };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    // update chain returns updated state
    const gsUpdateChain = makeChain({ data: updatedState, error: null });
    (gsUpdateChain as Record<string, unknown>).select = vi.fn(
      () => gsUpdateChain,
    );
    (gsUpdateChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: updatedState, error: null }),
    );

    let gsCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") {
          gsCallCount++;
          return gsCallCount === 1 ? gsChain : gsUpdateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.gameState).toBeDefined();
  });

  it("advances phase from ROUND_1 to VIDEO_1_2 when round is completed", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "ROUND_1",
      round1_started_at: "2026-04-25T13:00:00Z",
      round1_completed_at: "2026-04-25T13:10:00Z",
    };
    const updatedState = { ...gameState, current_phase: "VIDEO_1_2" };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const gsUpdateChain = makeChain({ data: updatedState, error: null });
    (gsUpdateChain as Record<string, unknown>).select = vi.fn(
      () => gsUpdateChain,
    );
    (gsUpdateChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: updatedState, error: null }),
    );

    let gsCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") {
          gsCallCount++;
          return gsCallCount === 1 ? gsChain : gsUpdateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.gameState.current_phase).toBe("VIDEO_1_2");
  });

  it("marks user as solved and calculates round times when advancing to SUCCESS", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-success", is_solved: false };
    const gameState = {
      id: "gs-success",
      user_id: "user-success",
      current_phase: "VIDEO_OUTRO",
      round1_started_at: "2026-04-25T13:00:00Z",
      round1_completed_at: "2026-04-25T13:10:00Z",
      round2_started_at: "2026-04-25T13:12:00Z",
      round2_completed_at: "2026-04-25T13:25:00Z",
      round3_started_at: "2026-04-25T13:27:00Z",
      round3_completed_at: "2026-04-25T13:45:00Z",
    };
    const updatedState = { ...gameState, current_phase: "SUCCESS" };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // Track calls to april_competition_users for update calls
    const userUpdateChain = makeChain({ data: null, error: null });

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    const gsUpdateChain = makeChain({ data: updatedState, error: null });
    (gsUpdateChain as Record<string, unknown>).select = vi.fn(
      () => gsUpdateChain,
    );
    (gsUpdateChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: updatedState, error: null }),
    );

    let gsCallCount = 0;
    let userCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userChain : userUpdateChain;
        }
        if (table === "april_game_state") {
          gsCallCount++;
          return gsCallCount === 1 ? gsChain : gsUpdateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.gameState.current_phase).toBe("SUCCESS");

    // is_solved update should have been called on april_competition_users
    // (at least one update call beyond the initial select)
    expect(userCallCount).toBeGreaterThan(1);
  });

  it("returns 500 when game state update fails", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1", is_solved: false };
    const gameState = {
      id: "gs-1",
      user_id: "user-1",
      current_phase: "VIDEO_INTRO",
      round1_started_at: null,
    };

    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    const gsChain = makeChain({ data: gameState, error: null });
    (gsChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    // update chain returns error
    const gsUpdateChain = makeChain({
      data: null,
      error: { message: "db error" },
    });
    (gsUpdateChain as Record<string, unknown>).select = vi.fn(
      () => gsUpdateChain,
    );
    (gsUpdateChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "db error" } }),
    );

    let gsCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "april_competition_users") return userChain;
        if (table === "april_game_state") {
          gsCallCount++;
          return gsCallCount === 1 ? gsChain : gsUpdateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("valid-token") as never,
    );

    const { PATCH } = await import("@/app/api/game-state/route");
    const res = await PATCH(makePatchRequest() as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
