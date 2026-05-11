import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kihívás lezárva - Májusi promptverseny",
  description: "A kihívás véget ért. Köszönjük a részvételt!",
  openGraph: {
    title: "Kihívás lezárva - Májusi promptverseny",
    description: "A kihívás véget ért. Köszönjük a részvételt!",
  },
}

export default function ClosedLayout({ children }: { children: React.ReactNode }) {
  return children
}
