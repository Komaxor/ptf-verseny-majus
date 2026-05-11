import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Top-level mocks — reset + re-import in each test via vi.resetModules()
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/chat-logger", () => ({
  markRoundComplete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/round-loader", () => ({
  verifyAnswer: vi.fn(),
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
function makeCookieStore(sessionToken: string | undefined = undefined) {
  return {
    get: vi.fn((name: string) => {
      if (name === "competition_session" && sessionToken !== undefined) {
        return { value: sessionToken };
      }
      return undefined;
    }),
    set: vi.fn(),
  };
}

/** Build a minimal POST request for /api/verify-passcode. */
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/verify-passcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A user object returned by Supabase when the session is valid. */
const VALID_USER = {
  id: "user-abc-123",
  is_solved: false,
  total_passcode_attempts: 0,
};

/** Standard mock config setup for all tests. */
function mockConfig() {
  vi.doMock("@/lib/config", () => ({
    ANSWER_COOLDOWN_MS: 5000,
  }));
}

/** Mock verifyAnswer to return a specific value. */
function mockVerifyAnswer(returnValue: boolean) {
  vi.doMock("@/lib/round-loader", () => ({
    verifyAnswer: vi.fn().mockReturnValue(returnValue),
  }));
}

/**
 * Build a Supabase client where:
 *  - may_competition_users returns `userResult` on `.single()`
 *  - may_failed_attempts returns `rateLimitData` (array) on await
 *  - rpc always resolves to { data: null, error: null }
 */
function makeClientWithUser(
  userResult: { data: unknown; error: unknown },
  rateLimitData: unknown[] = [],
) {
  const userChain = makeChain(userResult);
  (userChain as Record<string, unknown>).single = vi.fn(() =>
    Promise.resolve(userResult),
  );

  // Rate-limit chain: resolves to { data: rateLimitData, error: null }
  const rateChain = makeChain({ data: rateLimitData, error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === "may_competition_users") return userChain;
      if (table === "may_failed_attempts") return rateChain;
      return makeChain();
    }),
    rpc: vi.fn(() => makeChain({ data: null, error: null })),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/verify-passcode", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── 401: no cookie ────────────────────────────────────────────────────────

  it("returns 401 when there is no competition_session cookie", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: null, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "CORRECT", round: 1 }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 401: invalid session token ────────────────────────────────────────────

  it("returns 401 when session token does not match any user", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    // Supabase returns no user for the given session token
    const client = makeClientWithUser({ data: null, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(
      makeCookieStore("invalid-token-xyz") as never,
    );

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "CORRECT", round: 1 }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 400: missing answer ───────────────────────────────────────────────────

  it("returns 400 when answer is missing from body", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when answer is an empty string", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "", round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when answer is not a string", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: 42, round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 400: answer exceeding 100 chars ───────────────────────────────────────

  it("returns 400 when answer exceeds 100 characters", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const longAnswer = "A".repeat(101);
    const res = await POST(makeRequest({ answer: longAnswer, round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/karakter/);
  });

  // ── 400: invalid/missing round ────────────────────────────────────────────

  it("returns 400 when round is missing", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "ANSWER" }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when round is 0 (below valid range)", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "ANSWER", round: 0 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when round is 4 (above valid range)", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null });
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "ANSWER", round: 4 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 429: rate limited ─────────────────────────────────────────────────────

  it("returns 429 when user has a recent failed attempt (within cooldown period)", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");

    // Simulate a recent failed attempt (1 second ago = within 5s cooldown)
    const recentAttempt = { created_at: new Date(Date.now() - 1000).toISOString() };
    const client = makeClientWithUser(
      { data: VALID_USER, error: null },
      [recentAttempt],
    );
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "ANSWER", round: 1 }) as never);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.rateLimited).toBe(true);
    expect(typeof body.waitTime).toBe("number");
    expect(body.waitTime).toBeGreaterThan(0);
  });

  it("allows attempt when no recent failed attempts exist (not rate limited)", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");

    // No recent attempts within cooldown window
    const client = makeClientWithUser(
      { data: VALID_USER, error: null },
      [], // empty = no rate limit
    );
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "WRONG", round: 1 }) as never);

    // Should NOT be rate limited (429), even though answer is wrong
    expect(res.status).not.toBe(429);
  });

  // ── Wrong answer (logged to may_failed_attempts) ───────────────────────
  // Note: the route returns HTTP 200 with success: false for wrong answers
  // (no explicit status code is set, so Next.js defaults to 200).

  it("returns success:false with 'Hibás válasz' error for wrong answer", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null }, []);
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "NOPE", round: 2 }) as never);

    // Route returns 200 with success: false for wrong answers
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Hibás válasz");
  });

  it("inserts to may_failed_attempts on wrong answer", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");

    // Track calls to may_failed_attempts separately
    const failedAttemptsInsertChain = makeChain({ data: null, error: null });
    const failedAttemptsSelectChain = makeChain({ data: [], error: null }); // empty = not rate limited

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    let failedAttemptsCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_failed_attempts") {
          failedAttemptsCallCount++;
          // First call is the rate-limit SELECT, second is the INSERT
          return failedAttemptsCallCount === 1
            ? failedAttemptsSelectChain
            : failedAttemptsInsertChain;
        }
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(
      makeRequest({ answer: "WRONG_ANSWER", round: 1 }) as never,
    );

    // Route returns 200 with success: false for wrong answers
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();

    // SELECT (rate-limit check) + INSERT (log failed attempt) = at least 2 calls
    expect(failedAttemptsCallCount).toBeGreaterThanOrEqual(2);
  });

  // ── 200: correct answer (updates game state) ──────────────────────────────

  it("returns 200 and updates may_game_state on correct answer", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const failedAttemptsSelectChain = makeChain({ data: [], error: null });
    const gameStateUpdateChain = makeChain({ data: null, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_failed_attempts") return failedAttemptsSelectChain;
        if (table === "may_game_state") return gameStateUpdateChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(
      makeRequest({ answer: "CORRECT_ANSWER", round: 1, sessionHash: "sess-hash-1" }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // game state update should have been called
    expect(client.from).toHaveBeenCalledWith("may_game_state");
  });

  it("calls verifyAnswer with the correct round number and trimmed answer", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = makeClientWithUser({ data: VALID_USER, error: null }, []);
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { verifyAnswer } = await import("@/lib/round-loader");

    const { POST } = await import("@/app/api/verify-passcode/route");
    await POST(makeRequest({ answer: "  trimmed  ", round: 2 }) as never);

    // verifyAnswer should be called with the trimmed answer
    expect(verifyAnswer).toHaveBeenCalledWith(2, "trimmed");
  });

  it("calls markRoundComplete when sessionHash is provided and answer is correct", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");

    const { POST } = await import("@/app/api/verify-passcode/route");
    await POST(
      makeRequest({ answer: "CORRECT", round: 3, sessionHash: "my-session-hash" }) as never,
    );

    expect(markRoundComplete).toHaveBeenCalledWith(
      VALID_USER.id,
      3,
      "my-session-hash",
    );
  });

  it("does NOT call markRoundComplete when sessionHash is absent", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");

    const { POST } = await import("@/app/api/verify-passcode/route");
    await POST(makeRequest({ answer: "CORRECT", round: 1 }) as never);

    expect(markRoundComplete).not.toHaveBeenCalled();
  });

  it("increments passcode attempts via RPC before verifying the answer", async () => {
    mockConfig();
    mockVerifyAnswer(false);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const rpcMock = vi.fn(() => makeChain({ data: null, error: null }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: rpcMock,
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    await POST(makeRequest({ answer: "WRONG", round: 1 }) as never);

    expect(rpcMock).toHaveBeenCalledWith(
      "may_increment_user_passcode_attempts",
      { p_user_id: VALID_USER.id },
    );
  });

  // ── Correct answer for each valid round ───────────────────────────────────

  it("returns 200 for correct answer on round 1", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "RIGHT", round: 1 }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 for correct answer on round 2", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "RIGHT", round: 2 }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 for correct answer on round 3", async () => {
    mockConfig();
    mockVerifyAnswer(true);

    const { createServiceClient } = await import("@/lib/supabase/server");

    const userChain = makeChain({ data: VALID_USER, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: VALID_USER, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return makeChain();
      }),
      rpc: vi.fn(() => makeChain({ data: null, error: null })),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/verify-passcode/route");
    const res = await POST(makeRequest({ answer: "RIGHT", round: 3 }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
