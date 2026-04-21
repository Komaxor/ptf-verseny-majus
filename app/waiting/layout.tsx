import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Várakozás - RAMtastic.hu",
  description: "A kihívás hamarosan kezdődik! Készülj fel!",
  openGraph: {
    title: "Várakozás - RAMtastic.hu",
    description: "A kihívás hamarosan kezdődik! Készülj fel!",
  },
}

export default function WaitingLayout({ children }: { children: React.ReactNode }) {
  return children
}
