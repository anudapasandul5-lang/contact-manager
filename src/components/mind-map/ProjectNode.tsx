"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronUp, FolderKanban } from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type { ProjectStatus } from "@/lib/supabase/types";

const statusConfig: Record<ProjectStatus, { accent: string; dot: string; badge: string }> = {
  planning:  { accent: "#d97706", dot: "#fbbf24", badge: "rgba(217,119,6,0.1)" },
  active:    { accent: "#059669", dot: "#34d399", badge: "rgba(5,150,105,0.1)" },
  completed: { accent: "#64748b", dot: "#94a3b8", badge: "rgba(100,116,139,0.1)" },
};

interface ProjectNodeData {
  label: string;
  logoUrl?: string | null;
  status: ProjectStatus;
  isCollapsed?: boolean;
  hiddenCount?: number;
  onCollapse?: () => void;
  isStandaloneContainer?: boolean;
  isFocusAnchor?: boolean;
  isQuiet?: boolean;
  showLabel?: boolean;
  isNeighborhoodActive?: boolean;
  isNeighborhoodDimmed?: boolean;
  [key: string]: unknown;
}

export function ProjectNode({ data }: NodeProps) {
  const {
    label,
    logoUrl,
    status,
    isCollapsed = false,
    hiddenCount = 0,
    onCollapse,
    isStandaloneContainer = false,
    isFocusAnchor = false,
    isQuiet = false,
    showLabel = true,
    isNeighborhoodActive = false,
    isNeighborhoodDimmed = false,
  } = data as ProjectNodeData;
  const cfg = statusConfig[status];
  const animScale = typeof data._animScale === "number" ? data._animScale : 1;

  return (
    <div style={{
      transform: `scale(${animScale})`,
      transformOrigin: "center",
    }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        borderRadius: 18,
        padding: "11px 18px 11px 11px",
        boxShadow: isFocusAnchor
          ? "0 0 0 4px rgba(100,116,139,0.12), var(--clay-shadow)"
          : "var(--clay-shadow)",
        border: isFocusAnchor ? "1px solid rgba(100,116,139,0.35)" : "1px solid rgba(255,255,255,0.12)",
        minWidth: showLabel ? 155 : 52,
        cursor: "pointer",
        transition: "box-shadow 0.3s ease, transform 0.2s ease, min-width 0.2s ease, filter 0.2s ease",
        filter: isNeighborhoodDimmed ? "saturate(0.72)" : undefined,
        opacity: isQuiet && !isNeighborhoodActive ? 0.9 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />

      {/* Icon container */}
      <EntityAvatar
        name={label}
        imageUrl={logoUrl}
        className="rounded-[11px]"
        imageFit="contain"
        imageInset={4}
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))",
          boxShadow: "var(--clay-inset)",
          flexShrink: 0,
        }}
        imageFrameStyle={{
          width: "100%",
          height: "100%",
          borderRadius: 11,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.78), inset -1px -1px 2px rgba(0,0,0,0.08)",
        }}
        fallback={
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 11,
              background: "linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))",
              boxShadow: "var(--clay-inset)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderKanban style={{ width: 16, height: 16, color: "var(--clay-text-secondary)", strokeWidth: 2 }} />
          </div>
        }
      />

      {showLabel && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--clay-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
            }}
          >
            {label}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: cfg.badge,
              borderRadius: 8,
              padding: "1px 7px 1px 5px",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cfg.dot,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 9, fontWeight: 600, color: cfg.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {status}
            </span>
          </div>
          {hiddenCount > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 1,
                borderRadius: 999,
                padding: "2px 8px",
                alignSelf: "flex-start",
                background: isCollapsed ? "rgba(15,23,42,0.1)" : "rgba(15,23,42,0.06)",
                color: "var(--clay-text-secondary)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: cfg.dot,
                  flexShrink: 0,
                }}
              />
              +{hiddenCount} tucked
            </div>
          )}
        </div>
      )}

      {isStandaloneContainer && onCollapse && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCollapse();
          }}
          aria-label={isCollapsed ? "Expand project members" : "Collapse project members"}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(255,255,255,0.65)",
            color: "var(--clay-text-secondary)",
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
