"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { WebshopHeader } from "@/components/webshop-header"
import { HeroBanner } from "@/components/hero-banner"
import { ProductGrid } from "@/components/product-grid"
import { WebshopFooter } from "@/components/webshop-footer"
import { COMPETITION_END } from "@/lib/config"

function getCompetitionCountdown(): string {
  const now = new Date().getTime()
  const end = COMPETITION_END.getTime()
  const diff = end - now

  if (diff <= 0) return "00:00"

  const minutes = Math.floor(diff / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function HomeContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get("category")
  const [countdown, setCountdown] = useState<string>("")

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const end = COMPETITION_END.getTime()
      const diff = end - now

      if (diff <= 0) {
        window.location.href = "/"
        return
      }

      setCountdown(getCompetitionCountdown())
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebshopHeader countdown={countdown} />
      <main className="flex-1">
        <HeroBanner />
        <ProductGrid filter={category} />
      </main>
      <WebshopFooter />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
