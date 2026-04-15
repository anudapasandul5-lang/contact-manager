"use client";

import type React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface SearchOverlayProps {
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number;
  focusIndex: number;
  onPrev: () => void;
  onNext: () => void;
  activeResultLabel?: string | null;
  activeResultKind?: string | null;
}

export function SearchOverlay({
  query,
  onQueryChange,
  matchCount,
  focusIndex,
  onPrev,
  onNext,
  activeResultLabel,
  activeResultKind,
}: SearchOverlayProps) {
  const showCounter = matchCount > 0 && query.trim().length > 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        minWidth: 320,
        maxWidth: "min(420px, calc(100vw - 32px))",
        borderRadius: 22,
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        boxShadow: "var(--clay-shadow-sm)",
        backdropFilter: "blur(8px)",
        pointerEvents: "all",
      }}
    >
      <Search style={{ width: 16, height: 16, color: "var(--clay-text-secondary)", flexShrink: 0 }} />

      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search people, companies, vendors, projects..."
        aria-label="Search network"
        style={{
          flex: 1,
          minWidth: 0,
          height: 28,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--clay-text)",
          fontSize: 14,
        }}
      />

      {showCounter && (
        <>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--clay-text-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            {focusIndex + 1} / {matchCount}
          </div>

          {activeResultLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                maxWidth: 180,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                color: "var(--clay-text-secondary)",
              }}
            >
              {activeResultKind && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    flexShrink: 0,
                  }}
                >
                  {activeResultKind}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--clay-text)",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeResultLabel}
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={onPrev}
              type="button"
              aria-label="Previous match"
              style={navButtonStyle}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={onNext}
              type="button"
              aria-label="Next match"
              style={navButtonStyle}
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(255,255,255,0.7)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--clay-text-secondary)",
};
