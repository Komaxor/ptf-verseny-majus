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

export function SceneVisual({ round }: SceneVisualProps) {
  return (
    <div className="flex-1 relative overflow-hidden bg-[#0a0a0f]">
      <Image
        src={SCENE_AVATARS[round]}
        alt=""
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}
