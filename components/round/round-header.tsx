"use client";

import Image from "next/image";
import { CHARACTERS, type RoundKey } from "@/lib/characters";

interface RoundHeaderProps {
  round: number;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Első feladat",
  2: "Második feladat",
  3: "Harmadik feladat",
};

export function RoundHeader({ round }: RoundHeaderProps) {
  const character = CHARACTERS[round as RoundKey];
  const info = { name: character.name, role: character.role, avatar: character.crop };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
      <div className="w-12 h-12 md:w-10 md:h-10 rounded-full overflow-hidden bg-white/10 shrink-0 ring-1 ring-brand/20">
        <Image src={info.avatar} alt={info.name} width={48} height={48} className="object-cover w-full h-full" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base md:text-sm font-semibold text-white truncate">{info.name}</h3>
        </div>
        <p className="text-xs text-white/70 truncate">{info.role}</p>
      </div>
    </div>
  );
}
