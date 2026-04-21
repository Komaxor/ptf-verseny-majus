import { products } from "@/lib/products"
import { ProductCard } from "./product-card"

interface ProductGridProps {
  filter?: string | null
}

const filterConfig: Record<string, { title: string; fn: (p: typeof products[number]) => boolean }> = {
  ddr5: { title: "DDR5 RAM", fn: (p) => p.type === "DDR5" },
  ddr4: { title: "DDR4 RAM", fn: (p) => p.type === "DDR4" },
  sales: { title: "Akciós termékek", fn: (p) => !!p.originalPrice },
}

export function ProductGrid({ filter }: ProductGridProps) {
  const config = filter ? filterConfig[filter] : null
  const filtered = config ? products.filter(config.fn) : products
  const title = config?.title ?? "Termékeink"

  return (
    <section id="products" className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{filtered.length} termék</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
