"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WebshopHeader } from "@/components/webshop-header"
import { WebshopFooter } from "@/components/webshop-footer"
import { toast } from "sonner"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    toast("Üzenet elküldve!", { description: "Hamarosan felvesszük Önnel a kapcsolatot." })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebshopHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Vissza a termékekhez
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-8">Kapcsolat</h1>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact info */}
          <div>
            <p className="text-muted-foreground mb-6">
              Kérdése van termékeinkkel vagy rendelésével kapcsolatban? Vegye fel velünk a kapcsolatot az alábbi
              elérhetőségek egyikén, vagy írjon nekünk az űrlapon keresztül.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">E-mail</p>
                  <p className="text-sm text-muted-foreground">hello@promptverseny.hu</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Telefon</p>
                  <p className="text-sm text-muted-foreground">+36 1 234 5678</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Cím</p>
                  <p className="text-sm text-muted-foreground">1133 Budapest, Váci út 76.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nyitvatartás</p>
                  <p className="text-sm text-muted-foreground">H-P: 9:00 – 17:00</p>
                  <p className="text-sm text-muted-foreground">Szo-V: Zárva</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-card border border-border rounded-xl p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Üzenet elküldve!</h3>
                <p className="text-sm text-muted-foreground">
                  Köszönjük megkeresését. Munkatársunk hamarosan felveszi Önnel a kapcsolatot.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-2">Írjon nekünk</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Név</label>
                  <Input placeholder="Teljes név" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
                  <Input type="email" placeholder="pelda@email.hu" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Tárgy</label>
                  <Input placeholder="Miben segíthetünk?" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Üzenet</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Írja le kérdését vagy megjegyzését..."
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                  <Send className="w-4 h-4 mr-2" />
                  Üzenet küldése
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <WebshopFooter />
    </div>
  )
}
