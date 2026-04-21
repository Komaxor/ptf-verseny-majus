"use client"

import { useState, useEffect } from "react"
import { CartProvider } from "@/lib/cart-context"
import { ChatWidget } from "@/components/chat-widget"
import { usePathname } from "next/navigation"

interface ChallengeHint {
  time: number
  message: string
}

interface ChallengeMetadata {
  assistantName: string
  welcomeMessage: string
  hints: ChallengeHint[]
}

const CHAT_PAGES = ["/", "/product", "/cart"]

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [challengeData, setChallengeData] = useState<ChallengeMetadata | null>(null)

  const showChat = CHAT_PAGES.some((p) => pathname === p || pathname.startsWith("/product/"))

  useEffect(() => {
    async function loadChallenge() {
      try {
        const response = await fetch("/api/challenge")
        if (response.ok) {
          const data = await response.json()
          setChallengeData(data)
        }
      } catch {
        // Silent fail
      }
    }
    loadChallenge()
  }, [])

  return (
    <CartProvider>
      {children}
      {showChat && (
        <ChatWidget
          assistantName={challengeData?.assistantName}
          welcomeMessage={challengeData?.welcomeMessage}
          hints={challengeData?.hints}
        />
      )}
    </CartProvider>
  )
}
