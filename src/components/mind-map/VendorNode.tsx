"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Truck } from "lucide-react";

interface VendorNodeData {
  label: string;
  specialty?: string | null;
  color?: string | null;
  peopleCount: number;
  isQuiet?: boolean;
  showLabel?: boolean;
  isNeighborhoodActive?: boolean;
  isNeighborhoodDimmed?: boolean;
  [key: string]: unknown;
}

export function VendorNode({ data }: NodeProps) {
  const {
    label,
    specialty,
    color,
    peopleCount,
    isQuiet = false,
    showLabel = true,
    isNeighborhoodActive = false,
    isNeighborhoodDimmed = false,
  } = data as VendorNodeData;
  const accent = color || "#f97316";
  const animScale = typeof data._animScale === "number" ? data._animScale : 1;

  return (
    <div style={{ transform: `scale(${animScale})`, transformOrigin: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "linear-gradient(145deg, #fff3e6, #f5dfc5)",
          borderRadius: 20,
          padding: "12px 16px 12px 12px",
          boxShadow: "6px 6px 16px rgba(249,115,22,0.18), -3px -3px 10px rgba(255,255,255,0.75), inset 1px 1px 3px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.04)",
          border: `1.5px solid ${accent}`,
          minWidth: showLabel ? 180 : 54,
          cursor: "pointer",
          transition: "min-width 0.2s ease, filter 0.2s ease",
          filter: isNeighborhoodDimmed ? "saturate(0.72)" : undefined,
          opacity: isQuiet && !isNeighborhoodActive ? 0.88 : 1,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(145deg, #fed7aa, #fdba74)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.06), 2px 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <Truck style={{ width: 18, height: 18, color: "#c2410c", strokeWidth: 2 }} />
        </div>

        {showLabel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#7c2d12",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 150,
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: 10, color: "#9a3412", opacity: 0.75, fontWeight: 500 }}>
              {specialty || "Vendor"} · {peopleCount} person{peopleCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
