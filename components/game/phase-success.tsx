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
  ArrowRight,
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
  1: "Lobby - Adél",
  2: "Recepció - Vanda",
  3: "Iroda - Copilot",
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
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = 297;
    const h = 210;

    // Background
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, w, h, "F");

    // Decorative border
    doc.setDrawColor(0, 255, 136);
    doc.setLineWidth(2);
    doc.rect(10, 10, w - 20, h - 20);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, w - 28, h - 28);

    // Corner accents
    const cornerSize = 20;
    doc.setLineWidth(2);
    const corners = [
      [14, 14, 14 + cornerSize, 14, 14, 14 + cornerSize],
      [w - 14, 14, w - 14 - cornerSize, 14, w - 14, 14 + cornerSize],
      [14, h - 14, 14 + cornerSize, h - 14, 14, h - 14 - cornerSize],
      [w - 14, h - 14, w - 14 - cornerSize, h - 14, w - 14, h - 14 - cornerSize],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of corners) {
      doc.line(x2, y2, x1, y1);
      doc.line(x1, y1, x3, y3);
    }

    // Logo
    try {
      const response = await fetch("/promptverseny-logo.jpg");
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, "JPEG", w / 2 - 12, 28, 24, 24);
    } catch {
      // Skip logo if it fails to load
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(0, 255, 136);
    doc.text("HEIST REPORT", w / 2, 70, { align: "center" });

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(180, 180, 180);
    doc.text("Promptverseny -- Április 2026", w / 2, 82, { align: "center" });

    // Decorative line
    doc.setDrawColor(0, 255, 136);
    doc.setLineWidth(0.5);
    doc.line(w / 2 - 50, 88, w / 2 + 50, 88);

    // "Agent" text
    doc.setFontSize(12);
    doc.setTextColor(160, 160, 160);
    doc.text("Infiltrator:", w / 2, 100, { align: "center" });

    // Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text(name, w / 2, 115, { align: "center" });

    // Decorative line under name
    doc.setDrawColor(0, 255, 136);
    doc.line(w / 2 - 60, 120, w / 2 + 60, 120);

    // Achievement text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(180, 180, 180);
    doc.text(
      "Sikeresen teljesítette az áprilisi promptverseny kihívásait.",
      w / 2,
      132,
      { align: "center" }
    );

    // Metrics if available
    if (metrics) {
      doc.setFontSize(10);
      doc.setTextColor(0, 255, 136);
      const metricsText = [
        metrics.totalTimeSeconds > 0
          ? `Idő: ${formatDuration(metrics.totalTimeSeconds)}`
          : null,
        `Üzenetek: ${metrics.totalMessages} db`,
        `Tippek: ${metrics.totalHints} db`,
      ]
        .filter(Boolean)
        .join("  |  ");
      doc.text(metricsText, w / 2, 148, { align: "center" });
    }

    // Date
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    const date = new Date().toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Budapest, ${date}`, w / 2, 170, { align: "center" });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("promptverseny.hu", w / 2, 190, { align: "center" });

    doc.save(`heist-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
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
          Mindhárom szobát feltörted — a küldetés teljesítve.
        </p>

        {/* Status banner */}
        <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 text-brand px-5 py-2.5 rounded-full text-sm font-medium mb-10">
          <Check className="w-4 h-4" />
          Küldetés teljesítve
        </div>

        {/* Overall metrics */}
        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-white/70 animate-pulse">
            Statisztikák betöltése...
          </div>
        ) : metrics ? (
          <div className="w-full space-y-6">
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
                  Szobáról szobára
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

        {/* Username input */}
        <div className="mt-8 w-full">
          {usernameSaved ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-brand/10 border border-brand/20 text-brand px-4 py-3 rounded-xl text-sm font-medium">
                <Check className="w-4 h-4" />
                Név mentve: <span className="font-bold">{username}</span>
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

        {/* LinkedIn Share */}
        <div className="mt-8 w-full">
          <button
            onClick={() => {
              const text = `Sikeresen teljesítettem a promptverseny áprilisi kihívását!\n\nHárom AI-karakter meggyőzésével kellett megszereznem a privát kulcsot -- prompt engineering tudás és kreatív gondolkodás kellett hozzá.\n\nHa te is kipróbálnád magad, kövesd a @promptverseny oldalt!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering`;
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="w-full flex items-center justify-center gap-2 border border-linkedin text-linkedin hover:bg-linkedin hover:text-white px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linkedin focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <LinkedInIcon className="w-5 h-5" />
            Megosztás LinkedIn-en
          </button>
        </div>

        {/* Pre-registration CTA */}
        <div className="mt-10 bg-white/5 border border-brand/20 rounded-xl p-6 w-full">
          <h2 className="text-lg font-semibold text-white mb-2">
            Előregisztráció a következő versenyünkre
          </h2>
          <p className="text-sm text-white/60 mb-4">
            Következő promptversenyről ne maradj le!
          </p>
          <button
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand/80 text-black font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer"
          >
            Előregisztrálok
            <ArrowRight className="w-4 h-4" />
          </button>
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

