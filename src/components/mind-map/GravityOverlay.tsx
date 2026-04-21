"use client";

import { useState } from "react";
import { Magnet, SlidersHorizontal } from "lucide-react";

export type GravityTarget = "company" | "employee" | "vendor" | "project";

interface GravityOverlayProps {
  targets: Set<GravityTarget>;
  onToggle: (target: GravityTarget) => void;
  rightOffset?: number;
}

const chips: { target: GravityTarget; label: string; activeColor: string; activeBg: string }[] = [
  { target: "company", label: "Companies", activeColor: "#2563eb", activeBg: "rgba(37,99,235,0.15)" },
  { target: "employee", label: "Employees", activeColor: "#16a34a", activeBg: "rgba(22,163,74,0.15)" },
  { target: "vendor", label: "Vendors", activeColor: "#ea580c", activeBg: "rgba(234,88,12,0.15)" },
  { target: "project", label: "Projects", activeColor: "#475569", activeBg: "rgba(71,85,105,0.15)" },
];

export function GravityOverlay({ targets, onToggle, rightOffset = 0 }: GravityOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: rightOffset + 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
        zIndex: 20,
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        backdropFilter: "blur(8px)",
        borderRadius: 18,
        padding: "5px 8px",
        boxShadow: "var(--clay-shadow-sm)",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        pointerEvents: "all",
        opacity: expanded ? 1 : 0.9,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          color: "var(--clay-text-muted)",
          cursor: "pointer",
          padding: "3px 6px",
          borderRadius: 12,
        }}
        aria-label={expanded ? "Hide advanced filters" : "Show advanced filters"}
        title={expanded ? "Hide advanced filters" : "Show advanced filters"}
      >
        <SlidersHorizontal style={{ width: 13, height: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.01em" }}>Filters</span>
        {targets.size > 0 && (
          <span
            style={{
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.08)",
              color: "var(--clay-text)",
              fontSize: 10,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
          >
            {targets.size}
          </span>
        )}
      </button>

      {expanded && (
        <Magnet
          style={{
            width: 13,
            height: 13,
            color: "var(--clay-text-muted)",
            marginRight: 2,
            flexShrink: 0,
          }}
        />
      )}
      {expanded && chips.map(({ target, label, activeColor, activeBg }) => {
        const isActive = targets.has(target);
        return (
          <button
            key={target}
            onClick={() => onToggle(target)}
            title={`${isActive ? "Expand" : "Collapse"} ${label.toLowerCase()} into the center`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: isActive ? activeColor : "var(--clay-text-muted)",
              background: isActive ? activeBg : "transparent",
              opacity: isActive ? 1 : 0.55,
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
