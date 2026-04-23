"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, X, Check, Mail } from "lucide-react"

interface PromptversenyEmailModalProps {
  open: boolean
  onClose: () => void
  source: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PromptversenyEmailModal({ open, onClose, source }: PromptversenyEmailModalProps) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Kérjük, add meg az email címed")
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Kérjük, adj meg egy érvényes email címet")
      return
    }

    if (!termsAccepted) {
      setError("Kérjük, fogadd el az adatkezelési tájékoztatót")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/subscribe-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          source,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.error || "Hiba történt. Kérjük, próbáld újra.")
      }
    } catch {
      setError("Hiba történt. Kérjük, próbáld újra.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setError("")
    setIsSuccess(false)
    setTermsAccepted(false)
    onClose()
  }

  const isEmailValid = email.trim() && EMAIL_REGEX.test(email.trim())

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        {isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Check className="w-5 h-5 text-green-500" />
                Sikeres regisztráció!
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Hamarosan küldünk egy emailt a részletekkel.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 cursor-pointer"
              >
                Bezárás
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-purple-400" />
                Előregisztráció
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Add meg az email címed és értesítünk a következő versenyről.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email cím
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError("")
                  }}
                  placeholder="példa@email.hu"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (error) setError("")
                  }}
                  className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"
                />
                <span>
                  Elfogadom az{" "}
                  <a
                    href="/adatkezeles.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-200"
                  >
                    adatkezelési tájékoztatót
                  </a>
                </span>
              </label>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <X className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isEmailValid || !termsAccepted}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Küldés...
                    </>
                  ) : (
                    "Regisztrálok!"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
