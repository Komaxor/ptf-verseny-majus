"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Truck, ShieldCheck, FileText, Lock } from "lucide-react"
import { WebshopHeader } from "@/components/webshop-header"
import { WebshopFooter } from "@/components/webshop-footer"

interface InfoPage {
  title: string
  icon: React.ReactNode
  sections: { heading: string; body: string }[]
}

const pages: Record<string, InfoPage> = {
  shipping: {
    title: "Szállítási információk",
    icon: <Truck className="w-5 h-5 text-blue-600" />,
    sections: [
      {
        heading: "Szállítási módok",
        body: "Csomagjainkat a GLS és a Magyar Posta kézbesíti. A szállítási idő általában 1-2 munkanap GLS futárszolgálattal, és 2-4 munkanap a Magyar Postával.",
      },
      {
        heading: "Szállítási költségek",
        body: "5 000 Ft feletti rendelés esetén a szállítás ingyenes. Ez alatt a GLS futárszolgálat díja 1 490 Ft, a postai kézbesítés díja 990 Ft.",
      },
      {
        heading: "Csomagkövetés",
        body: "A rendelés feladását követően e-mailben elküldjük a csomagkövetési számot, amellyel valós időben nyomon követheti csomagja útját.",
      },
      {
        heading: "Személyes átvétel",
        body: "Budapesti üzletünkben (1133 Budapest, Váci út 76.) lehetőség van személyes átvételre is, hétfőtől péntekig 9:00 és 17:00 között.",
      },
    ],
  },
  warranty: {
    title: "Garancia és visszaküldés",
    icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
    sections: [
      {
        heading: "Garanciális feltételek",
        body: "Minden termékünkre 3 év gyártói garanciát vállalunk. A garanciális igényeket a vásárlást igazoló számla bemutatásával lehet érvényesíteni.",
      },
      {
        heading: "Elállási jog",
        body: "A termék kézhezvételétől számított 14 napon belül indoklás nélkül elállhat a vásárlástól. A terméket eredeti, bontatlan csomagolásban kérjük visszaküldeni.",
      },
      {
        heading: "Visszaküldés menete",
        body: "Kérjük, vegye fel ügyfélszolgálatunkkal a kapcsolatot e-mailben (hello@promptverseny.hu) vagy telefonon (+36 1 234 5678). Munkatársunk segít a visszaküldési folyamatban.",
      },
      {
        heading: "Pénzvisszatérítés",
        body: "A visszaküldött termék beérkezését és ellenőrzését követően 5 munkanapon belül visszautaljuk a vételárat az eredeti fizetési módra.",
      },
    ],
  },
  terms: {
    title: "Általános Szerződési Feltételek",
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    sections: [
      {
        heading: "Általános rendelkezések",
        body: "Jelen ÁSZF a RAMtastic.hu webáruház (üzemeltető: RAMtastic Kft., székhely: 1133 Budapest, Váci út 76.) és a vásárló között létrejövő jogviszonyra vonatkozik.",
      },
      {
        heading: "Megrendelés folyamata",
        body: "A megrendelés a termék kosárba helyezésével, az adatok megadásával és a rendelés véglegesítésével jön létre. A rendelés visszaigazolását e-mailben küldjük.",
      },
      {
        heading: "Árak és fizetés",
        body: "Az árak bruttó árak, tartalmazzák az ÁFA-t. Fizetési módok: bankkártyás fizetés, banki átutalás, utánvét. Online fizetés esetén a tranzakciót a Stripe biztosítja.",
      },
      {
        heading: "Panaszkezelés",
        body: "Panaszait az hello@promptverseny.hu e-mail címen, vagy a +36 1 234 5678 telefonszámon jelezheti. Panaszát 30 napon belül kivizsgáljuk és írásban válaszolunk.",
      },
    ],
  },
  privacy: {
    title: "Adatvédelmi tájékoztató",
    icon: <Lock className="w-5 h-5 text-blue-600" />,
    sections: [
      {
        heading: "Adatkezelő",
        body: "Az adatkezelő a RAMtastic Kft. (1133 Budapest, Váci út 76.). Az adatvédelmi kérdésekkel kapcsolatban az hello@promptverseny.hu címen érhető el.",
      },
      {
        heading: "Kezelt adatok köre",
        body: "A rendelés teljesítéséhez szükséges személyes adatokat kezeljük: név, e-mail cím, szállítási cím, telefonszám. Az adatokat harmadik félnek nem adjuk ki a szállítási partneren kívül.",
      },
      {
        heading: "Adatkezelés célja és időtartama",
        body: "Az adatkezelés célja a megrendelés teljesítése és az ügyfélszolgálati kommunikáció. Az adatokat a számviteli törvény előírásai szerint 8 évig őrizzük meg.",
      },
      {
        heading: "Az Ön jogai",
        body: "Ön jogosult a személyes adataihoz való hozzáférésre, azok helyesbítésére, törlésére, valamint az adatkezelés korlátozásának kérésére. Jogait az hello@promptverseny.hu címen gyakorolhatja.",
      },
    ],
  },
}

export default function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const page = pages[slug]

  if (!page) {
    notFound()
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

        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              {page.icon}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
          </div>

          <div className="space-y-6">
            {page.sections.map((section, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-2">{section.heading}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <WebshopFooter />
    </div>
  )
}
