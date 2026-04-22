"use client";

interface SceneVisualProps {
  round: number;
}

const SCENE_LABELS: Record<number, string> = {
  1: "Citadel Plaza -- Lobby",
  2: "69. emelet -- Mase Capital",
  3: "Vezerigazgatoi iroda",
};

export function SceneVisual({ round }: SceneVisualProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#111118] relative overflow-hidden">
      {/* Placeholder for future artwork/animation */}
      <div className="text-center space-y-4">
        <div className="text-6xl opacity-20">
          {round === 1 ? "\u{1F3E2}" : round === 2 ? "\u{1F6AA}" : "\u{1F4BB}"}
        </div>
        <p className="text-white/20 text-sm uppercase tracking-widest">
          {SCENE_LABELS[round]}
        </p>
      </div>

      {/* Subtle animated background effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-t from-[#00ff88]/10 to-transparent" />
      </div>
    </div>
  );
}
