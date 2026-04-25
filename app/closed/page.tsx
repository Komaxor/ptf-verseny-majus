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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
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
        <div className="mt-8 w-full">
          <Button
            onClick={() => {
              const text = `Részt vettem a Promptverseny áprilisi kihívásán!\n\nHárom vállalati AI rendszer kellett kijátszanom. Nem kellett hozzá IT vagy programozói szaktudás, csak logikus gondolkodás, kreativitás és némi prompt engineering.\n\nA verseny rávilágított, hogy a legtöbb AI rendszer mennyire sebezhető, és hogy a mai világban elengedhetetlen az AI használat.\n\nKövesd a @promptverseny oldalt és tanulj meg promptolni!\n\nHa te is kipróbálnád magad, regisztrálj a májusi versenyre!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering #prompts`
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
        <div className="mt-10 bg-black/70 border border-brand/30 rounded-xl p-6 w-full">
          <h2 className="text-lg font-semibold text-white mb-2">
            Előregisztráció a következő versenyünkre
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            A májusi versenyen már több nyereményt fogunk kiosztani, a főnyereményen kívül egy{" "}
            <a
              href="https://craft-conf.com/2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              CraftHub Konferencia
            </a>{" "}
            jegy több, mint 150.000 Forint értékben!
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

        {/* B2B CTA */}
        <div className="mt-6 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-xl p-6 w-full text-left">
          <h2 className="text-lg font-semibold text-white mb-3">
            AI biztonság és képzés vállalatoknak
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Szeretnél biztonsági felmérést a céges AI rendszeretek kapcsán? Szeretnéd megtudni, hogy a csapatod mennyire profi AI felhasználó?
          </p>
          <p className="text-sm text-white/70 leading-relaxed mb-5">
            Segítünk, hogy a vállalkozásod sikeresen helyt tudjon állni az AI korszakában.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:hello@promptverseny.hu"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              hello@promptverseny.hu
            </a>
            <a
              href="tel:+36304775557"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +36 30 477 5557
            </a>
          </div>
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

