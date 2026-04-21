// Hungarian translations for the RAMtastic.hu competition
// This file centralizes all UI text for easy localization

export const t = {
  // Header
  header: {
    title: "RAMtastic.hu",
    subtitle: "Magyarország kedvenc memóriaboltja",
    loading: "Betöltés...",
    activeChallenge: "Aktív kihívás",
    newChallengeIn: "Új kihívás:",
    rotationSoon: "Hamarosan frissül...",
  },

  // Chat Interface
  chat: {
    aiHelpdesk: "(ügyfélszolgálat)",
    placeholder: "Kérdezz Ramónától...",
    errorMessage: "Hiba történt. Kérlek próbáld újra.",
    defaultWelcome: (name: string) => `Szia! ${name} vagyok, miben segíthetek?`,
  },

  // Passcode Entry
  passcode: {
    enterTitle: (type: string) => `${type} megadása`,
    submitHint: "Add meg a kinyert kuponkódot",
    hintButton: "Tipp",
    noHints: "Ehhez a kihíváshoz nincs elérhető tipp.",
    hintNotYet: (minutes: number) => `Ez a tipp ${minutes} perc múlva lesz elérhető.`,
    verifyButton: "Beküldés",
    defaultError: "Hibás kód! Próbáld újra.",
    rateLimitError: (seconds: number) => `Kérlek várj ${seconds} másodpercet a következő próbálkozás előtt.`,
    verificationFailed: "Ellenőrzés sikertelen. Próbáld újra.",
  },

  // Success Page
  success: {
    congratulations: "Gratulálunk!",
    challengeCompleted: "Sikeresen megszerezted a titkos kuponkódot!",
  },

  // Footer
  footer: {
    copyright: "© 2026 RAMtastic.hu — Minden jog fenntartva. (A weboldal AI által generált, teljesen fiktív, nem áll mögötte valódi cég vagy szervezet.)",
  },

  // Login Page
  login: {
    title: "Bejelentkezés",
    subtitle: "Add meg a kapott jelszavadat a versenyhez",
    passwordLabel: "Jelszó",
    passwordPlaceholder: "Add meg a jelszavad",
    loginButton: "Bejelentkezés",
    loggingIn: "Bejelentkezés...",
    invalidPassword: "Érvénytelen jelszó",
    loginFailed: "Bejelentkezés sikertelen. Próbáld újra.",
  },

  // Waiting Page
  waiting: {
    title: "RAMtastic.hu",
    subtitle: "A kihívás hamarosan kezdődik!",
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
      return `A kihívás ${month} ${day}${suffix} budapesti idő szerint ${startTime}-kor kezdődik és ${endTime}-ig tart.`
    },
  },

  // Closed Page
  closed: {
    title: "A kihívás véget ért",
    subtitle: "Köszönjük a részvételt!",
    resultsMessage: "Az eredmények hamarosan elérhetők lesznek.",
    thanksForParticipating: "Köszönjük, hogy részt vettél a RAMtastic.hu kihívásán!",
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
