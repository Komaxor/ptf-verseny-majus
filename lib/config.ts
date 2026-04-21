// Competition time window — edit these values to change the start time
const YEAR = 2026
const MONTH = 3   // 1-indexed (1 = January)
const DAY = 21
const HOUR = 14   // UTC (15:00 CET)
const MINUTE = 0

export const COMPETITION_START = new Date(Date.UTC(YEAR, MONTH - 1, DAY, HOUR, MINUTE))
export const COMPETITION_LENGTH_MINUTES = 60
export const COMPETITION_END = new Date(COMPETITION_START.getTime() + COMPETITION_LENGTH_MINUTES * 60_000)
