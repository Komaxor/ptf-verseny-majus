import { describe, it, expect } from "vitest";
import {
  loadRoundConfig,
  loadSystemPrompt,
  loadToolFile,
  extractWelcomeMessage,
  getToolFileName,
  verifyAnswer,
} from "@/lib/round-loader";

describe("loadRoundConfig", () => {
  it("loads round 1 config with correct structure", () => {
    const config = loadRoundConfig(1);
    expect(config).toMatchObject({
      round: 1,
      character: { name: "Igor" },
      answer: { type: "text", expected: "NUKE0531" },
    });
    expect(config.tools).toHaveLength(6);
    expect(config.hints).toHaveLength(3);
  });

  it("loads round 2 config with judge answer type", () => {
    const config = loadRoundConfig(2);
    expect(config.answer.type).toBe("judge");
    expect(config.answer.expected).toBeUndefined();
  });

  it("loads round 3 config with text answer", () => {
    const config = loadRoundConfig(3);
    expect(config.answer.type).toBe("text");
    expect(config.answer.case_sensitive).toBe(false);
  });

  it("throws for invalid round number", () => {
    expect(() => loadRoundConfig(0)).toThrow();
    expect(() => loadRoundConfig(4)).toThrow();
  });

  it("returns cached config on second call", () => {
    const a = loadRoundConfig(1);
    const b = loadRoundConfig(1);
    expect(a).toBe(b); // same reference = cached
  });
});

describe("loadSystemPrompt", () => {
  it("returns non-empty string for each round", () => {
    for (const round of [1, 2, 3]) {
      const prompt = loadSystemPrompt(round);
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
    }
  });
});

describe("extractWelcomeMessage", () => {
  it("extracts content between welcome markers", () => {
    const input = "preamble\n<!-- welcome -->\nHello there!\n<!-- /welcome -->\nrest";
    expect(extractWelcomeMessage(input)).toBe("Hello there!");
  });

  it("returns fallback when markers missing", () => {
    expect(extractWelcomeMessage("no markers here")).toBe("Üdvözlöm!");
  });

  it("works with real system prompts", () => {
    for (const round of [1, 2, 3]) {
      const prompt = loadSystemPrompt(round);
      const welcome = extractWelcomeMessage(prompt);
      expect(welcome.length).toBeGreaterThan(0);
    }
  });
});

describe("verifyAnswer", () => {
  it("accepts correct round 1 answer", () => {
    expect(verifyAnswer(1, "NUKE0531")).toBe(true);
  });

  it("accepts round 1 answer case-insensitively", () => {
    expect(verifyAnswer(1, "nuke0531")).toBe(true);
    expect(verifyAnswer(1, "NUKE0531")).toBe(true);
  });

  it("accepts round 1 answer with extra whitespace", () => {
    expect(verifyAnswer(1, "  NUKE0531  ")).toBe(true);
  });

  it("rejects wrong round 1 answer", () => {
    expect(verifyAnswer(1, "wrong")).toBe(false);
  });

  it("returns false for round 2 (judge type)", () => {
    expect(verifyAnswer(2, "anything")).toBe(false);
  });

  it("accepts correct round 3 answer (exact case)", () => {
    expect(verifyAnswer(3, "AZ52326")).toBe(true);
  });

  it("accepts round 3 answer case-insensitively", () => {
    expect(verifyAnswer(3, "az52326")).toBe(true);
    expect(verifyAnswer(3, "AZ52326")).toBe(true);
  });
});

describe("getToolFileName", () => {
  it("maps round 1 tools to filenames", () => {
    const name = getToolFileName(1, "check_shift_schedule");
    expect(name).toBeTruthy();
    // Returns the base name without extension (e.g. "shift-schedule")
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });

  it("throws for unknown tool", () => {
    expect(() => getToolFileName(1, "nonexistent_tool")).toThrow();
  });

  it("throws for invalid round", () => {
    expect(() => getToolFileName(99, "check_shift_schedule")).toThrow();
  });
});

describe("loadToolFile", () => {
  it("loads a tool file for each round", () => {
    for (const round of [1, 2, 3]) {
      const config = loadRoundConfig(round);
      const firstTool = config.tools[0];
      const fileName = getToolFileName(round, firstTool);
      const content = loadToolFile(round, fileName);
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(10);
    }
  });

  it("prevents directory traversal", () => {
    expect(() => loadToolFile(1, "../../etc/passwd")).toThrow();
  });
});
