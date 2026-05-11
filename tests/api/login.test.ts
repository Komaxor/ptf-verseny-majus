import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We mock these at the top level; each test calls vi.resetModules() + dynamic
// import() to get a fresh route module with the right config in scope.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
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

/** Build a minimal POST request for /api/login. */
function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
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

// ---------------------------------------------------------------------------
// Shared setup for "competition is open" tests
// ---------------------------------------------------------------------------

function mockOpenCompetition() {
  vi.doMock("@/lib/config", () => ({
    COMPETITION_START: new Date("2000-01-01T00:00:00Z"),
    COMPETITION_END: new Date("2099-01-01T00:00:00Z"),
  }));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/login", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── 403: competition not started ─────────────────────────────────────────

  it("returns 403 before competition starts", async () => {
    vi.doMock("@/lib/config", () => ({
      COMPETITION_START: new Date("2099-01-01T00:00:00Z"),
      COMPETITION_END: new Date("2099-06-01T00:00:00Z"),
    }));

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const res = await POST(makeRequest({ password: "anypassword" }) as never);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 403: competition has ended ────────────────────────────────────────────

  it("returns 403 after competition has ended", async () => {
    vi.doMock("@/lib/config", () => ({
      COMPETITION_START: new Date("2000-01-01T00:00:00Z"),
      COMPETITION_END: new Date("2000-06-01T00:00:00Z"),
    }));

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const res = await POST(makeRequest({ password: "anypassword" }) as never);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 429: rate limiting ────────────────────────────────────────────────────

  it("returns 429 after 10 requests from the same IP in 1 minute", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    // Supabase returns "not found" — we just need requests to reach and pass the
    // rate-limit check so the counter increments
    const userChain = makeChain({ data: null, error: { message: "not found" } });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "not found" } }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");

    // Use a unique IP to avoid interference from other tests
    const ip = `rate-limit-test-ip-${Date.now()}`;

    // 10 requests exhaust the allowance
    for (let i = 0; i < 10; i++) {
      await POST(
        makeRequest({ password: "wrongpassword" }, { "x-forwarded-for": ip }) as never,
      );
    }

    // 11th request should be rate-limited
    const res = await POST(
      makeRequest({ password: "wrongpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 400: missing password ─────────────────────────────────────────────────

  it("returns 400 when password is missing from body", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-400-missing-${Date.now()}`;
    const res = await POST(
      makeRequest({}, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is an empty string", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-400-empty-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is whitespace-only", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-400-ws-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "   " }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is not a string", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockReturnValue({ from: vi.fn() } as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-400-type-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: 12345 }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 401: invalid password ─────────────────────────────────────────────────

  it("returns 401 when password is not found in the database", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    const userChain = makeChain({ data: null, error: { message: "no rows" } });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "no rows" } }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-401-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "wrongpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 409: password already in use by another session ──────────────────────

  it("returns 409 when the user already has a session_token and no matching cookie", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");
    const user = {
      id: "user-uuid-1",
      first_login_at: "2024-01-01T10:00:00Z",
      is_solved: false,
      session_token: "existing-session-token",
    };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    // Cookie does NOT match the existing session_token
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("different-session-token") as never,
    );

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-409-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "validpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 200: successful first login ───────────────────────────────────────────

  it("returns 200 with userId and gameState on successful first login", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");

    const user = {
      id: "user-uuid-new",
      first_login_at: null,
      is_solved: false,
      session_token: null,
    };

    const gameState = {
      id: "game-state-1",
      user_id: "user-uuid-new",
      current_phase: "VIDEO_INTRO",
    };

    // Select users chain
    const userSelectChain = makeChain({ data: user, error: null });
    (userSelectChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // Update users chain
    const userUpdateChain = makeChain({ data: null, error: null });

    // Game state: no existing state
    const gsSelectChain = makeChain({ data: null, error: null });
    (gsSelectChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    // Game state insert chain (insert().select().single())
    const gsInsertChain = makeChain({ data: gameState, error: null });
    (gsInsertChain as Record<string, unknown>).select = vi.fn(() => gsInsertChain);
    (gsInsertChain as Record<string, unknown>).insert = vi.fn(() => gsInsertChain);
    (gsInsertChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    let userCallCount = 0;
    let gsCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userSelectChain : userUpdateChain;
        }
        if (table === "may_game_state") {
          gsCallCount++;
          return gsCallCount === 1 ? gsSelectChain : gsInsertChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const cookieStore = makeCookieStore(undefined);
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(cookieStore as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-200-new-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "validpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("user-uuid-new");
    expect(body).toHaveProperty("gameState");
    expect(body).toHaveProperty("alreadySolved", false);

    // Cookie should have been set with httpOnly
    expect(cookieStore.set).toHaveBeenCalledWith(
      "competition_session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  // ── 200: re-login with matching session cookie ────────────────────────────

  it("returns 200 when same user re-enters with matching session cookie", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");

    const existingToken = "my-existing-token";
    const user = {
      id: "user-uuid-returning",
      first_login_at: "2024-01-01T10:00:00Z",
      is_solved: false,
      session_token: existingToken,
    };
    const gameState = {
      id: "gs-1",
      user_id: "user-uuid-returning",
      current_phase: "PLAYING",
    };

    const userSelectChain = makeChain({ data: user, error: null });
    (userSelectChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const userUpdateChain = makeChain({ data: null, error: null });

    const gsSelectChain = makeChain({ data: gameState, error: null });
    (gsSelectChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: gameState, error: null }),
    );

    let userCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userSelectChain : userUpdateChain;
        }
        if (table === "may_game_state") return gsSelectChain;
        return makeChain();
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    // Cookie matches stored session_token → not a 409
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(existingToken) as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-200-returning-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "validpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("user-uuid-returning");
    expect(body.gameState).toEqual(gameState);
  });

  // ── 500: Supabase update fails ────────────────────────────────────────────

  it("returns 500 when session token update fails", async () => {
    mockOpenCompetition();

    const { createClient } = await import("@supabase/supabase-js");

    const user = {
      id: "user-uuid-fail",
      first_login_at: null,
      is_solved: false,
      session_token: null,
    };

    const userSelectChain = makeChain({ data: user, error: null });
    (userSelectChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // Update returns an error
    const updateChain = makeChain({ data: null, error: { message: "update failed" } });

    let userCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") {
          userCallCount++;
          return userCallCount === 1 ? userSelectChain : updateChain;
        }
        return makeChain();
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as never);

    const { POST } = await import("@/app/api/login/route");
    const ip = `ip-500-${Date.now()}`;
    const res = await POST(
      makeRequest({ password: "validpassword" }, { "x-forwarded-for": ip }) as never,
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
