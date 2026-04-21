import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Siker - RAMtastic.hu",
  description: "Gratulálunk a kihívás teljesítéséhez!",
  openGraph: {
    title: "Siker - RAMtastic.hu",
    description: "Gratulálunk a kihívás teljesítéséhez!",
  },
}

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
