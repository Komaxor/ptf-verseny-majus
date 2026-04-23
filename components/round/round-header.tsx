"use client";

import Image from "next/image";

interface RoundHeaderProps {
  round: number;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Első feladat",
  2: "Második feladat",
  3: "Harmadik feladat",
};

const CHARACTER_INFO: Record<number, { name: string; role: string; avatar: string }> = {
  1: { name: "Adél", role: "Citadel Plaza virtuális portás", avatar: "/images/adel-crop.png" },
  2: { name: "Vanda", role: "Mase Capital recepciós", avatar: "/images/vanda-crop.png" },
  3: { name: "Copilot", role: "Copilot asztali asszisztens", avatar: "/images/copilot-crop.png" },
};

export function RoundHeader({ round }: RoundHeaderProps) {
  const info = CHARACTER_INFO[round];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
        <Image src={info.avatar} alt={info.name} width={40} height={40} className="object-cover w-full h-full" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{info.name}</h3>
        </div>
        <p className="text-xs text-white/40">{info.role}</p>
      </div>
    </div>
  );
}
