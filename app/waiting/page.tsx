"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import { SoundToggle } from "@/components/sound-toggle"
import Image from "next/image"
import { t } from "@/lib/translations"
import MatrixBg from "@/components/matrix-bg"
import { COMPETITION_START, COMPETITION_END } from "@/lib/config"

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeRemaining(): TimeRemaining {
  const now = new Date()
  const diff = COMPETITION_START.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

export default function WaitingPage() {
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (COMPETITION_START.getTime() <= Date.now()) {
      router.replace("/login")
      return
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)

      if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
        clearInterval(interval)
        router.replace("/login")
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [router])

  if (!mounted) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <MatrixBg />
      <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />
      <main className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden">
            <Image src="/promptverseny-logo.jpg" alt="Promptverseny logo" width={80} height={80} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          {t.waiting.title}
        </h1>
        <p className="text-base sm:text-xl text-brand/70 mb-12">
          {t.waiting.subtitle}
        </p>

        {/* Countdown */}
        <div className="mb-12">
          <p className="text-lg text-gray-400 mb-6 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            {t.waiting.startsIn}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
            <div className="bg-black/70 border border-brand/30 rounded-lg p-2 sm:p-4">
              <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-brand font-mono">
                {String(timeRemaining.days).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 uppercase mt-1">{t.waiting.days}</div>
            </div>
            <div className="bg-black/70 border border-brand/30 rounded-lg p-2 sm:p-4">
              <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-brand font-mono">
                {String(timeRemaining.hours).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 uppercase mt-1">{t.waiting.hours}</div>
            </div>
            <div className="bg-black/70 border border-brand/30 rounded-lg p-2 sm:p-4">
              <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-brand font-mono">
                {String(timeRemaining.minutes).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 uppercase mt-1">{t.waiting.minutes}</div>
            </div>
            <div className="bg-black/70 border border-brand/30 rounded-lg p-2 sm:p-4">
              <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-brand font-mono">
                {String(timeRemaining.seconds).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 uppercase mt-1">{t.waiting.seconds}</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-black/70 border border-brand/30 rounded-lg p-6 mb-8 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-2">
            {t.waiting.getReady}
          </h2>
          <p className="text-gray-400">
            {t.waiting.description(COMPETITION_START, COMPETITION_END)}
          </p>
        </div>

        {/* Refresh fallback when timer hits zero */}
        {timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0 && (
          <button
            onClick={() => window.location.href = "/login"}
            className="mb-8 px-6 py-3 bg-brand hover:bg-brand/80 text-black font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Belépés
          </button>
        )}

        <div className="flex items-center justify-center mb-4">
          <SoundToggle />
        </div>
        <p className="text-sm text-gray-400 text-center">Májusi promptverseny</p>
      </main>
    </div>
  )
}
