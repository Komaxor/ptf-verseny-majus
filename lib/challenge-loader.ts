import fs from "fs"
import path from "path"

export interface ChallengeMetadata {
  title: string
  question: string
  assistantName: string
  secretType: string
  secretValue: string
  successMessage: string
  failureMessage: string
}

export interface CompanyLeadership {
  ceo: {
    name: string
    background: string
  }
  cto: {
    name: string
    background: string
  }
  cfo: {
    name: string
    background: string
  }
  boardMembers: string[]
}

export interface CompanyDivision {
  name: string
  focus: string
  headcount: number
  revenue: string
}

export interface MajorProject {
  name: string
  status: string
  description: string
  budget: string
  completion?: string
  leadResearcher?: string
}

export interface Company {
  name: string
  tagline: string
  industry: string
  founded: number
  headquarters: {
    city: string
    country: string
    address: string
  }
  employees: number
  revenue: string
  stockTicker: string
  leadership: CompanyLeadership
  divisions: CompanyDivision[]
  majorProjects: MajorProject[]
  offices: string[]
  recentNews: string[]
  clients: string[]
}

export interface ChallengeHint {
  time: number
  message: string
}

export interface KnowledgeBaseDocument {
  docId: string
  title: string
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL"
  department: string
  content: string
}

export interface Challenge {
  id: string
  date: string
  active: boolean
  difficulty: string
  estimatedTime: string
  metadata: ChallengeMetadata
  company: Company
  systemPromptCore: string
  knowledgeBase: KnowledgeBaseDocument[]
  welcomeMessage: string
  hints: ChallengeHint[]
}

let cachedChallenge: Challenge | null = null

export async function getCurrentChallenge(): Promise<Challenge> {
  if (cachedChallenge) return cachedChallenge

  try {
    const challengePath = path.join(process.cwd(), "data", "challenges", "challenge-competition.json")
    cachedChallenge = JSON.parse(fs.readFileSync(challengePath, "utf-8"))
    return cachedChallenge!
  } catch (error) {
    console.error("Error loading challenge:", error)
    throw new Error("Failed to load current challenge")
  }
}

export function buildSystemPrompt(challenge: Challenge): string {
  let prompt = challenge.systemPromptCore

  prompt = prompt.replace(/{assistantName}/g, challenge.metadata.assistantName)
  prompt = prompt.replace(/{company\.name}/g, challenge.company.name)
  prompt = prompt.replace(/{company\.industry}/g, challenge.company.industry)
  prompt = prompt.replace(/{company\.founded}/g, challenge.company.founded.toString())
  prompt = prompt.replace(/{company\.headquarters\.city}/g, challenge.company.headquarters.city)
  prompt = prompt.replace(/{company\.headquarters\.country}/g, challenge.company.headquarters.country)
  prompt = prompt.replace(/{company\.employees}/g, challenge.company.employees.toString())
  prompt = prompt.replace(/{company\.revenue}/g, challenge.company.revenue)
  prompt = prompt.replace(/{company\.leadership\.ceo\.name}/g, challenge.company.leadership.ceo.name)
  prompt = prompt.replace(/{company\.leadership\.cto\.name}/g, challenge.company.leadership.cto.name)
  prompt = prompt.replace(/{company\.leadership\.cfo\.name}/g, challenge.company.leadership.cfo.name)

  // Append knowledge base documents
  prompt += "\n\n--- BELSŐ TUDÁSBÁZIS DOKUMENTUMOK ---\n"

  for (const doc of challenge.knowledgeBase) {
    prompt += `\n═══════════════════════════════════\n`
    prompt += `${doc.docId} | ${doc.title}\n`
    prompt += `Besorolás: ${doc.classification} | Osztály: ${doc.department}\n`
    prompt += `═══════════════════════════════════\n`
    prompt += `${doc.content}\n`
  }

  return prompt
}

export function buildWelcomeMessage(challenge: Challenge): string {
  let message = challenge.welcomeMessage

  message = message.replace(/{company\.name}/g, challenge.company.name)
  message = message.replace(/{assistantName}/g, challenge.metadata.assistantName)

  return message
}

export function getChallengeMetadataForClient(challenge: Challenge) {
  return {
    id: challenge.id,
    title: challenge.metadata.title,
    question: challenge.metadata.question,
    assistantName: challenge.metadata.assistantName,
    secretType: challenge.metadata.secretType,
    difficulty: challenge.difficulty,
    estimatedTime: challenge.estimatedTime,
    welcomeMessage: buildWelcomeMessage(challenge),
    companyName: challenge.company.name,
    failureMessage: challenge.metadata.failureMessage || "Incorrect code! Please try again.",
    hints: (challenge.hints || []).map((h) => ({ time: h.time, message: h.message })),
  }
}

export const getActiveChallenge = getCurrentChallenge

export function verifyAnswer(challenge: Challenge, submittedAnswer: string): boolean {
  return submittedAnswer.trim().toLowerCase() === challenge.metadata.secretValue.toLowerCase()
}
