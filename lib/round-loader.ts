import fs from "fs";
import path from "path";
import type { RoundConfig } from "./types";
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
  let prompt = fs.readFileSync(filePath, "utf-8");

  // Inject copilot-config.md if it exists for this round
  const configPath = path.join(CHALLENGES_DIR, `round-${round}`, "copilot-config.md");
  if (fs.existsSync(configPath)) {
    const copilotConfig = fs.readFileSync(configPath, "utf-8");
    // Insert after the welcome block, before the rest of the prompt
    const welcomeEnd = "<!-- /welcome -->";
    const insertIndex = prompt.indexOf(welcomeEnd);
    if (insertIndex !== -1) {
      const insertAt = insertIndex + welcomeEnd.length;
      prompt = prompt.slice(0, insertAt) + "\n\n" + copilotConfig + "\n" + prompt.slice(insertAt);
    } else {
      prompt = copilotConfig + "\n\n" + prompt;
    }
  }

  return prompt;
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

export const TOOL_FILE_MAP: Record<number, Record<string, string>> = {
  1: {
    check_shift_schedule: "shift-schedule",
    check_entry_log: "entry-log",
    check_radiation_readings: "radiation-readings",
    read_plant_directory: "plant-directory",
    read_passcode_policy: "passcode-policy",
    read_night_bulletin: "night-bulletin",
  },
  2: {
    read_personal_notes: "personal-notes",
    check_experiment_briefing: "experiment-briefing",
    search_staff_directory: "staff-directory",
    check_shift_handover: "shift-handover-log",
    read_maintenance_log: "maintenance-log",
    read_back_gate_policy: "back-gate-policy",
  },
  3: {
    check_instrument_readings: "instrument-readings",
    check_operations_log: "operations-log-tonight",
    search_procedures: "control-room-procedures",
    read_override_protocol: "manual-shutdown-protocol",
    check_engineer_orders: "senior-engineer-log",
    // read_file takes a filename parameter; not mapped statically here
  },
};

export function getToolFileName(round: number, toolName: string): string {
  const roundMap = TOOL_FILE_MAP[round];
  if (!roundMap || !roundMap[toolName]) {
    throw new Error(`Unknown tool: ${toolName} for round ${round}`);
  }
  return roundMap[toolName];
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
