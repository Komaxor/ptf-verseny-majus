"use client"

import React, { useState } from "react"
import { Download, User, Pencil, ArrowRight } from "lucide-react"
import { jsPDF } from "jspdf"
import Image from "next/image"
import { PromptversenyFooter } from "@/components/promptverseny-footer"
import { PromptversenyEmailModal } from "@/components/promptverseny-email-modal"
import { LinkedInIcon } from "@/components/icons/linkedin-icon"
import MatrixBg from "@/components/matrix-bg"

export default function OklevelPage() {
  const [certName, setCertName] = useState("")
  const [certReady, setCertReady] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

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

    const nameY = img.height * 0.685
    ctx.font = `bold ${Math.round(img.width * 0.038)}px "Helvetica Neue", Arial, sans-serif`
    ctx.fillStyle = "#222222"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(name, img.width / 2, nameY)

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

      <main className="relative z-10 text-center max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center p-4 py-12">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6">
          <Image src="/promptverseny-logo.jpg" alt="Promptverseny logo" width={80} height={80} className="w-full h-full object-cover" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Oklevél letöltése
        </h1>
        <p className="text-base sm:text-lg text-white/60 mb-8">
          Köszönjük, hogy részt vettél az áprilisi promptversenyen!
        </p>

        {/* Certificate name entry + download */}
        <div className="w-full">
          {certReady ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-xl text-sm font-medium">
                <User className="w-4 h-4" />
                <span className="font-bold">{certName}</span>
                <button
                  onClick={() => setCertReady(false)}
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
          <button
            onClick={() => {
              const text = `Részt vettem a Promptverseny áprilisi kihívásán!\n\nHárom vállalati AI rendszer kellett kijátszanom. Nem kellett hozzá IT vagy programozói szaktudás, csak logikus gondolkodás, kreativitás és némi prompt engineering.\n\nA verseny rávilágított, hogy a legtöbb AI rendszer mennyire sebezhető, és hogy a mai világban elengedhetetlen az AI használat.\n\nKövesd a @promptverseny oldalt és tanulj meg promptolni!\n\nHa te is kipróbálnád magad, regisztrálj a májusi versenyre!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering #prompts`
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
              window.open(url, "_blank", "noopener,noreferrer")
            }}
            className="w-full flex items-center justify-center gap-2 border border-linkedin text-linkedin hover:bg-linkedin hover:text-white px-4 py-3 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linkedin focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <LinkedInIcon className="w-5 h-5" />
            Megosztás LinkedIn-en
          </button>
        </div>

        {/* Pre-registration CTA */}
        <div className="mt-8 bg-black/70 border border-brand/30 rounded-xl p-6 w-full">
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
          <button
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand/80 text-black font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4" />
          </button>
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
        source="oklevel_preregistration"
      />
    </div>
  )
}
