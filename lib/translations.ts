// Hungarian translations for the Citadel Plaza heist competition
// This file centralizes all UI text for easy localization

export const t = {
  // Chat Interface
  chat: {
    aiHelpdesk: "(AI asszisztens)",
    placeholder: "Irj uzenetet...",
    errorMessage: "Hiba tortent. Kerlek probald ujra.",
    defaultWelcome: (name: string) => `Udvozlom! ${name} vagyok, miben segithetek?`,
  },

  // Round labels
  round: {
    label: (n: number) => `${n}. szoba`,
    round1: "1. szoba — Aula",
    round2: "2. szoba — Recepcio",
    round3: "3. szoba — Iroda",
    doorTry: "Ajto kiprobalasa",
    contextClear: "Kontextus torlese",
    contextCleared: "Kontextus torolve. Uj beszelgetes indult.",
    hintButton: "Tipp",
    noHints: "Nincs elerheto tipp ehhez a szobához.",
    hintNotYet: (minutes: number) => `Ez a tipp ${minutes} perc mulva lesz elerheto.`,
  },

  // Passcode / answer entry
  passcode: {
    enterTitle: (type: string) => `${type} megadasa`,
    submitHint: "Add meg a valaszt",
    verifyButton: "Bekuldés",
    defaultError: "Hibas valasz! Probald ujra.",
    rateLimitError: (seconds: number) => `Kerlek varj ${seconds} masodpercet a kovetkezo probalkozas elott.`,
    verificationFailed: "Ellenorzes sikertelen. Probald ujra.",
  },

  // Success / heist report
  success: {
    congratulations: "Gratulalunk!",
    heistComplete: "Sikeresen behatoltál a Citadel Plazába!",
    heistReport: "Betörési jelentés",
    totalTime: "Összes idő",
    round1Time: "1. szoba",
    round2Time: "2. szoba",
    round3Time: "3. szoba",
    messages: "Üzenetek",
    hints: "Tippek",
    attempts: "Próbálkozások",
  },

  // Login Page
  login: {
    title: "Prompt The Flag",
    subtitle: "Citadel Plaza — Add meg a kapott jelszavadat",
    passwordLabel: "Jelszó",
    passwordPlaceholder: "Add meg a jelszavad",
    loginButton: "Belépés",
    loggingIn: "Belépés...",
    invalidPassword: "Érvénytelen jelszó",
    loginFailed: "Bejelentkezés sikertelen. Próbáld újra.",
  },

  // Waiting Page
  waiting: {
    title: "Prompt The Flag",
    subtitle: "Citadel Plaza — A küldetés hamarosan kezdődik!",
    startsIn: "Kezdés:",
    days: "nap",
    hours: "óra",
    minutes: "perc",
    seconds: "mp",
    getReady: "Készülj fel!",
    description: (start: Date, end: Date) => {
      const fmt = new Intl.DateTimeFormat('hu-HU', {
        timeZone: 'Europe/Budapest',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const startParts = fmt.formatToParts(start)
      const endParts = fmt.formatToParts(end)
      const month = startParts.find(p => p.type === 'month')?.value
      const day = Number(startParts.find(p => p.type === 'day')?.value)
      const startTime = `${startParts.find(p => p.type === 'hour')?.value}:${startParts.find(p => p.type === 'minute')?.value}`
      const endTime = `${endParts.find(p => p.type === 'hour')?.value}:${endParts.find(p => p.type === 'minute')?.value}`
      const suffix = day === 1 ? '-jén' : [2, 3, 6, 8, 13, 16, 18, 20, 23, 26, 28, 30].includes(day) ? '-án' : '-én'
      return `A küldetés ${month} ${day}${suffix} budapesti idő szerint ${startTime}-kor kezdődik és ${endTime}-ig tart.`
    },
  },

  // Closed Page
  closed: {
    title: "A küldetés véget ért",
    subtitle: "Köszönjük a részvételt!",
    resultsMessage: "Az eredmények hamarosan elérhetők lesznek.",
    thanksForParticipating: "Köszönjük, hogy részt vettél a Citadel Plaza küldetésén!",
  },

  // Competition
  competition: {
    timeUp: "Lejárt az idő!",
    competitionEnded: "A verseny véget ért.",
  },
}

export function formatTimeHungarian(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} mp`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes} perc ${secs} mp`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours} óra ${minutes} perc`
  }
}

export function formatTimeAgoHungarian(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return `${diffSeconds} másodperce`
  } else if (diffMinutes < 60) {
    return `${diffMinutes} perce`
  } else if (diffHours < 24) {
    return `${diffHours} órája`
  } else {
    return `${diffDays} napja`
  }
}
