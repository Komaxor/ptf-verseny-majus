import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bejelentkezés - Áprilisi promptverseny",
  description: "Jelentkezz be a kihívásba.",
  openGraph: {
    title: "Bejelentkezés - Áprilisi promptverseny",
    description: "Jelentkezz be a kihívásba.",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
