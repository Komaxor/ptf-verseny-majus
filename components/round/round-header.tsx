"use client";

import { Bot } from "lucide-react";

interface RoundHeaderProps {
  round: number;
}

const CHARACTER_INFO: Record<number, { name: string; role: string }> = {
  1: { name: "Adel", role: "Citadel Plaza AI biztonsagi rendszer" },
  2: { name: "Vanda", role: "Mase Capital recepcis" },
  3: { name: "Copilot", role: "Microsoft Copilot" },
};

export function RoundHeader({ round }: RoundHeaderProps) {
  const info = CHARACTER_INFO[round];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
      <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
        <Bot className="w-5 h-5 text-[#00ff88]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{info.name}</h3>
        <p className="text-xs text-white/40">{info.role}</p>
      </div>
    </div>
  );
}
