"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Loader2, AlertTriangle, KeyRound } from "lucide-react"
import Image from "next/image"
import { COMPETITION_END } from "@/lib/config"
import MatrixBg from "@/components/matrix-bg"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const now = new Date()
    if (now > COMPETITION_END) {
      window.location.href = "/closed"
      return
    }
    const ms = COMPETITION_END.getTime() - now.getTime()
    const timer = setTimeout(() => {
      window.location.href = "/closed"
    }, ms)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      })

      const result = await response.json()

      if (result.success) {
        window.location.href = "/"
        return
      } else {
        setError(result.error || "Érvénytelen kód")
      }
    } catch {
      setError("Bejelentkezés sikertelen. Próbáld újra.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col">
      <MatrixBg />
      <div className="absolute inset-0 bg-surface/80 z-[1] pointer-events-none" />
      <main className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4">
            <Image src="/promptverseny-logo.jpg" alt="Promptverseny logo" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Áprilisi promptverseny</h1>
          <p className="text-sm text-white/70">Promptverseny - Április 2026</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface/90 border border-brand/20 rounded-xl p-6 shadow-lg backdrop-blur-sm w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-brand" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Bejelentkezés
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-white/60">
                Meghívókód
              </label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "")
                  setPassword(filtered)
                  if (error) setError(null)
                }}
                maxLength={12}
                placeholder="Add meg a kódod"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-center text-lg tracking-wider placeholder-white/50 focus:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-md">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full bg-brand hover:bg-brand/80 text-black font-medium py-3 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bejelentkezés...
                </span>
              ) : (
                "Belépés"
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-white/60 mt-6">
          A kódot a szervezők küldték emailen. Nem kaptál belépő kódot? Hívd a +36 30 477 5557 telefonszámot és Márk ad neked.
        </p>
      </main>
    </div>
  )
}
