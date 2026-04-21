import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bejelentkezés - RAMtastic.hu",
  description: "Jelentkezz be a kihívásba.",
  openGraph: {
    title: "Bejelentkezés - RAMtastic.hu",
    description: "Jelentkezz be a kihívásba.",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
