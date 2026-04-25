import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Oklevél - Áprilisi promptverseny",
  description: "Töltsd le az okleveled az áprilisi promptversenyről!",
  openGraph: {
    title: "Oklevél - Áprilisi promptverseny",
    description: "Töltsd le az okleveled az áprilisi promptversenyről!",
  },
}

export default function OklevelLayout({ children }: { children: React.ReactNode }) {
  return children
}
