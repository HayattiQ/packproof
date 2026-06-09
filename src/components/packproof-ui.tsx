"use client";

import type { CSSProperties, ReactNode } from "react";

/** Explorer base for txhash / token links (Mantle Sepolia by default). */
export const MANTLESCAN =
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_URL || "https://sepolia.mantlescan.xyz";

/** "$1,240" */
export function money(n: number): string {
  return "$" + n.toLocaleString();
}

/** Truncate a long hex string in the middle: 0x1234abcd…ef90. */
export function shortHex(hex: string | undefined | null, head = 10, tail = 6): string {
  if (!hex) return "—";
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

/** PSA grade label from the numeric grade. */
export function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "PSA";
  return grade === 10 ? "GEM MT" : grade === 9 ? "MINT" : grade === 8 ? "NM-MT" : "NM";
}

/**
 * Grade seal — the gold PSA grade badge used across every surface.
 * `g` is the numeric grade, `sub` the grade label ("GEM MT", "PSA", …).
 */
export function GradeSeal({
  g,
  sub,
  size,
}: {
  g: string | number;
  sub: string;
  size?: "sm" | "md";
}) {
  const fs = size === "sm" ? "11px" : "13px";
  const pad = size === "sm" ? "3px 8px" : "4px 10px";
  return (
    <span className="grade" style={{ fontSize: fs, padding: pad }}>
      {g} <small>{sub}</small>
    </span>
  );
}

/**
 * Holo-foil art frame. Renders the animated holo gradient background with an
 * optional card image floated on top (used by marketplace + buy modal).
 */
export function HoloArt({
  children,
  ratio,
  style,
}: {
  children?: ReactNode;
  ratio?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="art"
      style={{
        position: "relative",
        aspectRatio: ratio || "63/80",
        overflow: "hidden",
        background:
          "radial-gradient(120% 90% at 30% 14%, rgba(255,255,255,0.14), transparent 55%), var(--holo)",
        backgroundSize: "auto, 240% 240%",
        animation: "holoShift 10s ease-in-out infinite",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
