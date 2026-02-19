"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: string; // hex color for the glow/accent
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  trend,
  accentColor = "#6366f1",
}: StatCardProps) {
  const deltaDir =
    delta !== undefined ? (delta > 0 ? "up" : delta < 0 ? "down" : "neutral") : trend;

  const deltaColor =
    deltaDir === "up"
      ? "#10b981"
      : deltaDir === "down"
      ? "#ef4444"
      : "rgba(241,245,249,0.35)";

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: "1px solid rgba(99,102,241,0.12)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Corner glow orb */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-[0.15]"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* Label + Icon row */}
        <div className="mb-4 flex items-start justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(241,245,249,0.4)" }}
          >
            {label}
          </span>
          {icon && (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}30`,
                color: accentColor,
              }}
            >
              <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div
          className="text-3xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {/* Delta */}
        {(delta !== undefined || deltaLabel) && (
          <div className="mt-2.5 flex items-center gap-2">
            {delta !== undefined && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background:
                    deltaDir === "up"
                      ? "rgba(16,185,129,0.12)"
                      : deltaDir === "down"
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(241,245,249,0.06)",
                  color: deltaColor,
                }}
              >
                {deltaDir === "up" && <TrendingUp className="h-3 w-3" />}
                {deltaDir === "down" && <TrendingDown className="h-3 w-3" />}
                {deltaDir === "neutral" && <Minus className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
            {deltaLabel && (
              <span
                className="text-[11px]"
                style={{ color: "rgba(241,245,249,0.3)" }}
              >
                {deltaLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
