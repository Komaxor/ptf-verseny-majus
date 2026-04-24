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
      <DialogContent className="sm:max-w-md bg-surface border-brand/20 text-white">
        {isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Check className="w-5 h-5 text-brand" />
                Sikeres regisztráció!
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Hamarosan küldünk egy emailt a részletekkel.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleClose}
                variant="brand"
                className="cursor-pointer"
              >
                Bezárás
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-brand" />
                Előregisztráció
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Add meg az email címed és értesítünk a következő versenyről.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:border-brand/50 focus-visible:ring-brand/50"
                  autoComplete="email"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (error) setError("")
                  }}
                  className="w-3.5 h-3.5 accent-brand cursor-pointer"
                />
                <span>
                  Elfogadom az{" "}
                  <a
                    href="/adatkezeles.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline hover:text-white"
                  >
                    adatkezelési tájékoztatót
                  </a>
                </span>
              </label>
              {error && (
                <div role="alert" className="flex items-center gap-2 text-red-400 text-sm">
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
                  className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isEmailValid || !termsAccepted}
                  variant="brand"
                  className="cursor-pointer disabled:cursor-not-allowed"
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
