"use client"

import Link from "next/link"
import { Star, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Product } from "@/lib/products"
import { useCart } from "@/lib/cart-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart(product)
    toast("Kosárba helyezve!", { description: product.name })
  }

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft"
  }

  const badgeColors: Record<string, string> = {
    "Akciós": "bg-orange-500 text-white",
    "Újdonság": "bg-green-500 text-white",
    "Népszerű": "bg-blue-500 text-white",
  }

  const brandColors: Record<string, string> = {
    Kingston: "from-red-500 to-red-700",
    Corsair: "from-yellow-500 to-yellow-700",
    "G.Skill": "from-purple-500 to-purple-700",
    Crucial: "from-teal-500 to-teal-700",
    TeamGroup: "from-indigo-500 to-indigo-700",
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/product/${product.id}`}>
        <div className={`relative h-40 bg-gradient-to-br ${brandColors[product.brand] || "from-gray-500 to-gray-700"} flex items-center justify-center`}>
          <div className="text-white/90 text-center px-4">
            <div className="text-3xl font-bold font-mono mb-1">{product.capacity}</div>
            <div className="text-sm opacity-80">{product.type} • {product.speed}</div>
          </div>
          {product.badge && (
            <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${badgeColors[product.badge]}`}>
              {product.badge}
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 sm:p-4">
        <div className="text-xs text-muted-foreground mb-1">{product.brand}</div>
        <Link href={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-2 min-h-[2.5rem] hover:underline">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= Math.round(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-base sm:text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Kosárba
        </Button>
      </div>
    </div>
  )
}
