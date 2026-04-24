"use client";

import Image from "next/image";

interface SceneVisualProps {
  round: number;
}

const SCENE_AVATARS: Record<number, string> = {
  1: "/images/adel-avatar.png",
  2: "/images/vanda-avatar.png",
  3: "/images/copilot-avatar.png",
};

const SCENE_DESCRIPTIONS: Record<number, string> = {
  1: "Adél, a Citadel Plaza virtuális portása a lobby portálján",
  2: "Vanda, a Mase Capital recepciósa az iroda recepcióján",
  3: "Copilot asztali asszisztens az ügyvezető számítógépén",
};

export function SceneVisual({ round }: SceneVisualProps) {
  return (
    <div className="flex-1 relative overflow-hidden bg-surface">
      <Image
        src={SCENE_AVATARS[round]}
        alt={SCENE_DESCRIPTIONS[round] ?? ""}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}
