"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Check, Clock, MessageSquare, Lightbulb, XCircle, Tag, PartyPopper, ArrowRight, User, Loader2, Download } from "lucide-react"
import { jsPDF } from "jspdf"
import { PromptversenyFooter } from "@/components/promptverseny-footer"
import { PromptversenyEmailModal } from "@/components/promptverseny-email-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SolveMetrics {
  firstMessageAt: string | null
  solvedAt: string | null
  messageCount: number
  completionTimeSeconds: number
  failedAttempts: number
  hintClicks: number
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

export default function SuccessPage() {
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [usernameSubmitting, setUsernameSubmitting] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const generateCertificate = async (name: string) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const w = 297
    const h = 210

    // Background
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, w, h, "F")

    // Decorative border
    doc.setDrawColor(37, 99, 235) // blue-600
    doc.setLineWidth(2)
    doc.rect(10, 10, w - 20, h - 20)
    doc.setLineWidth(0.5)
    doc.rect(14, 14, w - 28, h - 28)

    // Corner accents
    const cornerSize = 20
    doc.setLineWidth(2)
    const corners = [
      [14, 14, 14 + cornerSize, 14, 14, 14 + cornerSize],
      [w - 14, 14, w - 14 - cornerSize, 14, w - 14, 14 + cornerSize],
      [14, h - 14, 14 + cornerSize, h - 14, 14, h - 14 - cornerSize],
      [w - 14, h - 14, w - 14 - cornerSize, h - 14, w - 14, h - 14 - cornerSize],
    ]
    for (const [x1, y1, x2, y2, x3, y3] of corners) {
      doc.line(x2, y2, x1, y1)
      doc.line(x1, y1, x3, y3)
    }

    // Logo
    try {
      const response = await fetch("/promptverseny-logo.jpg")
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, "JPEG", w / 2 - 12, 28, 24, 24)
    } catch {
      // Skip logo if it fails to load
    }

    // Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(36)
    doc.setTextColor(37, 99, 235)
    doc.text("OKLEVÉL", w / 2, 70, { align: "center" })

    // Subtitle
    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text("Promptverseny — Márciusi kihívás", w / 2, 82, { align: "center" })

    // Decorative line
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.5)
    doc.line(w / 2 - 50, 88, w / 2 + 50, 88)

    // "Awarded to" text
    doc.setFontSize(12)
    doc.setTextColor(120, 120, 120)
    doc.text("Ezt az oklevelet kapta:", w / 2, 100, { align: "center" })

    // Name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(30, 30, 30)
    doc.text(name, w / 2, 115, { align: "center" })

    // Decorative line under name
    doc.setDrawColor(37, 99, 235)
    doc.line(w / 2 - 60, 120, w / 2 + 60, 120)

    // Achievement text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(13)
    doc.setTextColor(80, 80, 80)
    doc.text("A promptverseny márciusi kihívásának sikeres megoldásáért.", w / 2, 132, { align: "center" })
    doc.text("Sikeresen megtalálta a titkos kuponkódot prompt engineering tudásával.", w / 2, 140, { align: "center" })

    // Metrics if available
    if (metrics) {
      doc.setFontSize(10)
      doc.setTextColor(120, 120, 120)
      const metricsText = [
        metrics.completionTimeSeconds > 0 ? `Megoldási idó: ${formatDuration(metrics.completionTimeSeconds)}` : null,
        `Üzenetek: ${metrics.messageCount} db`,
        `Tippek: ${metrics.hintClicks} db`,
      ].filter(Boolean).join("  •  ")
      doc.text(metricsText, w / 2, 154, { align: "center" })
    }

    // Date
    doc.setFontSize(11)
    doc.setTextColor(120, 120, 120)
    const date = new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
    doc.text(`Budapest, ${date}`, w / 2, 170, { align: "center" })

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(160, 160, 160)
    doc.text("promptverseny.hu", w / 2, 190, { align: "center" })

    doc.save(`oklevel-promptverseny-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`)
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || usernameSubmitting) return

    setUsernameSubmitting(true)
    setUsernameError(null)

    try {
      const response = await fetch("/api/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      })

      const result = await response.json()

      if (result.success) {
        setUsernameSaved(true)
      } else {
        setUsernameError(result.error || "Hiba történt.")
      }
    } catch {
      setUsernameError("Hiba történt. Próbáld újra.")
    } finally {
      setUsernameSubmitting(false)
    }
  }

  useEffect(() => {
    async function loadMetrics() {
      try {
        const sessionHash = localStorage.getItem("ptf_session_hash")
        if (!sessionHash) {
          setLoading(false)
          return
        }

        const response = await fetch(`/api/solve-metrics?sessionHash=${encodeURIComponent(sessionHash)}`)
        if (response.ok) {
          const data: SolveMetrics = await response.json()
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="text-center max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/promptverseny-logo.jpg"
            alt="Promptverseny"
            width={80}
            height={80}
            className="rounded-2xl"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3">
          Gratulálunk!
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground mb-4">
          Sikeresen megszerezted a titkos kuponkódot!
        </p>

        {/* Coupon applied banner */}
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-5 py-2.5 rounded-full text-sm font-medium mb-10">
          <Tag className="w-4 h-4" />
          Kupon alkalmazva — 100% kedvezmény!
          <PartyPopper className="w-4 h-4" />
        </div>

        {/* Metrics */}
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Statisztikák betöltése...</div>
        ) : metrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg mx-auto">
            <MetricCard
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              label="Megoldási idő"
              value={metrics.completionTimeSeconds > 0 ? formatDuration(metrics.completionTimeSeconds) : "—"}
            />
            <MetricCard
              icon={<MessageSquare className="w-5 h-5 text-purple-500" />}
              label="Üzenetek"
              value={`${metrics.messageCount} db`}
            />
            <MetricCard
              icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
              label="Tippek"
              value={`${metrics.hintClicks} db`}
            />
            <MetricCard
              icon={<XCircle className="w-5 h-5 text-red-400" />}
              label="Hibás kódok"
              value={`${metrics.failedAttempts} db`}
            />
          </div>
        ) : null}

        {/* Username input */}
        <div className="mt-8 w-full max-w-lg mx-auto">
          {usernameSaved ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                <Check className="w-4 h-4" />
                Név mentve: <span className="font-bold">{username}</span>
              </div>
              <Button
                onClick={() => generateCertificate(username)}
                className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Oklevél letöltése
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-foreground">Add meg a teljes neved</span>
              </div>
              <form onSubmit={handleUsernameSubmit} className="flex gap-2">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.slice(0, 50))
                    if (usernameError) setUsernameError(null)
                  }}
                  placeholder="Teljes név"
                  maxLength={50}
                  className="flex-1 bg-muted border-border focus:border-blue-500"
                  autoComplete="off"
                  disabled={usernameSubmitting}
                />
                <Button
                  type="submit"
                  disabled={usernameSubmitting || !username.trim()}
                  className="bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed"
                >
                  {usernameSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Mentés"
                  )}
                </Button>
              </form>
              {usernameError && (
                <p className="text-destructive text-sm mt-2">{usernameError}</p>
              )}
            </div>
          )}
        </div>

        {/* LinkedIn Share */}
        <div className="mt-8 w-full max-w-lg mx-auto">
          <Button
            onClick={() => {
              const text = `Sikeresen megoldottam a promptverseny márciusi kihívását! 🏆\n\nEgy AI-alapú fejtörőben kellett megtalálnom a titkos kuponkódot – prompt engineering tudás és kreatív gondolkodás kellett hozzá.\n\nHa te is kipróbálnád magad, kövesd a @promptverseny oldalt, hogy ne maradj le a következő versenyről!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering`
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
              window.open(url, "_blank", "noopener,noreferrer")
            }}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            Megosztás LinkedIn-en
          </Button>
        </div>

        {/* Pre-registration CTA */}
        <div className="mt-10 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 shadow-sm w-full">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Előregisztráció a következő versenyünkre
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Spoiler: Még ennél is komolyabb lesz.
          </p>
          <Button
            onClick={() => setEmailModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 cursor-pointer"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </div>
      <PromptversenyFooter />

      <PromptversenyEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        source="post_completion"
      />
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
