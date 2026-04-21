"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, Trash2, Tag, Loader2, AlertTriangle, Truck, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/lib/cart-context"
import { WebshopHeader } from "@/components/webshop-header"
import { WebshopFooter } from "@/components/webshop-footer"
import { COMPETITION_END } from "@/lib/config"

const COOLDOWN_SECONDS = 5

function formatPrice(price: number) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft"
}

function getCompetitionCountdown(): string {
  const now = new Date().getTime()
  const end = COMPETITION_END.getTime()
  const diff = end - now
  if (diff <= 0) return "00:00"
  const minutes = Math.floor(diff / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function CartPage() {
  const router = useRouter()
  const { items, removeFromCart, updateQuantity, subtotal } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [countdown, setCountdown] = useState("")

  const getSessionHash = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ptf_session_hash") || ""
    }
    return ""
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  useEffect(() => {
    const update = () => setCountdown(getCompetitionCountdown())
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim() || isVerifying || cooldown > 0) return

    if (couponCode.trim().toUpperCase() === "TAVASZ10") {
      setCouponError("Ugye nem éred be ilyen minimális kedvezménnyel? 😏")
      setCooldown(COOLDOWN_SECONDS)
      return
    }

    setIsVerifying(true)
    setCouponError(null)

    try {
      const sessionHash = getSessionHash()
      const response = await fetch("/api/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: couponCode, sessionHash }),
      })

      const result = await response.json()

      if (result.success) {
        router.push("/success")
        return
      }

      if (result.rateLimited) {
        setCooldown(result.waitTime || COOLDOWN_SECONDS)
        setCouponError(`Kérlek várj ${result.waitTime || COOLDOWN_SECONDS} másodpercet a következő próbálkozás előtt.`)
      } else {
        setCooldown(COOLDOWN_SECONDS)
        setCouponError("Érvénytelen kuponkód. Próbáld újra!")
      }
    } catch {
      setCouponError("Hiba történt. Próbáld újra.")
      setCooldown(COOLDOWN_SECONDS)
    } finally {
      setIsVerifying(false)
    }
  }

  const isDisabled = isVerifying || cooldown > 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebshopHeader countdown={countdown} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Vissza a termékekhez
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-8">Kosár</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">A kosarad üres.</p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                Termékek böngészése
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-4 p-4 bg-card border border-border rounded-xl">
                  {/* Product color block */}
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <div className="text-white text-center">
                      <div className="text-sm font-bold font-mono">{item.product.capacity}</div>
                      <div className="text-[10px] opacity-80">{item.product.type}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{item.product.brand}</div>
                    <h3 className="text-sm font-medium text-foreground truncate">{item.product.name}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.product.speed}</div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatPrice(item.product.price * item.quantity)}</span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6 sticky top-24">
                <h2 className="text-lg font-bold text-foreground mb-4">Rendelés összesítő</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Részösszeg</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Szállítás</span>
                    <span className="font-medium text-green-600">Ingyenes</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold">Összesen</span>
                      <span className="font-bold text-lg">{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Coupon code entry */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Kuponkód</span>
                  </div>

                  <form onSubmit={handleApplyCoupon} className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.slice(0, 30))
                          if (couponError) setCouponError(null)
                        }}
                        placeholder="Add meg a kuponkódot"
                        maxLength={30}
                        className="flex-1 bg-muted border-border font-mono tracking-wider focus:border-blue-500"
                        autoComplete="off"
                        disabled={isDisabled}
                      />
                      <Button
                        type="submit"
                        disabled={isDisabled || !couponCode.trim()}
                        className="bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : cooldown > 0 ? (
                          `${cooldown}mp`
                        ) : (
                          "Alkalmaz"
                        )}
                      </Button>
                    </div>

                    {couponError && (
                      <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{couponError}</span>
                      </div>
                    )}
                  </form>
                </div>

                {/* Trust badges */}
                <div className="mt-6 pt-6 border-t border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Ingyenes szállítás 5 000 Ft felett</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>3 év garancia minden termékre</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <WebshopFooter />
    </div>
  )
}
