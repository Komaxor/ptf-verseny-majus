"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ShoppingCart, Star, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { products } from "@/lib/products"
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { WebshopHeader } from "@/components/webshop-header"
import { WebshopFooter } from "@/components/webshop-footer"

const brandColors: Record<string, string> = {
  Kingston: "from-red-500 to-red-700",
  Corsair: "from-yellow-500 to-yellow-700",
  "G.Skill": "from-purple-500 to-purple-700",
  Crucial: "from-teal-500 to-teal-700",
}

const badgeColors: Record<string, string> = {
  "Akciós": "bg-orange-500 text-white",
  "Újdonság": "bg-green-500 text-white",
  "Népszerű": "bg-blue-500 text-white",
}

function formatPrice(price: number) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft"
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const product = products.find((p) => p.id === id)
  const { addToCart } = useCart()

  if (!product) {
    notFound()
  }

  const handleAddToCart = () => {
    addToCart(product)
    toast("Kosárba helyezve!", { description: product.name })
  }

  const specs = [
    { label: "Típus", value: product.type },
    { label: "Kapacitás", value: product.capacity },
    { label: "Sebesség", value: product.speed },
    { label: "Márka", value: product.brand },
    { label: "Állapot", value: product.inStock ? "Raktáron" : "Nem elérhető" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WebshopHeader countdown="" />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Vissza a termékekhez
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product image area */}
          <div
            className={`relative rounded-xl bg-gradient-to-br ${brandColors[product.brand] || "from-gray-500 to-gray-700"} flex items-center justify-center aspect-square max-h-[300px] sm:max-h-[400px]`}
          >
            <div className="text-white/90 text-center px-6">
              <div className="text-4xl sm:text-6xl font-bold font-mono mb-2">{product.capacity}</div>
              <div className="text-lg opacity-80">
                {product.type} &bull; {product.speed}
              </div>
            </div>
            {product.badge && (
              <div
                className={`absolute top-4 left-4 text-sm font-bold px-3 py-1.5 rounded-full ${badgeColors[product.badge]}`}
              >
                {product.badge}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
            <h1 className="text-2xl font-bold text-foreground mb-3">{product.name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating} ({product.reviewCount} értékelés)
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground mb-6">{product.description}</p>

            <div className="flex items-center gap-2 text-sm text-green-600 mb-6">
              <Check className="w-4 h-4" />
              {product.inStock ? "Raktáron — 1-2 munkanapos kiszállítás" : "Jelenleg nem elérhető"}
            </div>

            <Button
              onClick={handleAddToCart}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Kosárba
            </Button>
          </div>
        </div>

        {/* Specs table */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground mb-4">Specifikációk</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            {specs.map((spec, i) => (
              <div
                key={spec.label}
                className={`flex ${i % 2 === 0 ? "bg-muted/50" : "bg-background"}`}
              >
                <div className="w-1/3 px-4 py-3 text-sm font-medium text-muted-foreground">
                  {spec.label}
                </div>
                <div className="w-2/3 px-4 py-3 text-sm text-foreground">{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <WebshopFooter />
    </div>
  )
}
