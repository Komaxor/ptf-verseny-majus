export interface Product {
  id: string
  name: string
  brand: string
  type: "DDR4" | "DDR5"
  capacity: string
  speed: string
  price: number
  originalPrice?: number
  rating: number
  reviewCount: number
  inStock: boolean
  badge?: "Akciós" | "Újdonság" | "Népszerű"
  description: string
}

export const products: Product[] = [
  {
    id: "1",
    name: "Kingston Fury Beast DDR5 32GB 5600MHz",
    brand: "Kingston",
    type: "DDR5",
    capacity: "32GB",
    speed: "5600MHz",
    price: 24990,
    originalPrice: 29990,
    rating: 4.8,
    reviewCount: 142,
    inStock: true,
    badge: "Népszerű",
    description: "A Kingston FURY Beast DDR5 a játékosok és tartalomkészítők első számú választása. Az Intel XMP 3.0 támogatásnak köszönhetően egyetlen kattintással elérheted a maximális teljesítményt. Alacsony CAS késleltetés és megbízható hűtőborda a stabil működésért.",
  },
  {
    id: "2",
    name: "Corsair Vengeance DDR5 16GB 5200MHz",
    brand: "Corsair",
    type: "DDR5",
    capacity: "16GB",
    speed: "5200MHz",
    price: 14990,
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    badge: "Akciós",
    description: "A Corsair Vengeance DDR5 kiváló belépő a következő generációs memóriák világába. Kompakt, alacsony profilú kialakítása szinte bármilyen rendszerbe beépíthető. Tökéletes választás irodai és könnyű gaming felhasználásra.",
  },
  {
    id: "3",
    name: "G.Skill Trident Z5 RGB DDR5 64GB 6000MHz",
    brand: "G.Skill",
    type: "DDR5",
    capacity: "64GB (2x32GB)",
    speed: "6000MHz",
    price: 54990,
    rating: 4.9,
    reviewCount: 67,
    inStock: true,
    badge: "Újdonság",
    description: "A G.Skill Trident Z5 RGB a csúcskategóriás DDR5 memóriák zászlóshajója. 64GB kapacitással és 6000MHz sebességgel ideális videóvágáshoz, 3D rendereléshez és professzionális munkaterheléshez. RGB LED világítás a látványos megjelenésért.",
  },
  {
    id: "4",
    name: "Crucial DDR4 16GB 3200MHz",
    brand: "Crucial",
    type: "DDR4",
    capacity: "16GB",
    speed: "3200MHz",
    price: 11990,
    rating: 4.5,
    reviewCount: 213,
    inStock: true,
    description: "A Crucial DDR4 16GB megbízható és költséghatékony választás mindennapi használatra. A Micron saját gyártású chipjei garantálják a hosszú élettartamot. Élettartam garancia és széles kompatibilitás az összes főbb alaplappal.",
  },
  {
    id: "5",
    name: "Kingston Fury Beast DDR4 32GB 3600MHz",
    brand: "Kingston",
    type: "DDR4",
    capacity: "32GB (2x16GB)",
    speed: "3600MHz",
    price: 19990,
    originalPrice: 23990,
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    badge: "Akciós",
    description: "A Kingston FURY Beast DDR4 kit két 16GB-os modullal biztosítja a dual-channel teljesítményt. 3600MHz-es sebesség az AMD Ryzen és Intel platformokhoz optimalizálva. Masszív alumínium hűtőborda a hatékony hőelvezetésért.",
  },
  {
    id: "6",
    name: "Corsair Dominator Platinum DDR5 32GB 6200MHz",
    brand: "Corsair",
    type: "DDR5",
    capacity: "32GB (2x16GB)",
    speed: "6200MHz",
    price: 39990,
    rating: 4.8,
    reviewCount: 34,
    inStock: true,
    badge: "Újdonság",
    description: "A Corsair Dominator Platinum DDR5 a prémium kategória csúcsa. A szabadalmaztatott DHX hűtési technológia és a Corsair iCUE szoftver segítségével teljes kontroll a teljesítmény és a megvilágítás felett. Kézzel válogatott memóriachipek a maximális overclock potenciálért.",
  },
  {
    id: "7",
    name: "Crucial DDR4 8GB 2666MHz",
    brand: "Crucial",
    type: "DDR4",
    capacity: "8GB",
    speed: "2666MHz",
    price: 8990,
    rating: 4.3,
    reviewCount: 328,
    inStock: true,
    badge: "Népszerű",
    description: "A Crucial DDR4 8GB a legjobb ár-érték arányú memória az alapszintű rendszerekhez. Ideális irodai gépekhez, böngészéshez és könnyű multitaskinghoz. Plug-and-play telepítés, nincs szükség BIOS beállításra.",
  },
  {
    id: "8",
    name: "G.Skill Ripjaws V DDR4 16GB 3600MHz",
    brand: "G.Skill",
    type: "DDR4",
    capacity: "16GB (2x8GB)",
    speed: "3600MHz",
    price: 13490,
    rating: 4.6,
    reviewCount: 178,
    inStock: true,
    description: "A G.Skill Ripjaws V DDR4 kit két 8GB-os modullal kínál dual-channel teljesítményt kiváló áron. 3600MHz-es sebesség és CL18 időzítés a zökkenőmentes gaming élményért. Alacsony profilú dizájn, amely minden hűtővel kompatibilis.",
  },
]
