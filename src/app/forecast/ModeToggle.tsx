"use client";

import { SquaresFour, Rows } from "@phosphor-icons/react";

interface ModeToggleProps {
  mode: "columns" | "swimlane";
  onToggle: () => void;
}

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const isSwimLane = mode === "swimlane";
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
      style={{
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        boxShadow: "var(--clay-shadow-sm)",
        color: isSwimLane ? "#6366f1" : "var(--clay-text-secondary)",
        border: isSwimLane ? "1px solid #6366f133" : "1px solid transparent",
      }}
      title={isSwimLane ? "Switch to column view" : "Switch to swim-lane view"}
    >
      {isSwimLane ? (
        <Rows size={16} weight="regular" />
      ) : (
        <SquaresFour size={16} weight="regular" />
      )}
    </button>
  );
}
