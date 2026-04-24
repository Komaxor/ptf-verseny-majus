"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Trophy, Clock, MessageSquare, Lightbulb, XCircle, CheckCircle, XOctagon, ArrowRight } from "lucide-react"
import Image from "next/image"
import { PromptversenyFooter } from "@/components/promptverseny-footer"
import { PromptversenyEmailModal } from "@/components/promptverseny-email-modal"
import { Button } from "@/components/ui/button"
import MatrixBg from "@/components/matrix-bg"
import { LinkedInIcon } from "@/components/icons/linkedin-icon"
import { MetricCard } from "@/components/ui/metric-card"

interface ClosedMetrics {
  isSolved: boolean
  completionTimeSeconds: number
  messageCount: number
  failedAttempts: number
  hintClicks: number
  totalTokens: number
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} mp`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes} perc ${secs} mp`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours} óra ${mins} perc`
}

export default function ClosedPage() {
  const [metrics, setMetrics] = useState<ClosedMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch("/api/closed-metrics")
        if (response.ok) {
          const data: ClosedMetrics = await response.json()
          setMetrics(data)
          return
        }

        const sessionHash = localStorage.getItem("ptf_session_hash")
        if (sessionHash) {
          const fallback = await fetch(`/api/solve-metrics?sessionHash=${encodeURIComponent(sessionHash)}`)
          if (fallback.ok) {
            const data = await fallback.json()
            setMetrics({
              isSolved: false,
              completionTimeSeconds: data.completionTimeSeconds || 0,
              messageCount: data.messageCount || 0,
              failedAttempts: data.failedAttempts || 0,
              hintClicks: data.hintClicks || 0,
              totalTokens: 0,
            })
          }
        }
      } catch (error) {
        console.error("Failed to load metrics:", error)
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [])

  return (
    <div className="relative min-h-screen bg-surface flex flex-col">
      <MatrixBg />
      <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />

      <main className="relative z-10 text-center max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden">
            <Image src="/promptverseny-logo.jpg" alt="Promptverseny logo" width={80} height={80} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Köszönjük, hogy részt vettél az áprilisi promptversenyen!
        </h1>

        {/* Trophy Icon -- only if solved */}
        {metrics?.isSolved && (
          <div className="mb-8">
            <Trophy className="w-20 h-20 text-brand mx-auto" />
          </div>
        )}

        {/* Metrics */}
        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-gray-400 animate-pulse">Statisztikák betöltése...</div>
        ) : metrics ? (
          <div className="space-y-6 w-full">
            {/* Solved status */}
            <div className="bg-black/70 border border-brand/30 rounded-xl p-5">
              <div className="flex items-center justify-center gap-3">
                {metrics.isSolved ? (
                  <>
                    <CheckCircle className="w-7 h-7 text-brand" />
                    <span className="text-xl font-semibold text-brand">Sikeres betörés!</span>
                  </>
                ) : (
                  <>
                    <XOctagon className="w-7 h-7 text-red-400" />
                    <span className="text-xl font-semibold text-red-400">Nem sikerült behatolni</span>
                  </>
                )}
              </div>
            </div>

            {/* Metric cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg mx-auto">
              <MetricCard
                tone="accent"
                icon={<Clock className="w-5 h-5 text-brand" />}
                label="Összes idő"
                value={metrics.isSolved && metrics.completionTimeSeconds > 0 ? formatDuration(metrics.completionTimeSeconds) : "--"}
              />
              <MetricCard
                tone="accent"
                icon={<MessageSquare className="w-5 h-5 text-brand/70" />}
                label="Üzenetek"
                value={`${metrics.messageCount} db`}
              />
              <MetricCard
                tone="accent"
                icon={<Lightbulb className="w-5 h-5 text-brand/70" />}
                label="Tippek"
                value={`${metrics.hintClicks} db`}
              />
              <MetricCard
                tone="accent"
                icon={<XCircle className="w-5 h-5 text-red-400" />}
                label="Hibás próbálkozások"
                value={`${metrics.failedAttempts} db`}
              />
            </div>
          </div>
        ) : (
          <div className="bg-black/70 border border-brand/30 rounded-xl p-6">
            <p className="text-gray-300">
              Ezen a böngészőn nincs aktív munkamenet. Ha részt vettél a versenyen, használd ugyanazt az eszközt és böngészőt, mint a verseny alatt.
            </p>
          </div>
        )}

        {/* LinkedIn Share */}
        <div className="mt-8 w-full max-w-lg mx-auto">
          <Button
            onClick={() => {
              const text = `Részt vettem a Promptverseny áprilisi kihívásán!\n\nHárom AI-karakterrel kellett kommunikálnom, hogy bejussak az épületbe. Prompt engineering tudás és kreatív gondolkodás kellett hozzá.\n\nHa te is kipróbálnád magad, kövesd a @promptverseny oldalt!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering`
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
              window.open(url, "_blank", "noopener,noreferrer")
            }}
            variant="brand-outline"
            className="w-full cursor-pointer"
          >
            <LinkedInIcon className="w-5 h-5" />
            Megosztás LinkedIn-en
          </Button>
        </div>

        {/* Pre-registration CTA */}
        <div className="mt-10 bg-black/70 border border-brand/30 rounded-xl p-6 w-full max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-white mb-2">
            Előregisztráció a következő versenyünkre
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Következő promptversenyről ne maradj le!
          </p>
          <Button
            onClick={() => setEmailModalOpen(true)}
            variant="brand"
            className="cursor-pointer"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </main>
      <div className="relative z-10">
        <PromptversenyFooter />
      </div>

      <PromptversenyEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        source="closed_preregistration"
      />
    </div>
  )
}

