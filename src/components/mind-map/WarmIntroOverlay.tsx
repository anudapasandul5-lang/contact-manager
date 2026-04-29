"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ContactWithRelations,
  IntroPathResult,
  IntroRequest,
  IntroRequestStatus,
} from "@/lib/supabase/types";

type IntroViewMode = "all" | "strong_connectors" | "recent_links" | "low_confidence_gaps";

interface WarmIntroOverlayProps {
  contacts: ContactWithRelations[];
  targetContactId: string;
  onTargetChange: (contactId: string) => void;
  result: IntroPathResult | null;
  loading: boolean;
  saving: boolean;
  viewMode: IntroViewMode;
  onViewModeChange: (mode: IntroViewMode) => void;
  onCreateRequest: (payload: {
    connector_contact_id: string;
    target_contact_id: string;
    status: IntroRequestStatus;
    message_draft: string | null;
    outcome_notes: string | null;
    requested_at: string | null;
    resolved_at: string | null;
  }) => Promise<void>;
  onUpdateRequest: (
    id: string,
    payload: {
      connector_contact_id: string;
      target_contact_id: string;
      status: IntroRequestStatus;
      message_draft: string | null;
      outcome_notes: string | null;
      requested_at: string | null;
      resolved_at: string | null;
    },
  ) => Promise<void>;
  onInspectContact: (contactId: string) => void;
}

const viewModes: { id: IntroViewMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "strong_connectors", label: "Strong Connectors" },
  { id: "recent_links", label: "Recently Confirmed" },
  { id: "low_confidence_gaps", label: "Low-Confidence Gaps" },
];

const statusLabels: Record<IntroRequestStatus, string> = {
  draft: "Draft",
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

function formatPath(result: IntroPathResult) {
  if (result.pathType === "direct") {
    return `You -> ${result.target.name}`;
  }

  if (result.connector) {
    return `You -> ${result.connector.name} -> ${result.target.name}`;
  }

  return `No trusted route to ${result.target.name}`;
}

function defaultStatus(request: IntroRequest | null, result: IntroPathResult | null): IntroRequestStatus {
  if (request) {
    return request.status;
  }

  if (result?.pathType === "warm_intro") {
    return "draft";
  }

  return "draft";
}

export function WarmIntroOverlay({
  contacts,
  targetContactId,
  onTargetChange,
  result,
  loading,
  saving,
  viewMode,
  onViewModeChange,
  onCreateRequest,
  onUpdateRequest,
  onInspectContact,
}: WarmIntroOverlayProps) {
  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [status, setStatus] = useState<IntroRequestStatus>("draft");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  useEffect(() => {
    const request = result?.existingRequest ?? null;
    let isStale = false;

    queueMicrotask(() => {
      if (isStale) {
        return;
      }

      setMessageDraft(request?.message_draft ?? "");
      setStatus(defaultStatus(request, result));
      setOutcomeNotes(request?.outcome_notes ?? "");
    });

    return () => {
      isStale = true;
    };
  }, [result]);

  async function handleSave() {
    if (!result || !result.connector) {
      return;
    }

    const payload = {
      connector_contact_id: result.connector.id,
      target_contact_id: result.target.id,
      status,
      message_draft: messageDraft.trim() || null,
      outcome_notes: outcomeNotes.trim() || null,
      requested_at: status === "requested" || status === "accepted" || status === "completed" ? new Date().toISOString() : null,
      resolved_at: status === "declined" || status === "completed" ? new Date().toISOString() : null,
    };

    if (result.existingRequest) {
      await onUpdateRequest(result.existingRequest.id, payload);
      return;
    }

    await onCreateRequest(payload);
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 16,
        zIndex: 21,
        width: 360,
        maxHeight: "calc(100% - 28px)",
        overflowY: "auto",
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        borderRadius: 24,
        boxShadow: "var(--clay-shadow)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase" }}>
            Warm Intro Search
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--clay-text)", marginTop: 4 }}>
            Find the best path to someone in your graph
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            list="warm-intro-targets"
            value={sortedContacts.find((contact) => contact.id === targetContactId)?.name ?? ""}
            onChange={(event) => {
              const next = sortedContacts.find((contact) => contact.name === event.target.value);
              onTargetChange(next?.id ?? "");
            }}
            placeholder="Choose a target contact"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid var(--clay-border)",
              background: "rgba(255,255,255,0.72)",
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--clay-text)",
              outline: "none",
            }}
          />
          <datalist id="warm-intro-targets">
            {sortedContacts.map((contact) => (
              <option key={contact.id} value={contact.name} />
            ))}
          </datalist>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {viewModes.map((mode) => {
              const active = viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onViewModeChange(mode.id)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "5px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "rgba(37,99,235,0.14)" : "rgba(0,0,0,0.05)",
                    color: active ? "#1d4ed8" : "#64748b",
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!targetContactId && (
        <div style={{ borderRadius: 18, padding: 14, background: "rgba(15,23,42,0.04)", color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>
          Pick a person already in the graph to see the strongest route, confidence level, and intro workflow.
        </div>
      )}

      {targetContactId && loading && (
        <div style={{ borderRadius: 18, padding: 14, background: "rgba(37,99,235,0.08)", color: "#1d4ed8", fontSize: 12 }}>
          Calculating best path...
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              borderRadius: 18,
              padding: 14,
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(148,163,184,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clay-text)" }}>{result.target.name}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{formatPath(result)}</div>
              </div>
              <span
                style={{
                  borderRadius: 999,
                  padding: "4px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background:
                    result.confidence === "high"
                      ? "rgba(22,163,74,0.16)"
                      : result.confidence === "medium"
                        ? "rgba(234,88,12,0.16)"
                        : "rgba(220,38,38,0.12)",
                  color:
                    result.confidence === "high"
                      ? "#15803d"
                      : result.confidence === "medium"
                        ? "#c2410c"
                        : "#b91c1c",
                }}
              >
                {result.confidence} confidence
              </span>
            </div>

            {result.connector && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onInspectContact(result.connector!.id)}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 14,
                    padding: "9px 10px",
                    background: "rgba(22,163,74,0.12)",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  View connector: {result.connector.name}
                </button>
                <button
                  type="button"
                  onClick={() => onInspectContact(result.target.id)}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 14,
                    padding: "9px 10px",
                    background: "rgba(37,99,235,0.12)",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Open target
                </button>
              </div>
            )}

            {result.warning && (
              <div
                style={{
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "rgba(234,88,12,0.10)",
                  color: "#9a3412",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {result.warning}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.rationale.map((item) => (
                <div key={item} style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {result.pathType === "warm_intro" && result.connector && (
            <div
              style={{
                borderRadius: 18,
                padding: 14,
                background: "rgba(15,23,42,0.03)",
                border: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clay-text)" }}>
                Intro workflow
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as IntroRequestStatus)}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid var(--clay-border)",
                  background: "#fff",
                  padding: "9px 10px",
                  fontSize: 12,
                }}
              >
                {(Object.keys(statusLabels) as IntroRequestStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {statusLabels[key]}
                  </option>
                ))}
              </select>

              <textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder={`Ask ${result.connector.name} for a short intro to ${result.target.name}`}
                rows={4}
                style={{
                  width: "100%",
                  resize: "vertical",
                  borderRadius: 14,
                  border: "1px solid var(--clay-border)",
                  background: "#fff",
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "var(--clay-text)",
                  outline: "none",
                }}
              />

              <textarea
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
                placeholder="Outcome notes, context, or next step"
                rows={2}
                style={{
                  width: "100%",
                  resize: "vertical",
                  borderRadius: 14,
                  border: "1px solid var(--clay-border)",
                  background: "#fff",
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "var(--clay-text)",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                style={{
                  border: "none",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: saving ? "rgba(37,99,235,0.4)" : "linear-gradient(145deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : result.existingRequest
                    ? `Update ${statusLabels[status]}`
                    : "Create intro request"}
              </button>
            </div>
          )}

          {result.pathType === "direct" && (
            <div style={{ borderRadius: 18, padding: 14, background: "rgba(22,163,74,0.10)", color: "#166534", fontSize: 12 }}>
              This person is already close enough to reach directly, so the app is not creating an intro handoff.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
