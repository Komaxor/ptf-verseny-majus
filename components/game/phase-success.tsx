"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Check,
  Clock,
  MessageSquare,
  Lightbulb,
  XCircle,
  User,
  Loader2,
  Download,
  Pencil,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { jsPDF } from "jspdf";
import { PromptversenyFooter } from "@/components/promptverseny-footer";
import { PromptversenyEmailModal } from "@/components/promptverseny-email-modal";
import { LinkedInIcon } from "@/components/icons/linkedin-icon";
import { MetricCard } from "@/components/ui/metric-card";

interface RoundMetrics {
  round: number;
  timeSeconds: number;
  messageCount: number;
  hintClicks: number;
  failedAttempts: number;
}

interface SolveMetrics {
  firstMessageAt: string | null;
  solvedAt: string | null;
  totalTimeSeconds: number;
  totalMessages: number;
  totalHints: number;
  totalFailedAttempts: number;
  rounds: RoundMetrics[];
  isLateSolve: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "---";
  if (seconds < 60) return `${seconds} mp`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes} perc ${secs} mp`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} óra ${mins} perc`;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Sorompó - Igor",
  2: "Karbantartó-bejárat - Sergey",
  3: "Vezérlőterem - Tatyana",
};

export function PhaseSuccess() {
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const sessionHash = localStorage.getItem("ptf_session_hash");
        if (!sessionHash) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/solve-metrics?sessionHash=${encodeURIComponent(sessionHash)}`
        );
        if (response.ok) {
          const data: SolveMetrics = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error("Failed to load metrics:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const generateCertificate = async (name: string) => {
    // Soviet-typewriter face for the name; must be loaded before drawing to canvas.
    let nameFont = '"Courier New", monospace';
    try {
      const face = new FontFace("Special Elite", "url(/fonts/special-elite.woff2)");
      await face.load();
      document.fonts.add(face);
      nameFont = '"Special Elite", "Courier New", monospace';
    } catch {
      // fall back to the generic monospace declared above
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = "/oklevel-template.jpg";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    // The landscape template has a pre-drawn line at ~0.52 of the height,
    // centered horizontally. Place the participant's name to sit on it.
    const nameY = img.height * 0.508;
    const maxWidth = img.width * 0.32;
    let fontSize = img.width * 0.032;
    ctx.fillStyle = "#2e2a22";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    do {
      ctx.font = `${Math.round(fontSize)}px ${nameFont}`;
      if (ctx.measureText(name).width <= maxWidth) break;
      fontSize -= 1;
    } while (fontSize > img.width * 0.012);
    ctx.fillText(name, img.width / 2, nameY);

    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.addImage(imgData, "JPEG", 0, 0, 297, 210);
    doc.save(`oklevel-promptverseny-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || usernameSubmitting) return;

    setUsernameSubmitting(true);
    setUsernameError(null);

    try {
      const response = await fetch("/api/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setUsernameSaved(true);
      } else {
        setUsernameError(result.error || "Hiba történt.");
      }
    } catch {
      setUsernameError("Hiba történt. Próbáld újra.");
    } finally {
      setUsernameSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white flex flex-col">
      <main className="text-center max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center p-4 py-12">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6">
          <Image src="/promptverseny-logo.jpg" alt="Promptverseny logo" width={80} height={80} className="w-full h-full object-cover" />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
          Gratulálunk!
        </h1>
        <p className="text-base sm:text-xl text-white/60 mb-4">
          Mindhárom kihívást sikeresen teljesítetted!
        </p>

        {/* Status banner */}
        <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 text-brand px-5 py-2.5 rounded-full text-sm font-medium mb-4">
          <Check className="w-4 h-4" />
          A világ megmentve
        </div>

        {/* Late solve warning */}
        {metrics?.isLateSolve && (
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-5 py-2.5 rounded-full text-sm font-medium mb-10">
            <AlertTriangle className="w-4 h-4" />
            Az időkorlát lejárta után oldottad meg — az eredményed nem számít bele a ranglistába.
          </div>
        )}
        {!metrics?.isLateSolve && <div className="mb-6" />}

        {/* Pre-registration CTA */}
        <div className="mt-4 mb-8 bg-white/5 border border-brand/20 rounded-xl p-6 w-full">
          <h2 className="text-lg font-semibold text-white mb-2">
            Előregisztráció a júniusi versenyünkre
          </h2>
          <p className="text-sm text-white/60 mb-4">
            A júniusi versenyen az eddigi legizgalmasabb történettel várunk!
          </p>
          <button
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand/80 text-black font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Username input */}
        <div className="w-full">
          <h2 className="text-lg font-semibold text-white mb-3">Töltsd le az okleveled itt!</h2>
          {usernameSaved ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-xl text-sm font-medium">
                <Check className="w-4 h-4" />
                Név mentve: <span className="font-bold">{username}</span>
                <button
                  type="button"
                  onClick={() => setUsernameSaved(false)}
                  className="ml-1 text-brand hover:text-brand/70 transition-colors cursor-pointer"
                  aria-label="Név szerkesztése"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => generateCertificate(username)}
                className="w-full bg-brand hover:bg-brand/80 text-black font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Download className="w-4 h-4" />
                Oklevél letöltése
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <label htmlFor="success-username" className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-brand" />
                <span className="text-sm font-medium text-white">Add meg a teljes neved</span>
              </label>
              <form onSubmit={handleUsernameSubmit} className="flex gap-2">
                <input
                  id="success-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.slice(0, 50));
                    if (usernameError) setUsernameError(null);
                  }}
                  placeholder="Teljes név"
                  maxLength={50}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  autoComplete="off"
                  disabled={usernameSubmitting}
                />
                <button
                  type="submit"
                  disabled={usernameSubmitting || !username.trim()}
                  className="px-6 py-2 bg-brand hover:bg-brand/80 disabled:opacity-30 text-black font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  {usernameSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Mentés"
                  )}
                </button>
              </form>
              {usernameError && (
                <p className="text-red-400 text-sm mt-2">{usernameError}</p>
              )}
            </div>
          )}
        </div>

        {/* Overall metrics */}
        {loading ? (
          <div role="status" aria-live="polite" className="mt-8 text-sm text-white/70 animate-pulse">
            Statisztikák betöltése...
          </div>
        ) : metrics ? (
          <div className="mt-8 w-full space-y-6">
            {/* Total stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                icon={<Clock className="w-5 h-5 text-brand" />}
                label="Összes idő"
                value={formatDuration(metrics.totalTimeSeconds)}
              />
              <MetricCard
                icon={<MessageSquare className="w-5 h-5 text-brand" />}
                label="Üzenetek"
                value={`${metrics.totalMessages} db`}
              />
              <MetricCard
                icon={<Lightbulb className="w-5 h-5 text-brand" />}
                label="Tippek"
                value={`${metrics.totalHints} db`}
              />
              <MetricCard
                icon={<XCircle className="w-5 h-5 text-red-400" />}
                label="Hibás próbálkozások"
                value={`${metrics.totalFailedAttempts} db`}
              />
            </div>

            {/* Per-round breakdown */}
            {metrics.rounds && metrics.rounds.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-semibold text-white text-left">
                  Állomásról állomásra
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {metrics.rounds.map((r) => (
                    <div
                      key={r.round}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <h3 className="text-sm font-semibold text-brand mb-3">
                        Round {r.round}: {ROUND_NAMES[r.round]}
                      </h3>
                      <div className="space-y-1 text-xs text-white/60">
                        <div className="flex justify-between">
                          <span>Idő:</span>
                          <span className="text-white/80">{formatDuration(r.timeSeconds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Üzenetek:</span>
                          <span className="text-white/80">{r.messageCount} db</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tippek:</span>
                          <span className="text-white/80">{r.hintClicks} db</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hibás próbálkozások:</span>
                          <span className="text-white/80">{r.failedAttempts} db</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* LinkedIn Share */}
        <div className="mt-8 w-full">
          <button
            onClick={() => {
              const text = `Részt vettem a Promptverseny májusi kihívásán!\n\nHárom vállalati AI rendszer kellett kijátszanom. Nem kellett hozzá IT vagy programozói szaktudás, csak logikus gondolkodás, kreativitás és némi prompt engineering.\n\nA verseny rávilágított, hogy a legtöbb AI rendszer mennyire sebezhető, és hogy a mai világban elengedhetetlen az AI használat.\n\nKövesd a @promptverseny oldalt és tanulj meg promptolni!\n\nHa te is kipróbálnád magad, regisztrálj a júniusi versenyre!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering #prompts`;
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="w-full flex items-center justify-center gap-2 border border-linkedin text-linkedin hover:bg-linkedin hover:text-white px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linkedin focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <LinkedInIcon className="w-5 h-5" />
            Megosztás LinkedIn-en
          </button>
        </div>

        {/* B2B CTA */}
        <div className="mt-6 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-xl p-6 w-full text-left">
          <h2 className="text-lg font-semibold text-white mb-3">
            AI biztonság és képzés vállalatoknak
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-4">
            Szeretnél biztonsági felmérést a céges AI rendszeretek kapcsán? Szeretnéd megtudni, hogy a csapatod mennyire profi AI felhasználó?
          </p>
          <p className="text-sm text-white/60 leading-relaxed mb-5">
            Segítünk, hogy a vállalkozásod sikeresen helyt tudjon állni az AI korszakában.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:hello@promptverseny.hu"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              hello@promptverseny.hu
            </a>
            <a
              href="tel:+36304775557"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              +36 30 477 5557
            </a>
          </div>
        </div>
      </main>
      <div className="relative z-10">
        <PromptversenyFooter />
      </div>

      <PromptversenyEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        source="post_success"
      />
    </div>
  );
}

