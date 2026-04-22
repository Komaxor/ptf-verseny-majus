import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Citadel Plaza -- Promptverseny",
  description:
    "Harom AI-karakter, harom szoba, egy kulcs. Hatold be a Citadel Plazat prompt engineering tudasoddal.",
  authors: [{ name: "Promptverseny" }],
  creator: "Promptverseny",
  publisher: "Promptverseny",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
  openGraph: {
    title: "Citadel Plaza -- Promptverseny",
    description: "Harom AI-karakter, harom szoba, egy kulcs. Prompt engineering verseny.",
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
  themeColor: "#0a0a0f",
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
      <body className={`font-sans antialiased bg-[#0a0a0f] text-white`}>
        {children}
        <Toaster position="bottom-left" />
      </body>
    </html>
  )
}
