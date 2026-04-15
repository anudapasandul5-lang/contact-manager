"use client";

import type { FilterCategory } from "./node-filters";

interface FilterOverlayProps {
  inactiveCategories: Set<FilterCategory>;
  onToggle: (category: FilterCategory) => void;
}

const filters: { category: FilterCategory; label: string; color: string; activeColor: string; activeBg: string }[] = [
  { category: "company", label: "Companies", color: "var(--clay-text-muted)", activeColor: "#2563eb", activeBg: "rgba(37,99,235,0.15)" },
  { category: "employee", label: "People", color: "var(--clay-text-muted)", activeColor: "#16a34a", activeBg: "rgba(22,163,74,0.15)" },
  { category: "vendor", label: "Vendors", color: "var(--clay-text-muted)", activeColor: "#ea580c", activeBg: "rgba(234,88,12,0.15)" },
  { category: "project", label: "Projects", color: "var(--clay-text-muted)", activeColor: "#475569", activeBg: "rgba(71,85,105,0.15)" },
];

export function FilterOverlay({ inactiveCategories, onToggle }: FilterOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        zIndex: 20,
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        backdropFilter: "blur(8px)",
        borderRadius: 20,
        padding: "6px 10px",
        boxShadow: "var(--clay-shadow-sm)",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        pointerEvents: "all",
      }}
    >
      {filters.map(({ category, label, color, activeColor, activeBg }) => {
        const isActive = !inactiveCategories.has(category);
        return (
          <button
            key={category}
            onClick={() => onToggle(category)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: isActive ? activeColor : color,
              background: isActive ? activeBg : "transparent",
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
