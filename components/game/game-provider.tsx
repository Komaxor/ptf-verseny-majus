"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Phase } from "@/lib/config";
import { PHASE_ROUND, PHASE_VIDEOS, PHASES } from "@/lib/config";
import type { GameState, ChatMessage } from "@/lib/types";

interface GameContextType {
  phase: Phase;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  revealedHints: { round: number; hint_number: number }[];
  currentRound: number | null;
  isLoading: boolean;

  // Actions
  advancePhase: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearContext: () => Promise<void>;
  submitAnswer: (answer: string) => Promise<{ success: boolean; error?: string; rateLimited?: boolean; waitTime?: number }>;
  tryDoor: () => Promise<{ granted: boolean; error?: string }>;
  revealHint: (round: number, hintNumber: number) => Promise<void>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

function getSessionHash(): string {
  if (typeof window === "undefined") return "";
  let hash = localStorage.getItem("ptf_session_hash");
  if (!hash) {
    hash = crypto.randomUUID();
    localStorage.setItem("ptf_session_hash", hash);
  }
  return hash;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [revealedHints, setRevealedHints] = useState<{ round: number; hint_number: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const phase = (gameState?.current_phase || "VIDEO_INTRO") as Phase;
  const currentRound = PHASE_ROUND[phase] ?? null;

  // Load game state on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/game-state");
        if (res.ok) {
          const data = await res.json();
          setGameState(data.gameState);
          setRevealedHints(data.revealedHints || []);

          const messages = data.chatMessages || [];
          const loadedPhase = data.gameState?.current_phase as Phase;
          const loadedRound = PHASE_ROUND[loadedPhase];

          // If in a round phase with no messages, load the welcome message
          if (loadedRound && messages.length === 0) {
            try {
              const challengeRes = await fetch(`/api/challenge?round=${loadedRound}`);
              if (challengeRes.ok) {
                const challengeData = await challengeRes.json();
                if (challengeData.welcomeMessage) {
                  setChatMessages([{
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: challengeData.welcomeMessage,
                    created_at: new Date().toISOString(),
                  }]);
                  return;
                }
              }
            } catch {
              // Fall through to empty messages
            }
          }
          setChatMessages(messages);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Sequential preloading: videos & avatars in phase order
  const preloadStarted = useRef(false);
  useEffect(() => {
    if (preloadStarted.current) return;
    preloadStarted.current = true;

    const assets: string[] = [];

    // Videos in phase order
    for (const p of PHASES) {
      const video = PHASE_VIDEOS[p];
      if (video) assets.push(video);
    }

    // Avatar images
    assets.push(
      "/images/adel-avatar.png",
      "/images/vanda-avatar.png",
      "/images/copilot-avatar.png",
    );

    let cancelled = false;

    async function preloadSequentially() {
      for (const src of assets) {
        if (cancelled) break;
        try {
          if (src.endsWith(".mp4")) {
            const video = document.createElement("video");
            video.preload = "auto";
            video.src = src;
            await new Promise<void>((resolve) => {
              video.oncanplaythrough = () => resolve();
              video.onerror = () => resolve();
              // Timeout after 30s per video to avoid blocking
              setTimeout(resolve, 30_000);
            });
          } else {
            const img = new Image();
            img.src = src;
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          }
        } catch {
          // Continue to next asset
        }
      }
    }

    preloadSequentially();

    return () => { cancelled = true; };
  }, []);

  const advancePhase = useCallback(async () => {
    const res = await fetch("/api/game-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      setGameState(data.gameState);

      // If entering a round, load welcome message
      const newPhase = data.gameState.current_phase as Phase;
      const newRound = PHASE_ROUND[newPhase];
      if (newRound) {
        try {
          const challengeRes = await fetch(`/api/challenge?round=${newRound}`);
          if (challengeRes.ok) {
            const challengeData = await challengeRes.json();
            if (challengeData.welcomeMessage) {
              setChatMessages([{
                id: crypto.randomUUID(),
                role: "assistant",
                content: challengeData.welcomeMessage,
                created_at: new Date().toISOString(),
              }]);
              return;
            }
          }
        } catch {
          // Fall through to empty messages
        }
      }
      setChatMessages([]); // New phase = fresh chat
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentRound) return;

      // Optimistic: add user message to UI
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // SSE streaming
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionHash: getSessionHash(),
          round: currentRound,
        }),
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setChatMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    },
    [currentRound]
  );

  const clearContext = useCallback(async () => {
    if (!currentRound) return;
    await fetch("/api/context-clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round: currentRound }),
    });
    setChatMessages([]);
  }, [currentRound]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!currentRound) return { success: false, error: "No round" };
      const res = await fetch("/api/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          round: currentRound,
          sessionHash: getSessionHash(),
        }),
      });
      return await res.json();
    },
    [currentRound]
  );

  const tryDoor = useCallback(async () => {
    const res = await fetch("/api/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  }, []);

  const revealHint = useCallback(
    async (round: number, hintNumber: number) => {
      await fetch("/api/hint-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round,
          hintNumber,
          sessionHash: getSessionHash(),
        }),
      });
      setRevealedHints((prev) => [...prev, { round, hint_number: hintNumber }]);
    },
    []
  );

  return (
    <GameContext.Provider
      value={{
        phase,
        gameState,
        chatMessages,
        revealedHints,
        currentRound,
        isLoading,
        advancePhase,
        sendMessage,
        clearContext,
        submitAnswer,
        tryDoor,
        revealHint,
        setChatMessages,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
