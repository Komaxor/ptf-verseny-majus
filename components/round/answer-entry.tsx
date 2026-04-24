"use client";

import { useState, useRef } from "react";
import { useGame } from "@/components/game/game-provider";
import { ANSWER_COOLDOWN_MS } from "@/lib/config";

interface AnswerEntryProps {
  round: number;
}

const ALPHANUMERIC = /^[a-zA-Z0-9]*$/;

export function AnswerEntry({ round }: AnswerEntryProps) {
  const { submitAnswer, advancePhase } = useGame();
  const [answer, setAnswer] = useState("");
  const [floor, setFloor] = useState("");
  const [door, setDoor] = useState("");
  const [error, setError] = useState("");
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const doorRef = useRef<HTMLInputElement>(null);

  // Round 2 uses judge, not text input
  if (round === 2) return null;

  const isCoolingDown = Date.now() < cooldownEnd;

  const isRound1Valid = floor.trim() !== "" && door.trim() !== "";
  const isRound3Valid = /^\d{4,8}$/.test(answer);
  const canSubmit = round === 1 ? isRound1Valid : isRound3Valid;

  const handleAlphanumericChange = (
    value: string,
    setter: (v: string) => void
  ) => {
    if (value.length <= 3 && ALPHANUMERIC.test(value)) {
      setter(value);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || isCoolingDown) return;
    setIsSubmitting(true);
    setError("");

    const submittedAnswer =
      round === 1 ? `${floor.trim()}+${door.trim()}` : answer.trim();

    const result = await submitAnswer(submittedAnswer);

    if (result.success) {
      await advancePhase();
    } else {
      setError(result.error || "Hibás válasz");
      setCooldownEnd(Date.now() + ANSWER_COOLDOWN_MS);
    }
    setIsSubmitting(false);
  };

  if (round === 1) {
    return (
      <div className="p-4 border-t border-white/10">
        <span id="round1-label" className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
          Válaszod
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <input
              id="round1-floor"
              aria-labelledby="round1-label"
              aria-label="Emelet"
              value={floor}
              onChange={(e) => handleAlphanumericChange(e.target.value, setFloor)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Emelet"
              maxLength={3}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-center placeholder-white/50 focus:border-[#00ff88]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            />
            <span aria-hidden="true" className="text-white/50 text-lg font-bold">+</span>
            <input
              ref={doorRef}
              id="round1-door"
              aria-label="Ajtó"
              value={door}
              onChange={(e) => handleAlphanumericChange(e.target.value, setDoor)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Ajtó"
              maxLength={3}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-center placeholder-white/50 focus:border-[#00ff88]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isCoolingDown || !canSubmit}
            className="px-4 py-2 bg-[#00ff88] hover:bg-[#00ff88]/80 disabled:opacity-30 text-black text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
          >
            Beküldés
          </button>
        </div>
        {error && <p role="alert" className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-white/10">
      <label htmlFor="round3-safe" className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
        Széfkód (4-8 számjegy)
      </label>
      <div className="flex gap-2">
        <input
          id="round3-safe"
          value={answer}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length <= 8) setAnswer(v);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="00000000"
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          className="w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-center font-mono tracking-[0.3em] placeholder-white/50 focus:border-[#00ff88]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isCoolingDown || !canSubmit}
          className="px-4 py-2 bg-[#00ff88] hover:bg-[#00ff88]/80 disabled:opacity-30 text-black text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        >
          Beküldés
        </button>
      </div>
      {error && <p role="alert" className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
