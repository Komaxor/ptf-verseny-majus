import { describe, it, expect, vi, beforeEach } from "vitest";

// chat-logger creates a Supabase client as a module-level singleton using
// createClient from @supabase/supabase-js. We mock that module so every
// call to createClient returns our controlled fake client.

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Helper: build a chainable Supabase query builder mock.
// Every builder method returns itself so chains work. The terminal
// resolution is done by awaiting `query` (the builder IS the promise via
// the special `then` property).
function makeChain(
  result: { data: unknown; error: unknown } = { data: null, error: null },
) {
  // We use an object whose methods all return `chain` so you can write
  // supabase.from(...).select(...).eq(...).limit(1) etc.
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
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

// Build a full Supabase client mock where each call to .from() can be
// configured to return a specific chain/result.
function makeClient(
  defaultResult: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const client = {
    from: vi.fn(() => makeChain(defaultResult)),
  };
  return client;
}

// ─── extractUserIp ───────────────────────────────────────────────────────────

describe("extractUserIp", () => {
  it("returns first IP from x-forwarded-for header", async () => {
    const { extractUserIp } = await import("@/lib/chat-logger");
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(extractUserIp(req)).toBe("1.2.3.4");
  });

  it("returns single IP from x-forwarded-for when no comma", async () => {
    const { extractUserIp } = await import("@/lib/chat-logger");
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(extractUserIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const { extractUserIp } = await import("@/lib/chat-logger");
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "192.168.1.1" },
    });
    expect(extractUserIp(req)).toBe("192.168.1.1");
  });

  it('returns "unknown" when no IP headers present', async () => {
    const { extractUserIp } = await import("@/lib/chat-logger");
    const req = new Request("http://localhost");
    expect(extractUserIp(req)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for values", async () => {
    const { extractUserIp } = await import("@/lib/chat-logger");
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" },
    });
    expect(extractUserIp(req)).toBe("1.2.3.4");
  });
});

// ─── getOrCreateChatSession ───────────────────────────────────────────────────

describe("getOrCreateChatSession", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns fallback when LOGGING_ENABLED is false", async () => {
    process.env.DISABLE_CHAT_LOGGING = "true";
    try {
      const { getOrCreateChatSession } = await import("@/lib/chat-logger");
      const result = await getOrCreateChatSession("hash123", 1, "1.2.3.4", "user1");
      expect(result).toEqual({
        sessionId: null,
        round: 1,
        sessionHash: "hash123",
        userId: "user1",
      });
    } finally {
      delete process.env.DISABLE_CHAT_LOGGING;
    }
  });

  it("returns fallback when sessionHash is empty", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    vi.mocked(createClient).mockReturnValue(makeClient() as never);
    const { getOrCreateChatSession } = await import("@/lib/chat-logger");
    const result = await getOrCreateChatSession("", 1, "1.2.3.4", "user1");
    expect(result.sessionId).toBeNull();
  });

  it("returns existing session when found", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    // The select query returns an existing row
    const existingChain = makeChain({ data: [{ id: "session-abc", message_count: 5 }], error: null });
    const client = { from: vi.fn(() => existingChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getOrCreateChatSession } = await import("@/lib/chat-logger");
    const result = await getOrCreateChatSession("hash123", 1, "1.2.3.4", "user1");

    expect(result.sessionId).toBe("session-abc");
    expect(result.round).toBe(1);
    expect(result.sessionHash).toBe("hash123");
    expect(result.userId).toBe("user1");
    expect(client.from).toHaveBeenCalledWith("may_chat_sessions");
  });

  it("creates new session when none exists", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    let callCount = 0;
    const client = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select finds nothing
          return makeChain({ data: [], error: null });
        }
        // Second call: insert returns new session
        const insertChain = makeChain({ data: { id: "new-session-id" }, error: null });
        // single() on insert chain should resolve to the same result
        (insertChain as Record<string, unknown>).single = vi.fn(() =>
          Promise.resolve({ data: { id: "new-session-id" }, error: null }),
        );
        return insertChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getOrCreateChatSession } = await import("@/lib/chat-logger");
    const result = await getOrCreateChatSession("hash456", 2, "1.2.3.4", "user2");

    expect(result.sessionId).toBe("new-session-id");
    expect(client.from).toHaveBeenCalledWith("may_chat_sessions");
  });

  it("handles select error gracefully and returns fallback", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const errorChain = makeChain({ data: null, error: { message: "DB error" } });
    const client = { from: vi.fn(() => errorChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getOrCreateChatSession } = await import("@/lib/chat-logger");
    const result = await getOrCreateChatSession("hash789", 1, "1.2.3.4", "user1");

    expect(result.sessionId).toBeNull();
    expect(result.sessionHash).toBe("hash789");
  });

  it("handles race condition (unique constraint violation) by fetching existing", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    let callCount = 0;
    const client = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // Select returns empty
          return makeChain({ data: [], error: null });
        }
        if (callCount === 2) {
          // Insert fails with unique constraint violation
          const conflictChain = makeChain({ data: null, error: { message: "duplicate", code: "23505" } });
          (conflictChain as Record<string, unknown>).single = vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "duplicate", code: "23505" } }),
          );
          return conflictChain;
        }
        // Retry select returns existing row
        return makeChain({ data: [{ id: "existing-after-race" }], error: null });
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getOrCreateChatSession } = await import("@/lib/chat-logger");
    const result = await getOrCreateChatSession("hashrace", 1, "1.2.3.4", "user1");

    expect(result.sessionId).toBe("existing-after-race");
  });
});

// ─── logChatMessage ───────────────────────────────────────────────────────────

describe("logChatMessage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns early when sessionId is null", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logChatMessage } = await import("@/lib/chat-logger");
    await logChatMessage(null, "user1", 1, "user", "hello");

    expect(client.from).not.toHaveBeenCalled();
  });

  it("inserts into may_chat_messages table", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const messagesChain = makeChain({ data: null, error: null });
    // For message_count fetch: single() needs to return a value
    const sessionFetchChain = makeChain({ data: { message_count: 3 }, error: null });
    (sessionFetchChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: { message_count: 3 }, error: null }),
    );
    const sessionUpdateChain = makeChain({ data: null, error: null });

    let callCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_chat_messages") {
          return messagesChain;
        }
        // may_chat_sessions calls: first fetch count, then update
        callCount++;
        return callCount === 1 ? sessionFetchChain : sessionUpdateChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logChatMessage } = await import("@/lib/chat-logger");
    await logChatMessage("session-1", "user1", 1, "assistant", "Hello!", 250, {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });

    expect(client.from).toHaveBeenCalledWith("may_chat_messages");
    expect(client.from).toHaveBeenCalledWith("may_chat_sessions");
  });

  it("handles message insert error gracefully", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const errorChain = makeChain({ data: null, error: { message: "insert failed" } });
    const client = { from: vi.fn(() => errorChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logChatMessage } = await import("@/lib/chat-logger");
    // Should not throw
    await expect(
      logChatMessage("session-1", "user1", 1, "user", "test"),
    ).resolves.toBeUndefined();
  });

  it("does nothing when DISABLE_CHAT_LOGGING=true", async () => {
    process.env.DISABLE_CHAT_LOGGING = "true";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = makeClient();
      vi.mocked(createClient).mockReturnValue(client as never);

      const { logChatMessage } = await import("@/lib/chat-logger");
      await logChatMessage("session-1", "user1", 1, "user", "hello");
      expect(client.from).not.toHaveBeenCalled();
    } finally {
      delete process.env.DISABLE_CHAT_LOGGING;
    }
  });
});

// ─── logToolCall ──────────────────────────────────────────────────────────────

describe("logToolCall", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("inserts into may_tool_calls table", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const chain = makeChain({ data: null, error: null });
    const client = { from: vi.fn(() => chain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logToolCall } = await import("@/lib/chat-logger");
    await logToolCall("session-1", "user1", 2, "search_files");

    expect(client.from).toHaveBeenCalledWith("may_tool_calls");
  });

  it("skips when sessionId is null", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logToolCall } = await import("@/lib/chat-logger");
    await logToolCall(null, "user1", 1, "some_tool");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles insert error gracefully", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const errorChain = makeChain({ data: null, error: { message: "error" } });
    const client = { from: vi.fn(() => errorChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logToolCall } = await import("@/lib/chat-logger");
    await expect(logToolCall("session-1", "user1", 1, "tool")).resolves.toBeUndefined();
  });
});

// ─── logContextClear ──────────────────────────────────────────────────────────

describe("logContextClear", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("inserts into may_context_clears table", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const chain = makeChain({ data: null, error: null });
    const client = { from: vi.fn(() => chain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logContextClear } = await import("@/lib/chat-logger");
    await logContextClear("user1", 3);

    expect(client.from).toHaveBeenCalledWith("may_context_clears");
  });

  it("handles error gracefully", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const errorChain = makeChain({ data: null, error: { message: "fail" } });
    const client = { from: vi.fn(() => errorChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { logContextClear } = await import("@/lib/chat-logger");
    await expect(logContextClear("user1", 1)).resolves.toBeUndefined();
  });

  it("does nothing when DISABLE_CHAT_LOGGING=true", async () => {
    process.env.DISABLE_CHAT_LOGGING = "true";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = makeClient();
      vi.mocked(createClient).mockReturnValue(client as never);

      const { logContextClear } = await import("@/lib/chat-logger");
      await logContextClear("user1", 1);
      expect(client.from).not.toHaveBeenCalled();
    } finally {
      delete process.env.DISABLE_CHAT_LOGGING;
    }
  });
});

// ─── getMessagesAfterLastClear ────────────────────────────────────────────────

describe("getMessagesAfterLastClear", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns [] when Supabase client is unavailable", async () => {
    // Remove env vars so client creation fails
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const { getMessagesAfterLastClear } = await import("@/lib/chat-logger");
      const result = await getMessagesAfterLastClear("user1", 1);
      expect(result).toEqual([]);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    }
  });

  it("returns messages from may_chat_messages when no prior clear", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const messages = [
      { id: "m1", role: "user", content: "hi", created_at: "2024-01-01T10:00:00Z" },
      { id: "m2", role: "assistant", content: "hello", created_at: "2024-01-01T10:01:00Z" },
    ];

    // may_context_clears .single() returns null (no prior clear)
    const clearChain = makeChain({ data: null, error: null });
    (clearChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    // may_chat_messages returns the messages list
    const messagesChain = makeChain({ data: messages, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_context_clears") return clearChain;
        return messagesChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getMessagesAfterLastClear } = await import("@/lib/chat-logger");
    const result = await getMessagesAfterLastClear("user1", 1);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
    expect(client.from).toHaveBeenCalledWith("may_context_clears");
    expect(client.from).toHaveBeenCalledWith("may_chat_messages");
  });

  it("filters messages after last clear timestamp", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const clearTime = "2024-01-01T10:05:00Z";
    const messagesAfterClear = [
      { id: "m3", role: "user", content: "after clear", created_at: "2024-01-01T10:06:00Z" },
    ];

    const clearChain = makeChain({ data: { cleared_at: clearTime }, error: null });
    (clearChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: { cleared_at: clearTime }, error: null }),
    );

    const messagesChain = makeChain({ data: messagesAfterClear, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_context_clears") return clearChain;
        return messagesChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getMessagesAfterLastClear } = await import("@/lib/chat-logger");
    const result = await getMessagesAfterLastClear("user1", 1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m3");
  });

  it("returns [] on messages fetch error", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const clearChain = makeChain({ data: null, error: null });
    (clearChain as Record<string, unknown>).single = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const errorChain = makeChain({ data: null, error: { message: "query error" } });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "may_context_clears") return clearChain;
        return errorChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { getMessagesAfterLastClear } = await import("@/lib/chat-logger");
    const result = await getMessagesAfterLastClear("user1", 1);
    expect(result).toEqual([]);
  });
});

// ─── markRoundComplete ────────────────────────────────────────────────────────

describe("markRoundComplete", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does nothing when DISABLE_CHAT_LOGGING=true", async () => {
    process.env.DISABLE_CHAT_LOGGING = "true";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = makeClient();
      vi.mocked(createClient).mockReturnValue(client as never);

      const { markRoundComplete } = await import("@/lib/chat-logger");
      await markRoundComplete("user1", 1, "somehash");
      expect(client.from).not.toHaveBeenCalled();
    } finally {
      delete process.env.DISABLE_CHAT_LOGGING;
    }
  });

  it("marks session complete when found and not yet completed", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const sessionData = {
      id: "session-1",
      started_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      message_count: 5,
      completed_at: null,
      completed: false,
    };

    // Select returns session
    const selectChain = makeChain({ data: [sessionData], error: null });
    // Update succeeds
    const updateChain = makeChain({ data: null, error: null });

    let callCount = 0;
    const client = {
      from: vi.fn(() => {
        callCount++;
        return callCount === 1 ? selectChain : updateChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");
    await markRoundComplete("user1", 1, "abc12345");

    expect(client.from).toHaveBeenCalledWith("may_chat_sessions");
  });

  it("skips update if session already completed", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const sessionData = {
      id: "session-1",
      started_at: new Date(Date.now() - 60000).toISOString(),
      message_count: 10,
      completed_at: "2024-01-01T10:00:00Z", // already completed
      completed: true,
    };

    const selectChain = makeChain({ data: [sessionData], error: null });
    let updateCalled = false;
    const client = {
      from: vi.fn(() => {
        if (updateCalled) throw new Error("update should not be called");
        return selectChain;
      }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");
    await markRoundComplete("user1", 1, "abc12345");

    // Only the select should have been called (once, to look up the session)
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("returns gracefully when session not found", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const emptyChain = makeChain({ data: [], error: null });
    const client = { from: vi.fn(() => emptyChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");
    await expect(markRoundComplete("user1", 1, "notfound")).resolves.toBeUndefined();
  });

  it("handles find error gracefully", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const errorChain = makeChain({ data: null, error: { message: "DB error" } });
    const client = { from: vi.fn(() => errorChain) };
    vi.mocked(createClient).mockReturnValue(client as never);

    const { markRoundComplete } = await import("@/lib/chat-logger");
    await expect(markRoundComplete("user1", 1, "hash")).resolves.toBeUndefined();
  });
});
