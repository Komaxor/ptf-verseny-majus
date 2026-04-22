"use client";

import { useState } from "react";
import { useGame } from "@/components/game/game-provider";
import { ANSWER_COOLDOWN_MS } from "@/lib/config";

interface AnswerEntryProps {
  round: number;
}

export function AnswerEntry({ round }: AnswerEntryProps) {
  const { submitAnswer, advancePhase } = useGame();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Round 2 uses judge, not text input
  if (round === 2) return null;

  const isCoolingDown = Date.now() < cooldownEnd;

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting || isCoolingDown) return;
    setIsSubmitting(true);
    setError("");

    const result = await submitAnswer(answer.trim());

    if (result.success) {
      await advancePhase();
    } else {
      setError(result.error || "Hibas valasz");
      setCooldownEnd(Date.now() + ANSWER_COOLDOWN_MS);
    }
    setIsSubmitting(false);
  };

  const placeholder = round === 1 ? "Emelet+Ajto (pl. 69+42A)" : "Privat kulcs";

  return (
    <div className="p-4 border-t border-white/10">
      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
        {round === 1 ? "Valaszod" : "Privat kulcs"}
      </label>
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          maxLength={100}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00ff88]/50"
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isCoolingDown || !answer.trim()}
          className="px-4 py-2 bg-[#00ff88] hover:bg-[#00ff88]/80 disabled:opacity-30 text-black text-sm font-medium rounded-lg transition-colors"
        >
          Bekuldes
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
