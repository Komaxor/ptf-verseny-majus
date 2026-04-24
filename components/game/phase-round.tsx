"use client";

import { useGame } from "./game-provider";
import { PHASE_ROUND } from "@/lib/config";
import { HeaderBar } from "@/components/layout/header-bar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AnswerEntry } from "@/components/round/answer-entry";
import { HintPanel } from "@/components/round/hint-panel";
import { SceneVisual } from "@/components/round/scene-visual";
import { RoundHeader } from "@/components/round/round-header";

export function PhaseRound() {
  const { phase } = useGame();
  const round = PHASE_ROUND[phase]!;

  return (
    <div className="flex flex-col h-screen bg-surface text-white">
      <HeaderBar />
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Scene Visual + Answer Entry */}
        <div className="hidden md:flex md:w-[40%] lg:w-[35%] flex-col border-r border-white/10">
          <SceneVisual round={round} />
          <AnswerEntry round={round} />
        </div>

        {/* Right: Chat */}
        <div className="flex-1 flex flex-col">
          <RoundHeader round={round} />
          <ChatInterface />
          <HintPanel round={round} />
          {/* Mobile: Answer Entry below chat */}
          <div className="md:hidden">
            <AnswerEntry round={round} />
          </div>
        </div>
      </main>
    </div>
  );
}
