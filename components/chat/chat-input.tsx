"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { Send } from "lucide-react";

const MAX_ROWS = 5;

export function ChatInput() {
  const { sendMessage } = useGame();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const maxHeight = lineHeight * MAX_ROWS;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

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
    <div className="flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        rows={1}
        placeholder="Írj üzenetet..."
        disabled={isSending}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface resize-none leading-5 overflow-y-auto"
      />
      <button
        onClick={handleSubmit}
        disabled={isSending || !input.trim()}
        className="px-4 py-2 bg-brand hover:bg-brand/80 disabled:opacity-30 text-black rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-label="Üzenet küldése"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
