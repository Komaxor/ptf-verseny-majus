import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import { ClientProviders } from "@/components/client-providers"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RAMtastic.hu — Magyarország kedvenc memóriaboltja",
  description:
    "DDR4 és DDR5 RAM memóriák széles választéka. Kingston, Corsair, G.Skill, Crucial — 3 év garancia, gyors szállítás!",
  keywords: [
    "RAM",
    "memória",
    "DDR4",
    "DDR5",
    "Kingston",
    "Corsair",
    "G.Skill",
    "Crucial",
    "számítógép memória",
    "RAM vásárlás",
    "webáruház",
  ],
  authors: [{ name: "RAMtastic.hu" }],
  creator: "RAMtastic.hu",
  publisher: "RAMtastic.hu",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
  openGraph: {
    title: "RAMtastic.hu — Magyarország kedvenc memóriaboltja",
    description: "DDR4 és DDR5 RAM memóriák széles választéka. Kingston, Corsair, G.Skill, Crucial.",
    type: "website",
    locale: "hu_HU",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hu">
      <head>
        <link rel="preconnect" href="https://api.openai.com" />
      </head>
      <body className={`font-sans antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster position="bottom-left" />
      </body>
    </html>
  )
}
