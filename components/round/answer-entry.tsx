"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/components/game/game-provider";
import { ANSWER_COOLDOWN_MS } from "@/lib/config";

interface AnswerEntryProps {
  round: number;
}

const ALPHANUMERIC_RE = /^[a-zA-Z0-9]*$/;
const MAX_ANSWER_LENGTH = 20;

export function AnswerEntry({ round }: AnswerEntryProps) {
  const { submitAnswer, advancePhase, setChatMessages } = useGame();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cooldownEnd <= Date.now()) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownEnd) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  // Round 2 has no answer entry — the judge button handles it.
  if (round === 2) return null;

  const remainingMs = Math.max(0, cooldownEnd - now);
  const isCoolingDown = remainingMs > 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const canSubmit = answer.trim().length > 0;

  const handleChange = (value: string) => {
    if (value.length <= MAX_ANSWER_LENGTH && ALPHANUMERIC_RE.test(value)) {
      setAnswer(value);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || isCoolingDown) return;
    setIsSubmitting(true);
    setError("");

    try {
      const result = await submitAnswer(answer.trim());

      if (result.success) {
        await advancePhase();
      } else {
        setError(result.error || "Hibás válasz");
        setCooldownEnd(Date.now() + ANSWER_COOLDOWN_MS);
        if (result.wrong_answer_video) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: result.error || "Hibás válasz",
              created_at: new Date().toISOString(),
              video: result.wrong_answer_video,
            },
          ]);
        }
      }
    } catch {
      setError("Hálózati hiba — próbáld újra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-t border-white/10">
      <label htmlFor={`round${round}-answer`} className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
        Kód
      </label>
      <div className="flex gap-2">
        <input
          id={`round${round}-answer`}
          value={answer}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Add meg a kódot"
          maxLength={MAX_ANSWER_LENGTH}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-center font-mono tracking-[0.2em] placeholder-white/40 focus:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isCoolingDown || !canSubmit}
          aria-live={isCoolingDown ? "polite" : "off"}
          className="px-4 py-2 bg-brand hover:bg-brand/80 disabled:opacity-30 text-black text-sm font-medium rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface tabular-nums"
        >
          {isCoolingDown ? `Várj ${remainingSec} mp` : "Beküldés"}
        </button>
      </div>
      {error && <p role="alert" className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
