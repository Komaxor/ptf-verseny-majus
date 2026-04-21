"use client"

import { Zap, Truck, Shield } from "lucide-react"

export function HeroBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl">
          <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
            TAVASZI AKCIÓ
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            DDR5 RAM-ok akár 10% kedvezménnyel!
          </h2>
          <p className="text-blue-100 mb-6 text-base sm:text-lg">
            Használd a <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">TAVASZ10</span> kuponkódot a pénztárnál.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <Truck className="w-4 h-4" />
            <span>Ingyenes szállítás 5 000 Ft felett</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <Shield className="w-4 h-4" />
            <span>3 év garancia</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <Zap className="w-4 h-4" />
            <span>Házhozszállítás 1 munkanap alatt</span>
          </div>
        </div>
      </div>
    </div>
  )
}
