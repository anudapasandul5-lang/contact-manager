"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface VendorPersonNodeData {
  label: string;
  initials: string;
  role?: string | null;
  [key: string]: unknown;
}

export function VendorPersonNode({ data }: NodeProps) {
  const { label, initials, role } = data as VendorPersonNodeData;
  const animScale = typeof data._animScale === "number" ? data._animScale : 1;

  return (
    <div style={{ transform: `scale(${animScale})`, transformOrigin: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(145deg, #fff7ed, #ffedd5)",
          borderRadius: 16,
          padding: "9px 14px 9px 9px",
          boxShadow: "5px 5px 14px rgba(249,115,22,0.18), -3px -3px 8px rgba(255,255,255,0.75), inset 1px 1px 3px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.04)",
          border: "1.5px solid #fdba74",
          minWidth: 130,
          cursor: "pointer",
        }}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #fb923c, #ea580c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "#ffffff",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(249,115,22,0.32)",
          }}
        >
          {initials}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#7c2d12",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 110,
            }}
          >
            {label}
          </span>
          {role && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "#9a3412",
                opacity: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 110,
              }}
            >
              {role}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
