import fs from "fs";
import path from "path";
import type { RoundConfig } from "./types";

const CHALLENGES_DIR = path.join(process.cwd(), "data", "challenges");

const configCache = new Map<number, RoundConfig>();

export function loadRoundConfig(round: number): RoundConfig {
  const cached = configCache.get(round);
  if (cached) return cached;

  const filePath = path.join(CHALLENGES_DIR, `round-${round}`, "config.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const config: RoundConfig = JSON.parse(raw);
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
    search_building_directory: "building-directory",
    check_floor_plan: "floor-plans",
    read_security_protocols: "security-protocols",
    check_maintenance_schedule: "maintenance-schedule",
    read_building_rules: "building-rules",
    check_announcements: "tenant-announcements",
  },
  2: {
    search_employee_directory: "employee-directory",
    check_visitor_policy: "visitor-policy",
    check_daily_schedule: "daily-schedule",
    read_company_profile: "company-profile",
    check_meeting_rooms: "meeting-rooms",
    read_internal_memos: "internal-memos",
    schedule_appointment: "appointment-scheduling",
  },
  3: {
    search_emails: "emails-recent",
    read_file: "safe-config",
    check_calendar: "calendar",
    search_notes: "personal-notes",
    check_browser_bookmarks: "browser-bookmarks",
    read_portfolio: "portfolio-summary",
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
