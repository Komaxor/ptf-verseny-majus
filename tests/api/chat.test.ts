import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Top-level mocks — reset + re-import in each test via vi.resetModules()
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/chat-logger", () => ({
  getOrCreateChatSession: vi.fn().mockResolvedValue({ sessionId: "session-1" }),
  logChatMessage: vi.fn().mockResolvedValue(undefined),
  logToolCall: vi.fn().mockResolvedValue(undefined),
  getMessagesAfterLastClear: vi.fn().mockResolvedValue([]),
  extractUserIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/round-loader", () => ({
  loadRoundConfig: vi.fn().mockReturnValue({ tools: [] }),
  loadSystemPrompt: vi.fn().mockReturnValue("You are a helpful assistant."),
  loadToolFile: vi.fn().mockReturnValue("{}"),
  getToolFileName: vi.fn().mockReturnValue("tool.json"),
  extractWelcomeMessage: vi.fn().mockReturnValue("Welcome!"),
}));

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        finish_reason: "stop",
        message: { content: "Hello there!", tool_calls: undefined },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
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

/** Build a POST request for /api/chat. */
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Mock config for an open competition. */
function mockOpenCompetition() {
  vi.doMock("@/lib/config", () => ({
    COMPETITION_START: new Date("2020-01-01T00:00:00Z"),
    COMPETITION_END: new Date("2099-01-01T00:00:00Z"),
    CHAT_COOLDOWN_MS: 3000,
  }));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure OPENAI_API_KEY is present so the route doesn't short-circuit with 500
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  // ── 401: no auth cookie ───────────────────────────────────────────────────

  it("returns 401 without a session cookie", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const client = { from: vi.fn(() => makeChain()) };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore(undefined) as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 1 }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── 401: invalid session token ────────────────────────────────────────────

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
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("invalid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 1 }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── 400: missing message ──────────────────────────────────────────────────

  it("returns 400 when message is missing", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    // Rate limit query returns no last message
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return noMsgChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ sessionHash: "abc", round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when message is an empty string", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return noMsgChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "", sessionHash: "abc", round: 1 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── 400: invalid round ────────────────────────────────────────────────────

  it("returns 400 when round is 0 (below valid range)", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return noMsgChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 0 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when round is 4 (above valid range)", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return noMsgChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 4 }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when round is missing from body", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );
    const noMsgChain = makeChain({ data: null, error: null });
    (noMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        return noMsgChain;
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc" }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── 429: rate limiting ────────────────────────────────────────────────────

  it("returns 429 when last message was sent within 3 seconds", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // Last message was 1 second ago (within 3s cooldown)
    const recentTimestamp = new Date(Date.now() - 1000).toISOString();
    const lastMsgChain = makeChain({
      data: { created_at: recentTimestamp },
      error: null,
    });
    (lastMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: { created_at: recentTimestamp }, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_chat_messages") return lastMsgChain;
        return makeChain();
      }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 1 }) as never);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.rateLimited).toBe(true);
    expect(body.waitTime).toBeGreaterThan(0);
  });

  it("does not rate limit when last message was sent more than 3 seconds ago", async () => {
    mockOpenCompetition();

    const { createServiceClient } = await import("@/lib/supabase/server");
    const user = { id: "user-1" };
    const userChain = makeChain({ data: user, error: null });
    (userChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: user, error: null }),
    );

    // Last message was 5 seconds ago (beyond 3s cooldown)
    const oldTimestamp = new Date(Date.now() - 5000).toISOString();
    const lastMsgChain = makeChain({
      data: { created_at: oldTimestamp },
      error: null,
    });
    (lastMsgChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: { created_at: oldTimestamp }, error: null }),
    );

    const noDataChain = makeChain({ data: null, error: null });
    (noDataChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_competition_users") return userChain;
        if (table === "may_chat_messages") return lastMsgChain;
        return noDataChain;
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(createServiceClient).mockResolvedValue(client as never);

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("valid-token") as never);

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(makeRequest({ message: "hi", sessionHash: "abc", round: 1 }) as never);

    // Should NOT be 429 — response will be 200 (SSE stream) or 500 (OpenAI mock)
    expect(res.status).not.toBe(429);
  });
});
