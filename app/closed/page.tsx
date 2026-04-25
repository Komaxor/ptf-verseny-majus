"use client"

import React, { useState, useEffect } from "react"
import { Trophy, Clock, MessageSquare, Lightbulb, XCircle, CheckCircle, XOctagon, ArrowRight, Download, User, Pencil } from "lucide-react"
import { jsPDF } from "jspdf"
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
  const [certName, setCertName] = useState("")
  const [certReady, setCertReady] = useState(false)

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

  const generateCertificate = async (name: string) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = "/oklevel-template.png"

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })

    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0)

    // Draw name centered in the gap between "áprilisi eseményén" and signatures
    const nameY = img.height * 0.685
    ctx.font = `bold ${Math.round(img.width * 0.038)}px "Helvetica Neue", Arial, sans-serif`
    ctx.fillStyle = "#222222"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(name, img.width / 2, nameY)

    // Draw underline
    const textWidth = ctx.measureText(name).width
    const lineWidth = Math.max(textWidth + 60, img.width * 0.35)
    const lineY = nameY + img.width * 0.028
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(img.width / 2 - lineWidth / 2, lineY)
    ctx.lineTo(img.width / 2 + lineWidth / 2, lineY)
    ctx.stroke()

    const imgData = canvas.toDataURL("image/png")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    doc.addImage(imgData, "PNG", 0, 0, 210, 297)
    doc.save(`oklevel-promptverseny-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`)
  }

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

            {/* Pre-registration CTA */}
            <div className="bg-black/70 border border-brand/30 rounded-xl p-6">
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
        ) : null}

        {/* Certificate */}
        <div className="mt-8 w-full">
          <h2 className="text-lg font-semibold text-white mb-3">Töltsd le az okleveled itt!</h2>
          {certReady ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-xl text-sm font-medium">
                <User className="w-4 h-4" />
                <span className="font-bold">{certName}</span>
                <button
                  onClick={() => { setCertReady(false) }}
                  className="ml-1 text-brand hover:text-brand/70 transition-colors cursor-pointer"
                  aria-label="Név szerkesztése"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => generateCertificate(certName)}
                className="w-full bg-brand hover:bg-brand/80 text-black font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Download className="w-4 h-4" />
                Oklevél letöltése
              </button>
            </div>
          ) : (
            <div className="bg-black/70 border border-brand/30 rounded-xl p-5">
              <label htmlFor="cert-name" className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-brand" />
                <span className="text-sm font-medium text-white">Add meg a neved az oklevélhez</span>
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (certName.trim()) setCertReady(true)
                }}
                className="flex gap-2"
              >
                <input
                  id="cert-name"
                  type="text"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value.slice(0, 50))}
                  placeholder="Teljes név"
                  maxLength={50}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!certName.trim()}
                  className="px-6 py-2 bg-brand hover:bg-brand/80 disabled:opacity-30 text-black font-medium rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Tovább
                </button>
              </form>
            </div>
          )}
        </div>

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

