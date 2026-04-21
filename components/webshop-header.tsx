"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingCart, Menu, Cpu, Clock, X } from "lucide-react"
import { useCart } from "@/lib/cart-context"

interface WebshopHeaderProps {
  countdown?: string
}

const navItems = [
  { label: "Termékek", href: "/#products", className: "text-foreground font-medium" },
  { label: "DDR5 RAM", href: "/?category=ddr5#products", className: "text-muted-foreground" },
  { label: "DDR4 RAM", href: "/?category=ddr4#products", className: "text-muted-foreground" },
  { label: "Akciók", href: "/?category=sales#products", className: "text-orange-600 font-medium" },
  { label: "Kapcsolat", href: "/contact", className: "text-muted-foreground" },
]

export function WebshopHeader({ countdown }: WebshopHeaderProps) {
  const { itemCount } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="border-b border-border bg-white sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground">RAMtastic.hu</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Magyarország kedvenc memóriaboltja</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {countdown && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-orange-600 bg-orange-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">A kedvezmény még ennyi ideig elérhető:</span>
                <span className="font-mono">{countdown}</span>
              </div>
            )}
            <Link
              href="/cart"
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors md:hidden cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 py-2 border-t border-border/50 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${item.className} hover:text-blue-600 transition-colors`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/50 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-2 py-2.5 rounded-lg text-sm ${item.className} hover:bg-muted transition-colors`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
