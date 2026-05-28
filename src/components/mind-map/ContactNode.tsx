"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type { ContactType } from "@/lib/supabase/types";
import type { RingState } from "@/lib/workload/overlay";
import { RingIndicator } from "./RingIndicator";

const typeConfig: Record<ContactType, {
  bg: string;
  gradient: string;
  accent: string;
  text: string;
  shadow: string;
  badgeBg: string;
  border: string;
  avatarBg: string;
}> = {
  employee: {
    bg: "#dcfce7",
    gradient: "linear-gradient(145deg, #e8faf0, #d0edda)",
    accent: "#16a34a",
    text: "#14532d",
    shadow: "34,197,94",
    badgeBg: "rgba(22,163,74,0.12)",
    border: "#4ade80",
    avatarBg: "linear-gradient(145deg, #22c55e, #16a34a)",
  },
  vendor: {
    bg: "#ffedd5",
    gradient: "linear-gradient(145deg, #fff3e6, #f5dfc5)",
    accent: "#ea580c",
    text: "#7c2d12",
    shadow: "249,115,22",
    badgeBg: "rgba(234,88,12,0.12)",
    border: "#fb923c",
    avatarBg: "linear-gradient(145deg, #f97316, #ea580c)",
  },
  investor: {
    bg: "#ccfbf1",
    gradient: "linear-gradient(145deg, #d0fdf5, #b2f0e8)",
    accent: "#0d9488",
    text: "#0f766e",
    shadow: "20,184,166",
    badgeBg: "rgba(20,184,166,0.12)",
    border: "#2dd4bf",
    avatarBg: "linear-gradient(145deg, #14b8a6, #0d9488)",
  },
  cofounder: {
    bg: "#ede9fe",
    gradient: "linear-gradient(145deg, #f0ebff, #e9d5ff)",
    accent: "#7c3aed",
    text: "#3b0764",
    shadow: "139,92,246",
    badgeBg: "rgba(124,58,237,0.12)",
    border: "#a78bfa",
    avatarBg: "linear-gradient(145deg, #a855f7, #7c3aed)",
  },
  partner: {
    bg: "#fef3c7",
    gradient: "linear-gradient(145deg, #fffbeb, #fde68a)",
    accent: "#d97706",
    text: "#92400e",
    shadow: "217,119,6",
    badgeBg: "rgba(217,119,6,0.12)",
    border: "#fbbf24",
    avatarBg: "linear-gradient(145deg, #f59e0b, #d97706)",
  },
};

interface ContactNodeData {
  label: string;
  initials: string;
  photoUrl?: string | null;
  contactType: ContactType;
  isShared: boolean;
  companyNames: string[];
  role?: string;
  searchMatch?: boolean;
  isQuiet?: boolean;
  showLabel?: boolean;
  isNeighborhoodActive?: boolean;
  isNeighborhoodDimmed?: boolean;
  ringState?: RingState;
  taskCount?: number;
  [key: string]: unknown;
}

export function ContactNode({ data }: NodeProps) {
  const {
    label,
    initials,
    photoUrl,
    contactType,
    isShared,
    companyNames,
    role,
    searchMatch,
    isQuiet = false,
    showLabel = true,
    isNeighborhoodActive = false,
    isNeighborhoodDimmed = false,
    ringState = "none",
    taskCount = 0,
  } = data as ContactNodeData;
  const cfg = typeConfig[contactType];
  const animScale = typeof data._animScale === "number" ? data._animScale : 1;
  const ringVisible = ringState !== "none" && ringState !== "active";

  return (
    <div style={{ transform: `scale(${animScale})`, transformOrigin: "center", position: "relative" }}>
      <RingIndicator state={ringState} size={52} />
      {ringVisible && taskCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
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
          gap: 8,
          background: cfg.gradient,
          borderRadius: 16,
          padding: "9px 14px 9px 9px",
          boxShadow: `5px 5px 16px rgba(${cfg.shadow},0.25), -3px -3px 8px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.04)`,
          border: searchMatch ? `2px solid ${cfg.accent}` : `1.5px solid ${cfg.border}`,
          minWidth: showLabel ? 130 : 50,
          cursor: "pointer",
          transition: "box-shadow 0.3s ease, transform 0.2s ease, min-width 0.2s ease, padding 0.2s ease, filter 0.2s ease",
          filter: isNeighborhoodDimmed ? "saturate(0.72)" : undefined,
          opacity: isQuiet && !isNeighborhoodActive ? 0.9 : 1,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

        <EntityAvatar
          name={label}
          imageUrl={photoUrl}
          className="rounded-full"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: cfg.avatarBg,
            boxShadow: `0 2px 6px rgba(${cfg.shadow},0.35)`,
            flexShrink: 0,
          }}
          fallback={
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: cfg.avatarBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </div>
          }
        />

        {showLabel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: cfg.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 120,
              }}
            >
              {label}
            </span>

            {role && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: cfg.text,
                  opacity: 0.65,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 120,
                }}
              >
                {role}
              </span>
            )}

            {isShared && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: cfg.accent,
                  background: cfg.badgeBg,
                  borderRadius: 8,
                  padding: "1px 6px",
                  alignSelf: "flex-start",
                  maxWidth: 120,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Shared with {companyNames.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
