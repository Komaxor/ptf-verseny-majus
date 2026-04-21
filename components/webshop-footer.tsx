import Link from "next/link"
import { Cpu, Mail, MapPin, Phone } from "lucide-react"

const infoLinks = [
  { label: "Szállítási információk", slug: "shipping" },
  { label: "Garancia és visszaküldés", slug: "warranty" },
  { label: "Általános Szerződési Feltételek", slug: "terms" },
  { label: "Adatvédelmi tájékoztató", slug: "privacy" },
]

export function WebshopFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">RAMtastic.hu</span>
            </div>
            <p className="text-sm text-gray-400">
              Magyarország kedvenc memóriaboltja. DDR4 és DDR5 RAM modulok széles választéka kedvező áron.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Elérhetőség</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <Link href="/contact" className="hover:text-white transition-colors">
                  hello@promptverseny.hu
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                +36 1 234 5678
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                1133 Budapest, Váci út 76.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Információk</h3>
            <ul className="space-y-2 text-sm">
              {infoLinks.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`/info/${link.slug}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          © 2026 RAMtastic.hu — Minden jog fenntartva. (A weboldal AI által generált, teljesen fiktív, nem áll mögötte valódi cég vagy szervezet.)
        </div>
      </div>
    </footer>
  )
}
