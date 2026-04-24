import type { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "subtle" | "accent";
}

export function MetricCard({ icon, label, value, tone = "subtle" }: MetricCardProps) {
  const surface =
    tone === "accent"
      ? "bg-black/70 border-brand/20"
      : "bg-white/5 border-white/10";
  const labelTone = tone === "accent" ? "text-gray-400" : "text-white/60";

  return (
    <div className={`${surface} border rounded-xl p-3 sm:p-4 text-center`}>
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm sm:text-lg font-bold text-white truncate">{value}</div>
      <div className={`text-[10px] sm:text-xs ${labelTone} truncate`}>{label}</div>
    </div>
  );
}
