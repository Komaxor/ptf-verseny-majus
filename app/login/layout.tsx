import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bejelentkezés - Májusi promptverseny",
  description: "Jelentkezz be a kihívásba.",
  openGraph: {
    title: "Bejelentkezés - Májusi promptverseny",
    description: "Jelentkezz be a kihívásba.",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
