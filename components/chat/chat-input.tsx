"use client";

import { useState, useCallback } from "react";
import { useGame } from "@/components/game/game-provider";
import { Send } from "lucide-react";

export function ChatInput() {
  const { sendMessage } = useGame();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setInput("");
    try {
      await sendMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sendMessage]);

  return (
    <div className="flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
        placeholder="Irj uzenetet..."
        disabled={isSending}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#00ff88]/50"
      />
      <button
        onClick={handleSubmit}
        disabled={isSending || !input.trim()}
        className="px-4 py-2 bg-[#00ff88] hover:bg-[#00ff88]/80 disabled:opacity-30 text-black rounded-lg transition-colors"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
