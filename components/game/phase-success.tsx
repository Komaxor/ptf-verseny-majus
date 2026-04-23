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
  Shield,
} from "lucide-react";
import { jsPDF } from "jspdf";

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
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <div className="text-center max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center p-4 py-12">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#00ff88]/10 flex items-center justify-center mb-6 border border-[#00ff88]/20">
          <Shield className="w-10 h-10 text-[#00ff88]" />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
          Infiltráció sikeres!
        </h1>
        <p className="text-base sm:text-xl text-white/60 mb-4">
          Sikeresen teljesítetted az áprilisi promptverseny kihívásait.
        </p>

        {/* Status banner */}
        <div className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-5 py-2.5 rounded-full text-sm font-medium mb-10">
          <Check className="w-4 h-4" />
          Küldetés teljesítve
        </div>

        {/* Overall metrics */}
        {loading ? (
          <div className="text-sm text-white/40 animate-pulse">
            Statisztikák betöltése...
          </div>
        ) : metrics ? (
          <div className="w-full space-y-6">
            {/* Total stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                icon={<Clock className="w-5 h-5 text-[#00ff88]" />}
                label="Összes idő"
                value={formatDuration(metrics.totalTimeSeconds)}
              />
              <MetricCard
                icon={<MessageSquare className="w-5 h-5 text-[#00ff88]" />}
                label="Üzenetek"
                value={`${metrics.totalMessages} db`}
              />
              <MetricCard
                icon={<Lightbulb className="w-5 h-5 text-[#00ff88]" />}
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
                <h2 className="text-sm uppercase tracking-wider text-white/30 font-medium">
                  Szobáról szobára
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {metrics.rounds.map((r) => (
                    <div
                      key={r.round}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <h3 className="text-sm font-semibold text-[#00ff88] mb-3">
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
        <div className="mt-8 w-full max-w-lg mx-auto">
          {usernameSaved ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-4 py-3 rounded-xl text-sm font-medium">
                <Check className="w-4 h-4" />
                Név mentve: <span className="font-bold">{username}</span>
              </div>
              <button
                onClick={() => generateCertificate(username)}
                className="w-full bg-[#00ff88] hover:bg-[#00ff88]/80 text-black font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Oklevél letöltése
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#00ff88]" />
                <span className="text-sm font-medium text-white">Add meg a teljes neved</span>
              </div>
              <form onSubmit={handleUsernameSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.slice(0, 50));
                    if (usernameError) setUsernameError(null);
                  }}
                  placeholder="Teljes név"
                  maxLength={50}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#00ff88]/50"
                  autoComplete="off"
                  disabled={usernameSubmitting}
                />
                <button
                  type="submit"
                  disabled={usernameSubmitting || !username.trim()}
                  className="px-6 py-2 bg-[#00ff88] hover:bg-[#00ff88]/80 disabled:opacity-30 text-black font-medium rounded-lg transition-colors"
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
        <div className="mt-8 w-full max-w-lg mx-auto">
          <button
            onClick={() => {
              const text = `Sikeresen teljesítettem a promptverseny áprilisi kihívását!\n\nHárom AI-karakter meggyőzésével kellett megszereznem a privát kulcsot -- prompt engineering tudás és kreatív gondolkodás kellett hozzá.\n\nHa te is kipróbálnád magad, kövesd a @promptverseny oldalt!\n\nhttps://promptverseny.hu\n\n#promptverseny #AI #promptengineering`;
              const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="w-full flex items-center justify-center gap-2 border border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white px-4 py-3 rounded-xl transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            Megosztás LinkedIn-en
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
