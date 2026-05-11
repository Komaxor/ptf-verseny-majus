import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Top-level mocks — reset + re-import in each test via vi.resetModules()
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: { content: "yes" },
      },
    ],
  });
  function OpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }
  // Expose mockCreate so individual tests can override it
  OpenAI._mockCreate = mockCreate;
  return { default: OpenAI };
});

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

/** Build a POST request for /api/judge. */
function makeRequest(): Request {
  return new Request("http://localhost/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

/**
 * Build a full Supabase client mock for the happy path.
 * - may_competition_users: returns user with given id
 * - may_chat_messages: returns last assistant message
 * - may_judge_attempts: returns no previous judge attempt (select), insert succeeds
 * - may_game_state: update succeeds
 */
function makeHappyPathClient(
  userId: string,
  assistantMsgContent: string,
  assistantMsgCreatedAt: string,
  lastJudgeAttempt: { attempted_at: string } | null = null,
) {
  const user = { id: userId };
  const userChain = makeChain({ data: user, error: null });
  (userChain as Record<string, unknown>).single = vi.fn(() =>
    Promise.resolve({ data: user, error: null }),
  );

  const assistantMsg = { created_at: assistantMsgCreatedAt, content: assistantMsgContent };
  const assistantMsgChain = makeChain({ data: assistantMsg, error: null });
  (assistantMsgChain as Record<string, unknown>).single = vi.fn(() =>
    Promise.resolve({ data: assistantMsg, error: null }),
  );

  const judgeAttemptChain = makeChain({ data: lastJudgeAttempt, error: null });
  (judgeAttemptChain as Record<string, unknown>).single = vi.fn(() =>
    Promise.resolve({ data: lastJudgeAttempt, error: null }),
  );

  const insertChain = makeChain({ data: null, error: null });
  const updateChain = makeChain({ data: null, error: null });

  let chatMsgCallCount = 0;
  let judgeCallCount = 0;

  const client = {
    from: vi.fn((table: string) => {
      if (table === "may_competition_users") return userChain;
      if (table === "may_chat_messages") {
        chatMsgCallCount++;
        return assistantMsgChain;
      }
      if (table === "may_judge_attempts") {
        judgeCallCount++;
        // First call is the select (rate limit check), subsequent calls are inserts
        return judgeCallCount === 1 ? judgeAttemptChain : insertChain;
      }
      if (table === "may_game_state") return updateChain;
      return makeChain();
    }),
  };
  void chatMsgCallCount; // suppress unused warning
  return client;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/judge", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  // ── 401: no auth cookie ───────────────────────────────────────────────────

  it("returns 401 without a session cookie", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = { from: vi.fn(() => makeChain()) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.granted).toBe(false);
  });

  // ── 401: invalid session token ────────────────────────────────────────────

  it("returns 401 with invalid session token", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const userChain = makeChain({ data: null, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = { from: vi.fn(() => userChain) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("invalid-token") as never);

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.granted).toBe(false);
  });

  // ── 400: no assistant message in round 2 ─────────────────────────────────

  it("returns 400 when there is no assistant message in round 2", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // No assistant message found
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_chat_messages") return noMsgChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.granted).toBe(false);
  });

  // ── 429: already judged the latest message ────────────────────────────────

  it("returns 429 when already judged the latest assistant message", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    // Assistant message was sent at T, judge attempt was at T+1 (after the message)
    const msgTime = new Date("2025-01-01T10:00:00Z").toISOString();
    const judgeTime = new Date("2025-01-01T10:00:01Z").toISOString();

    const client = makeHappyPathClient(
      "user-1",
      "I'm opening the door for you.",
      msgTime,
      { attempted_at: judgeTime }, // judgeTime >= msgTime → already judged
    );
    vi.mocked(
      (await import("@/lib/supabase/server")).createServiceClient,
    ).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.granted).toBe(false);
  });

  // ── 200: judge says "yes" → granted: true ─────────────────────────────────

  it("returns { granted: true } when judge responds with 'yes'", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    // Message sent at T, no prior judge attempt (or judge attempt was before message)
    const msgTime = new Date("2025-01-01T10:00:00Z").toISOString();
    // lastJudgeAttempt is null → no previous attempt
    const client = makeHappyPathClient(
      "user-1",
      "Please come in, I'm opening the door.",
      msgTime,
      null,
    );
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    // Ensure OpenAI mock returns "yes"
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule.default as unknown as { _mockCreate: ReturnType<typeof vi.fn> })._mockCreate;
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "yes" } }],
    });

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(true);
  });

  // ── 200: judge says "no" → granted: false ────────────────────────────────

  it("returns { granted: false } when judge responds with 'no'", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");

    const msgTime = new Date("2025-01-01T10:00:00Z").toISOString();
    const client = makeHappyPathClient(
      "user-1",
      "How can I help you today?",
      msgTime,
      null,
    );
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    // Override OpenAI mock to return "no"
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule.default as unknown as { _mockCreate: ReturnType<typeof vi.fn> })._mockCreate;
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "no" } }],
    });

    const { POST } = await import("@/app/api/judge/route");
    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.granted).toBe(false);
  });
});
