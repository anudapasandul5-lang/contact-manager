"use client";

import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";

interface CenterNodeProps {
  data: { isMapCollapsed?: boolean };
}

export function CenterNode({ data }: CenterNodeProps) {
  const isCollapsed = data.isMapCollapsed ?? false;
  const borderColor = isCollapsed ? "#f59e0b" : "#2dd4a8";
  const iconBg = isCollapsed
    ? "linear-gradient(145deg, #fef3c7, #fde68a)"
    : "linear-gradient(145deg, #d1fae5, #a7f3d0)";
  const iconShadow = isCollapsed
    ? "inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.06), 3px 3px 8px rgba(245,158,11,0.2)"
    : "inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.06), 3px 3px 8px rgba(45,212,168,0.2)";
  const iconColor = isCollapsed ? "#d97706" : "#059669";

  return (
    <div
      style={{
        width: 130,
        height: 130,
        borderRadius: "50%",
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
        boxShadow: "var(--clay-shadow)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        border: `3px solid ${borderColor}`,
        cursor: "pointer",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
      }}
    >
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

      {/* Icon circle */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: iconBg,
          boxShadow: iconShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.3s ease",
        }}
      >
        <User style={{ width: 22, height: 22, color: iconColor, strokeWidth: 2.2, transition: "color 0.3s ease" }} />
      </div>

      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--clay-text)",
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-space-grotesk), ui-sans-serif",
          transition: "color 0.3s ease",
        }}
      >
        You
      </span>
      {isCollapsed && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "#d97706",
            letterSpacing: "0.04em",
            marginTop: -2,
          }}
        >
          Click to expand
        </span>
      )}
    </div>
  );
}
