"use client";

import { Bot, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-[#00ff88]/20" : "bg-white/10"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[#00ff88]" />
        ) : (
          <Bot className="w-4 h-4 text-white/60" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-[#00ff88]/10 border border-[#00ff88]/20"
            : "bg-white/5 border border-white/10"
        }`}
      >
        <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
