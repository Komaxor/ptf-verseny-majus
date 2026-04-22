import { vi } from "vitest";

// Set required env vars for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.OPENAI_API_KEY = "test-openai-key";

// Mock Supabase server client globally
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient()),
}));

// Helper to create a chainable Supabase mock
export function mockSupabaseClient() {
  const chain: any = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "order", "limit", "single", "maybeSingle", "rpc"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal methods return data by default
  chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.then = undefined; // Prevent auto-resolution
  return chain;
}
