"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Trophy, Clock, MessageSquare, Lightbulb, XCircle, CheckCircle, XOctagon, ArrowRight, Shield } from "lucide-react"
import { PromptversenyFooter } from "@/components/promptverseny-footer"
import { PromptversenyEmailModal } from "@/components/promptverseny-email-modal"
import { Button } from "@/components/ui/button"
import MatrixBg from "@/components/matrix-bg"

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
    <div className="relative min-h-screen bg-[#0a0a0f] flex flex-col">
      <MatrixBg />
      <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-[#00ff88]/10 border-2 border-[#00ff88]/40 rounded-2xl flex items-center justify-center">
            <Shield className="w-10 h-10 text-[#00ff88]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Köszönjük, hogy részt vettél az áprilisi promptversenyen!
        </h1>

        {/* Trophy Icon -- only if solved */}
        {metrics?.isSolved && (
          <div className="mb-8">
            <Trophy className="w-20 h-20 text-[#00ff88] mx-auto" />
          </div>
        )}

        {/* Metrics */}
        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Statisztikák betöltése...</div>
        ) : metrics ? (
          <div className="space-y-6 w-full">
            {/* Solved status */}
            <div className="bg-black/70 border border-[#00ff88]/30 rounded-xl p-5">
              <div className="flex items-center justify-center gap-3">
                {metrics.isSolved ? (
                  <>
                    <CheckCircle className="w-7 h-7 text-[#00ff88]" />
                    <span className="text-xl font-semibold text-[#00ff88]">Sikeres betörés!</span>
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
                icon={<Clock className="w-5 h-5 text-[#00ff88]" />}
                label="Összes idő"
                value={metrics.isSolved && metrics.completionTimeSeconds > 0 ? formatDuration(metrics.completionTimeSeconds) : "--"}
              />
              <MetricCard
                icon={<MessageSquare className="w-5 h-5 text-[#00ff88]/70" />}
                label="Üzenetek"
                value={`${metrics.messageCount} db`}
              />
              <MetricCard
                icon={<Lightbulb className="w-5 h-5 text-[#00ff88]/70" />}
                label="Tippek"
                value={`${metrics.hintClicks} db`}
              />
              <MetricCard
                icon={<XCircle className="w-5 h-5 text-red-400" />}
                label="Hibás próbálkozások"
                value={`${metrics.failedAttempts} db`}
              />
            </div>
          </div>
        ) : (
          <div className="bg-black/70 border border-[#00ff88]/30 rounded-xl p-6">
            <p className="text-gray-400">
              Nem találtunk statisztikát ehhez a munkamenethez.
            </p>
          </div>
        )}

        {/* LinkedIn Share */}
        <div className="mt-8 w-full max-w-lg mx-auto">
          <Button
            onClick={() => {
              const text = `Részt vettem a Prompt The Flag áprilisi kihíváson!\n\nHárom AI-karakterrel kellett kommunikálnom, hogy bejussak az épületbe. Prompt engineering tudás és kreatív gondolkodás kellett hozzá.\n\nHa te is kipróbálnád magad, kövesd a @promptverseny oldalt!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering`
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
              window.open(url, "_blank", "noopener,noreferrer")
            }}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/10 hover:text-[#00ff88] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            Megosztás LinkedIn-en
          </Button>
        </div>

        {/* Pre-registration CTA */}
        <div className="mt-10 bg-black/70 border border-[#00ff88]/30 rounded-xl p-6 w-full max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-white mb-2">
            Előregisztráció a következő versenyünkre
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Következő promptversenyről ne maradj le!
          </p>
          <Button
            onClick={() => setEmailModalOpen(true)}
            className="bg-[#00ff88] hover:bg-[#00ff88]/80 text-black font-semibold cursor-pointer"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </div>
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

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-black/70 border border-[#00ff88]/20 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
