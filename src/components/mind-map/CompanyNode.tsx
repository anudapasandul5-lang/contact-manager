"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Building2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type { RingState } from "@/lib/workload/overlay";
import { RingIndicator } from "./RingIndicator";

interface CompanyNodeData {
  label: string;
  initials: string;
  logoUrl?: string | null;
  color: string;
  isOwned: boolean;
  contactCount: number;
  isCollapsed?: boolean;
  hiddenCount?: number;
  onCollapse?: () => void;
  isFocusAnchor?: boolean;
  ringState?: RingState;
  taskCount?: number;
  [key: string]: unknown;
}

const clayPalette: Record<string, { bg: string; gradient: string; icon: string; text: string; shadow: string }> = {
  "#3b82f6": { bg: "#dbeafe", gradient: "linear-gradient(145deg, #dbeafe, #c7d7f0)", icon: "#3b82f6", text: "#1e40af", shadow: "59,130,246" },
  "#0d9488": { bg: "#ccfbf1", gradient: "linear-gradient(145deg, #ccfbf1, #b2ece0)", icon: "#0d9488", text: "#065f53", shadow: "13,148,136" },
  "#e11d48": { bg: "#ffe4e6", gradient: "linear-gradient(145deg, #ffe4e6, #f0cfd1)", icon: "#e11d48", text: "#9f1239", shadow: "225,29,72" },
  "#7c3aed": { bg: "#ede9fe", gradient: "linear-gradient(145deg, #ede9fe, #ddd6f0)", icon: "#7c3aed", text: "#5b21b6", shadow: "124,58,237" },
  "#ea580c": { bg: "#ffedd5", gradient: "linear-gradient(145deg, #ffedd5, #f0dcc4)", icon: "#ea580c", text: "#9a3412", shadow: "234,88,12" },
  "#2563eb": { bg: "#dbeafe", gradient: "linear-gradient(145deg, #dbeafe, #c7d7f0)", icon: "#2563eb", text: "#1e40af", shadow: "37,99,235" },
};

function getClayStyle(color: string) {
  if (clayPalette[color]) return clayPalette[color];
  return {
    bg: "#e8e6e1",
    gradient: "linear-gradient(145deg, #f0eeea, #e0ded9)",
    icon: color,
    text: "#374151",
    shadow: "100,100,100",
  };
}

export function CompanyNode({ data }: NodeProps) {
  const {
    label,
    initials,
    logoUrl,
    color,
    isOwned,
    contactCount,
    isCollapsed = false,
    hiddenCount = 0,
    onCollapse,
    isFocusAnchor = false,
    ringState = "none",
    taskCount = 0,
  } = data as CompanyNodeData;
  const clay = getClayStyle(color);
  const animScale = typeof data._animScale === "number" ? data._animScale : 1;
  const ringVisible = ringState !== "none" && ringState !== "active";

  return (
    <div style={{ transform: `scale(${animScale})`, transformOrigin: "center", position: "relative" }}>
      <RingIndicator state={ringState} size={60} />
      {ringVisible && taskCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            left: -6,
            zIndex: 1,
            background: "#1e293b",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 999,
            padding: "1px 5px",
            lineHeight: "14px",
          }}
        >
          {taskCount}
        </span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: clay.gradient,
          borderRadius: 20,
          padding: "10px 12px",
          boxShadow: isFocusAnchor
            ? `0 0 0 4px rgba(${clay.shadow},0.16), 10px 12px 26px rgba(${clay.shadow},0.22), -3px -3px 10px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.04)`
            : `6px 6px 16px rgba(${clay.shadow},0.15), -3px -3px 10px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.04)`,
          border: isFocusAnchor ? `2px solid ${clay.icon}` : "1px solid rgba(255,255,255,0.15)",
          minWidth: 210,
          cursor: "pointer",
          transition: "box-shadow 0.3s ease, transform 0.2s ease",
        }}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

        <EntityAvatar
          name={label}
          imageUrl={logoUrl}
          className="rounded-[14px]"
          imageFit="contain"
          imageInset={4}
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            background: `linear-gradient(145deg, ${clay.icon}, ${clay.icon})`,
            color: "#ffffff",
            flexShrink: 0,
          }}
          imageFrameStyle={{
            width: "100%",
            height: "100%",
            borderRadius: 14,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.72), inset -1px -1px 2px rgba(0,0,0,0.08)",
          }}
          fallback={
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 14,
                background: `linear-gradient(145deg, ${clay.icon}, ${clay.icon})`,
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              {initials}
            </div>
          }
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: clay.text,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 130,
              }}
            >
              {label}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: isOwned ? "rgba(59,130,246,0.12)" : "rgba(13,148,136,0.12)",
                color: isOwned ? "#1d4ed8" : "#0f766e",
                flexShrink: 0,
              }}
            >
              <Building2 style={{ width: 11, height: 11 }} />
              {isOwned ? "Owned" : "Partner"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--clay-text-secondary)", fontSize: 11 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Users style={{ width: 12, height: 12 }} />
              {contactCount}
            </span>
            {hiddenCount > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                  background: isCollapsed ? "rgba(15,23,42,0.1)" : "rgba(15,23,42,0.06)",
                  color: clay.text,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: clay.icon,
                    display: "inline-block",
                    opacity: 0.8,
                  }}
                />
                +{hiddenCount} tucked
              </span>
            )}
          </div>
        </div>

        {onCollapse && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCollapse();
            }}
            aria-label={isCollapsed ? "Expand contacts" : "Collapse contacts"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.65)",
              color: clay.text,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {isCollapsed ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronUp style={{ width: 14, height: 14 }} />}
          </button>
        )}
      </div>
    </div>
  );
}
