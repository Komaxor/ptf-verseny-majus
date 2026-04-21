"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, AlertTriangle, Loader2, Lightbulb } from "lucide-react"
import { t } from "@/lib/translations"
import { COMPETITION_START } from "@/lib/config"

interface ChallengeHint {
  time: number
  message: string
}

interface PasscodeEntryProps {
  secretType?: string
  failureMessage?: string
  hints?: ChallengeHint[]
}

const SECRET_LENGTH = 30
const COOLDOWN_SECONDS = 5

export function PasscodeEntry({ secretType, failureMessage, hints }: PasscodeEntryProps) {
  const router = useRouter()
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const [hintCountdown, setHintCountdown] = useState(0)
  const [currentHintIndex, setCurrentHintIndex] = useState(0)

  const getSessionHash = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ptf_session_hash") || ""
    }
    return ""
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  useEffect(() => {
    if (hintMessage) {
      setHintCountdown(9)
      const interval = setInterval(() => {
        setHintCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setHintMessage(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [hintMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim() || isLoading || cooldown > 0) return

    setIsLoading(true)
    setError(null)

    try {
      const sessionHash = getSessionHash()
      const response = await fetch("/api/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, sessionHash }),
      })

      const result = await response.json()

      if (result.success) {
        router.push("/success")
        return
      } else {
        if (result.rateLimited) {
          setCooldown(result.waitTime || COOLDOWN_SECONDS)
          setError(t.passcode.rateLimitError(result.waitTime || COOLDOWN_SECONDS))
        } else {
          setCooldown(COOLDOWN_SECONDS)
          setError(failureMessage || t.passcode.defaultError)
        }
      }
    } catch {
      setError(t.passcode.verificationFailed)
      setCooldown(COOLDOWN_SECONDS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleHintClick = async () => {
    const hintsArray = hints || []

    if (hintsArray.length === 0) {
      setHintMessage(t.passcode.noHints)
    } else {
      const elapsedSeconds = (Date.now() - COMPETITION_START.getTime()) / 1000

      // Find the next hint the user hasn't seen yet that is available
      const nextHint = hintsArray[currentHintIndex]
      if (!nextHint) {
        setHintMessage(t.passcode.noHints)
      } else if (elapsedSeconds < nextHint.time) {
        const remainingMinutes = Math.ceil((nextHint.time - elapsedSeconds) / 60)
        setHintMessage(t.passcode.hintNotYet(remainingMinutes))
      } else {
        setHintMessage(nextHint.message)
        setCurrentHintIndex((prevIndex) => Math.min(prevIndex + 1, hintsArray.length))
      }
    }

    // Log hint click to database (non-blocking)
    try {
      const sessionHash = getSessionHash()
      await fetch("/api/hint-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionHash }),
      })
    } catch {
      // Silent fail - not critical
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, SECRET_LENGTH)
    setPasscode(value)
    if (error) setError(null)
  }

  const displayType = secretType || "Kód"
  const isDisabled = isLoading || cooldown > 0

  return (
    <div className="border-t border-border bg-card/50 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-500" />
          <div>
            <h3 className="text-sm font-medium text-foreground">{t.passcode.enterTitle(displayType)}</h3>
            <p className="text-xs text-muted-foreground">{t.passcode.submitHint}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleHintClick}
          disabled={!!hintMessage}
          className="text-muted-foreground hover:text-blue-500 cursor-pointer disabled:cursor-not-allowed"
        >
          <Lightbulb className="w-4 h-4 mr-1" />
          {t.passcode.hintButton}
        </Button>
      </div>

      {hintMessage && (
        <div className="mb-3 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md text-center">
          {hintMessage} <span className="text-amber-500/60">({hintCountdown})</span>
        </div>
      )}

      {/* Passcode form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            value={passcode}
            onChange={handleInputChange}
            placeholder={`Add meg a ${displayType.toLowerCase()}t`}
            maxLength={SECRET_LENGTH}
            className="flex-1 bg-muted border-border font-mono tracking-wider focus:border-blue-500"
            autoComplete="off"
            disabled={isDisabled}
          />
          <Button
            type="submit"
            disabled={isDisabled || !passcode.trim()}
            className="bg-blue-600 hover:bg-blue-700 min-w-[80px] cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cooldown > 0 ? `${cooldown}mp` : t.passcode.verifyButton}
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  )
}
