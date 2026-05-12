import fs from "fs";
import path from "path";
import type { RoundConfig, RoundTool } from "./types";
import { CHARACTERS, type RoundKey } from "./characters";

const CHALLENGES_DIR = path.join(process.cwd(), "data", "challenges");

const configCache = new Map<number, RoundConfig>();

export function loadRoundConfig(round: number): RoundConfig {
  const cached = configCache.get(round);
  if (cached) return cached;

  const filePath = path.join(CHALLENGES_DIR, `round-${round}`, "config.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Omit<RoundConfig, "character">;
  const character = CHARACTERS[round as RoundKey];
  const config: RoundConfig = {
    ...parsed,
    character: { name: character.name, role: character.role, avatar: character.avatar },
  };
  configCache.set(round, config);
  return config;
}

export function loadSystemPrompt(round: number): string {
  const filePath = path.join(CHALLENGES_DIR, `round-${round}`, "system-prompt.md");
  return fs.readFileSync(filePath, "utf-8");
}

export function loadToolFile(round: number, filename: string): string {
  const safeName = path.basename(filename);
  const filePath = path.join(CHALLENGES_DIR, `round-${round}`, `${safeName}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${safeName}.md`);
  }

  return fs.readFileSync(filePath, "utf-8");
}

export function extractWelcomeMessage(systemPromptContent: string): string {
  const marker = "<!-- welcome -->";
  const endMarker = "<!-- /welcome -->";
  const start = systemPromptContent.indexOf(marker);
  const end = systemPromptContent.indexOf(endMarker);

  if (start === -1 || end === -1) {
    return "Üdvözlöm!";
  }

  return systemPromptContent
    .slice(start + marker.length, end)
    .trim();
}

/** Look up a tool entry on a round. Throws if the tool isn't defined for that round. */
export function getRoundTool(round: number, toolName: string): RoundTool {
  const config = loadRoundConfig(round);
  const tool = config.tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName} for round ${round}`);
  }
  return tool;
}

/** Resolve a tool's support-doc filename (without `.md`). Throws for tools without a static file mapping. */
export function getToolFileName(round: number, toolName: string): string {
  const tool = getRoundTool(round, toolName);
  if (!tool.file) {
    throw new Error(`Tool ${toolName} for round ${round} has no static file mapping (parameterised?)`);
  }
  return tool.file;
}

export function verifyAnswer(round: number, submittedAnswer: string): boolean {
  const config = loadRoundConfig(round);
  if (config.answer.type !== "text" || !config.answer.expected) return false;

  let expected = config.answer.expected;
  let submitted = submittedAnswer;

  if (config.answer.normalize_whitespace) {
    expected = expected.trim();
    submitted = submitted.trim();
  }

  if (!config.answer.case_sensitive) {
    expected = expected.toLowerCase();
    submitted = submitted.toLowerCase();
  }

  return submitted === expected;
}
