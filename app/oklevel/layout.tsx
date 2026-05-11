import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Oklevél - Májusi promptverseny",
  description: "Töltsd le az okleveled az májusi promptversenyről!",
  openGraph: {
    title: "Oklevél - Májusi promptverseny",
    description: "Töltsd le az okleveled az májusi promptversenyről!",
  },
}

export default function OklevelLayout({ children }: { children: React.ReactNode }) {
  return children
}
