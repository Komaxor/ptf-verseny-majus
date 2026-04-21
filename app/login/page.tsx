"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Loader2, AlertTriangle, KeyRound, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/lib/translations"
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
        setError(result.error || t.login.invalidPassword)
      }
    } catch {
      setError(t.login.loginFailed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col">
      <MatrixBg />
      <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RAMtastic.hu</h1>
          <p className="text-sm text-gray-400">Magyarország kedvenc memóriaboltja</p>
        </div>

        {/* Login Card */}
        <div className="bg-black/70 border border-blue-500/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {t.login.title}
            </h2>
            <p className="text-sm text-gray-400">
              {t.login.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">{t.login.passwordLabel}</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={t.login.passwordPlaceholder}
                className="bg-black/50 border-blue-500/30 text-white font-mono text-center text-lg tracking-wider focus:border-blue-500"
                autoComplete="off"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.login.loggingIn}
                </>
              ) : (
                t.login.loginButton
              )}
            </Button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-500 mt-6">
          A jelszót a szervezőktől kaptad
        </p>
      </div>
    </div>
  )
}
