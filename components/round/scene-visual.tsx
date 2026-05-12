"use client";

import Image from "next/image";
import { CHARACTERS, type RoundKey } from "@/lib/characters";

interface SceneVisualProps {
  round: number;
}

export function SceneVisual({ round }: SceneVisualProps) {
  const character = CHARACTERS[round as RoundKey];
  return (
    <div className="flex-1 relative overflow-hidden bg-surface">
      <Image
        src={character.avatar}
        alt={character.sceneDescription}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}
