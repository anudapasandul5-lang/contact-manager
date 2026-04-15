"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ContactWithRelations, PersonRelationship } from "@/lib/supabase/types";

interface RelationshipManagerProps {
  contact: ContactWithRelations;
  directContacts: ContactWithRelations[];
  relationships: PersonRelationship[];
  saving: boolean;
  onSaved: (payload: {
    source_contact_id: string;
    target_contact_id: string;
    how_they_know_each_other: string | null;
    notes: string | null;
  }) => Promise<void>;
}

function findRelationship(relationships: PersonRelationship[], leftId: string, rightId: string) {
  return (
    relationships.find(
      (relationship) =>
        (relationship.source_contact_id === leftId && relationship.target_contact_id === rightId) ||
        (relationship.source_contact_id === rightId && relationship.target_contact_id === leftId),
    ) ?? null
  );
}

export function RelationshipManager({
  contact,
  directContacts,
  relationships,
  saving,
  onSaved,
}: RelationshipManagerProps) {
  const fieldStyle: CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--clay-border)",
    background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
    color: "var(--clay-text)",
    boxShadow: "var(--clay-inset-input)",
    padding: "8px 10px",
    fontSize: 12,
  };
  const candidates = useMemo(
    () => directContacts.filter((candidate) => candidate.id !== contact.id),
    [contact.id, directContacts],
  );
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [howTheyKnow, setHowTheyKnow] = useState("");
  const [notes, setNotes] = useState("");

  const currentRelationship = useMemo(
    () => (selectedConnectorId ? findRelationship(relationships, selectedConnectorId, contact.id) : null),
    [contact.id, relationships, selectedConnectorId],
  );

  useEffect(() => {
    setSelectedConnectorId((prev) => prev || candidates[0]?.id || "");
  }, [candidates]);

  useEffect(() => {
    if (!currentRelationship) {
      setHowTheyKnow("");
      setNotes("");
      return;
    }

    setHowTheyKnow(currentRelationship.how_they_know_each_other ?? "");
    setNotes(currentRelationship.notes ?? "");
  }, [currentRelationship]);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        People links
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((candidate) => {
          const relationship = findRelationship(relationships, candidate.id, contact.id);
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setSelectedConnectorId(candidate.id)}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "8px 10px",
                background:
                  selectedConnectorId === candidate.id
                    ? "rgba(37,99,235,0.10)"
                    : "rgba(0,0,0,0.04)",
                color: "var(--clay-text)",
                fontSize: 12,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>{candidate.name}</span>
              <span style={{ fontSize: 10, color: relationship?.is_inferred ? "#c2410c" : "#475569" }}>
                {relationship ? (relationship.is_inferred ? "Suggested link" : "Saved link") : "No saved link"}
              </span>
            </button>
          );
        })}
      </div>

      {selectedConnectorId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={howTheyKnow}
            onChange={(event) => setHowTheyKnow(event.target.value)}
            rows={2}
            placeholder="How do they know each other?"
            style={{
              ...fieldStyle,
              resize: "vertical",
            }}
          />

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Why would this connector make sense?"
            style={{
              ...fieldStyle,
              resize: "vertical",
            }}
          />

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSaved({
                source_contact_id: selectedConnectorId,
                target_contact_id: contact.id,
                how_they_know_each_other: howTheyKnow.trim() || null,
                notes: notes.trim() || null,
              })
            }
            style={{
              border: "none",
              borderRadius: 12,
              padding: "9px 12px",
              background: saving ? "rgba(37,99,235,0.4)" : "#2563eb",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving link..." : currentRelationship && !currentRelationship.is_inferred ? "Update link" : "Save link"}
          </button>
        </div>
      )}
    </div>
  );
}
