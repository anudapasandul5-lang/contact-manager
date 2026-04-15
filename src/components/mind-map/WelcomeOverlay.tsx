"use client";

import { Building2, Users, FolderOpen, ArrowDown } from "lucide-react";

interface WelcomeOverlayProps {
  onAddCompany: () => void;
  onAddContact: () => void;
  onAddProject: () => void;
}

export function WelcomeOverlay({ onAddCompany, onAddContact, onAddProject }: WelcomeOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
          borderRadius: 24,
          padding: "36px 40px",
          boxShadow: "var(--clay-shadow)",
          maxWidth: 420,
          textAlign: "center" as const,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #d1fae5, #a7f3d0)",
            boxShadow:
              "inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.06), 3px 3px 8px rgba(45,212,168,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Users style={{ width: 26, height: 26, color: "#059669" }} />
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--clay-text)",
            marginBottom: 8,
            fontFamily: "var(--font-space-grotesk), ui-sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          Your network starts here
        </h2>
        <p style={{ fontSize: 13, color: "var(--clay-text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
          Add your first company to begin mapping your connections, or use the + button below.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <QuickButton icon={Building2} label="Add Company" color="#3b82f6" onClick={onAddCompany} />
          <QuickButton icon={Users} label="Add Contact" color="#22c55e" onClick={onAddContact} />
          <QuickButton icon={FolderOpen} label="Add Project" color="#7c3aed" onClick={onAddProject} />
        </div>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <ArrowDown style={{ width: 14, height: 14, color: "#94a3b8", animation: "bounce 2s infinite" }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>or use the + button</span>
        </div>
      </div>
    </div>
  );
}

function QuickButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 16px",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        color: "#ffffff",
        background: `linear-gradient(145deg, ${color}, ${color}dd)`,
        boxShadow: `3px 3px 8px ${color}30, -1px -1px 3px rgba(255,255,255,0.3)`,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = `4px 4px 12px ${color}40, -2px -2px 5px rgba(255,255,255,0.4)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `3px 3px 8px ${color}30, -1px -1px 3px rgba(255,255,255,0.3)`;
      }}
    >
      <Icon style={{ width: 14, height: 14 }} />
      {label}
    </button>
  );
}
