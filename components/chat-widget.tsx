"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Bot, Lightbulb, RotateCcw } from "lucide-react"
import { ChatInterface, type ChatInterfaceHandle } from "@/components/chat-interface"
import { Button } from "@/components/ui/button"
import { COMPETITION_START } from "@/lib/config"

interface ChallengeHint {
  time: number
  message: string
}

interface ChatWidgetProps {
  assistantName?: string
  welcomeMessage?: string
  hints?: ChallengeHint[]
}

export function ChatWidget({ assistantName, welcomeMessage, hints }: ChatWidgetProps) {
  const chatRef = useRef<ChatInterfaceHandle>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const [hintCountdown, setHintCountdown] = useState(0)
  const [currentHintIndex, setCurrentHintIndex] = useState(0)
  const seenHints = useRef<Set<string>>(new Set())

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

  const handleHintClick = async () => {
    const hintsArray = hints || []

    if (hintsArray.length === 0) {
      setHintMessage("Ehhez a kihíváshoz nincs elérhető tipp.")
      return
    }

    const elapsedSeconds = (Date.now() - COMPETITION_START.getTime()) / 1000
    const availableHints = hintsArray.filter((hint) => elapsedSeconds >= hint.time)

    if (availableHints.length === 0) {
      const remainingMinutes = Math.ceil((hintsArray[0].time - elapsedSeconds) / 60)
      setHintMessage(`Ez a tipp ${remainingMinutes} perc múlva lesz elérhető.`)
      return
    }

    const index = currentHintIndex % availableHints.length
    const hint = availableHints[index]
    const isNewHint = !seenHints.current.has(hint.message)
    setHintMessage(hint.message)
    setCurrentHintIndex((prev) => prev + 1)

    if (isNewHint) {
      seenHints.current.add(hint.message)
      try {
        const sessionHash = typeof window !== "undefined" ? localStorage.getItem("ptf_session_hash") || "" : ""
        await fetch("/api/hint-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionHash }),
        })
      } catch {
        // Silent fail
      }
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Megnyitás"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      <div className={`fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full h-full sm:w-[380px] sm:h-[560px] bg-card border-0 sm:border sm:border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isOpen ? "" : "hidden"}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
              R
            </div>
            <div>
              <div className="font-medium text-sm">{assistantName || "Ramóna"}</div>
              <div className="text-[11px] text-blue-100">RAMtastic.hu ügyfélszolgálat</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            title="Elrejtés"
            className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatInterface ref={chatRef} assistantName={assistantName} welcomeMessage={welcomeMessage} />
        </div>

        {/* Hint bar */}
        <div className="border-t border-border bg-card/50 px-4 py-2.5">
          {hintMessage && (
            <div className="mb-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md text-center">
              {hintMessage} <span className="text-amber-500/60">({hintCountdown})</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleHintClick}
              className="text-muted-foreground hover:text-blue-500 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              Tipp
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => chatRef.current?.clearContext()}
              disabled={chatRef.current?.isStreaming}
              className="text-muted-foreground hover:text-blue-500 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Kontextus törlése
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
