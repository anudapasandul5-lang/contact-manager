"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  Clock3,
  FolderOpen,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type {
  Company,
  ContactWithRelations,
  ContactType,
  PersonRelationship,
  Project,
} from "@/lib/supabase/types";
import { RelationshipManager } from "./RelationshipManager";
import {
  buildFollowUpBuckets,
  selectNextTouchForContact,
  type MindMapFollowUp,
} from "./follow-up-helpers";

interface FollowUpNotice {
  tone: "error" | "success";
  message: string;
}

interface ContactSidePanelProps {
  contact: ContactWithRelations | null;
  contacts: ContactWithRelations[];
  directContacts: ContactWithRelations[];
  companies: Company[];
  projects: Project[];
  followUps: MindMapFollowUp[];
  relationships: PersonRelationship[];
  savingRelationship: boolean;
  isCompactViewport: boolean;
  isVisible: boolean;
  followUpPendingId: string | null;
  followUpNotice: FollowUpNotice | null;
  onCloseSelectedContact: () => void;
  onCloseRail: () => void;
  onDismissFollowUpNotice: () => void;
  onSelectContact: (contact: ContactWithRelations) => void;
  onEdit: (contact: ContactWithRelations) => void;
  onRelationshipSaved: (payload: {
    source_contact_id: string;
    target_contact_id: string;
    how_they_know_each_other: string | null;
    notes: string | null;
  }) => Promise<void>;
  onFollowUpUpdate: (
    followUp: MindMapFollowUp,
    patch: {
      objective?: string;
      notes?: string | null;
      scheduled_for?: string;
      company_id?: string | null;
      project_id?: string | null;
    },
  ) => Promise<void>;
  onFollowUpComplete: (followUp: MindMapFollowUp) => Promise<void>;
}

const typeConfig: Record<ContactType, { label: string; color: string; bg: string; border: string }> = {
  employee: { label: "Employee", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  vendor: { label: "Vendor", color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
};

const statusConfig = {
  planning: { label: "Planning", color: "#b45309", bg: "#fef3c7" },
  active: { label: "Active", color: "#15803d", bg: "#dcfce7" },
  completed: { label: "Completed", color: "#475569", bg: "#f1f5f9" },
};

const queueAccent = {
  overdue: { chipBg: "rgba(220,38,38,0.12)", chipColor: "#b91c1c", border: "rgba(220,38,38,0.16)" },
  today: { chipBg: "rgba(37,99,235,0.12)", chipColor: "#1d4ed8", border: "rgba(37,99,235,0.16)" },
  upcoming: { chipBg: "rgba(8,145,178,0.12)", chipColor: "#0f766e", border: "rgba(13,148,136,0.16)" },
};

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--clay-border)",
  background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(245,240,235,0.96))",
  color: "var(--clay-text)",
  boxShadow: "var(--clay-inset-input)",
  padding: "9px 10px",
  fontSize: 12,
};

function getInitials(name: string) {
  return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
}

function formatDueLabel(value: string) {
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(scheduledAt);
}

function formatQueueChip(value: string) {
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(scheduledAt);
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    }, {});

  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function createFollowUpDraft(contact: ContactWithRelations | null) {
  const defaultDate = new Date(Date.now() + 86_400_000);
  return {
    objective: "",
    notes: "",
    scheduledFor: toDateTimeLocalValue(defaultDate.toISOString()),
    companyId: contact?.contact_companies[0]?.companies.id ?? "",
    projectId: contact?.contact_projects[0]?.projects.id ?? "",
  };
}

function addDaysToFollowUp(value: string, days: number) {
  const scheduledAt = new Date(value);
  const baseDate = Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()
    ? new Date()
    : scheduledAt;
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function buildReferenceLabel(
  followUp: MindMapFollowUp,
  companyById: Map<string, Company>,
  projectById: Map<string, Project>,
) {
  if (followUp.project_id) {
    return projectById.get(followUp.project_id)?.name ?? "Project touchpoint";
  }

  if (followUp.company_id) {
    return companyById.get(followUp.company_id)?.name ?? "Company touchpoint";
  }

  return "General follow-up";
}

export function ContactSidePanel({
  contact,
  contacts,
  directContacts,
  companies,
  projects,
  followUps,
  relationships,
  savingRelationship,
  isCompactViewport,
  isVisible,
  followUpPendingId,
  followUpNotice,
  onCloseSelectedContact,
  onCloseRail,
  onDismissFollowUpNotice,
  onSelectContact,
  onEdit,
  onRelationshipSaved,
  onFollowUpUpdate,
  onFollowUpComplete,
}: ContactSidePanelProps) {
  const shouldRenderPanel = isCompactViewport ? isVisible : true;
  const isSelectedMode = !!contact;
  const shouldHideFloatingActions = Boolean(contact) || (isCompactViewport && isVisible);
  const contactById = useMemo(() => new Map(contacts.map((entry) => [entry.id, entry])), [contacts]);
  const companyById = useMemo(() => new Map(companies.map((entry) => [entry.id, entry])), [companies]);
  const projectById = useMemo(() => new Map(projects.map((entry) => [entry.id, entry])), [projects]);
  const queueBuckets = useMemo(() => buildFollowUpBuckets(followUps), [followUps]);
  const selectedFollowUp = useMemo(
    () => selectNextTouchForContact(followUps, contact?.id),
    [contact?.id, followUps],
  );
  const queueCount = useMemo(
    () => queueBuckets.reduce((total, bucket) => total + bucket.items.length, 0),
    [queueBuckets],
  );
  const [editDraft, setEditDraft] = useState<{
    followUpId: string;
    objective: string;
    notes: string;
    scheduledFor: string;
  } | null>(null);
  const [snoozeFollowUpId, setSnoozeFollowUpId] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<FollowUpNotice | null>(null);
  const [localPendingId, setLocalPendingId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState(() => createFollowUpDraft(contact));
  const [completionNote, setCompletionNote] = useState("");
  const [showNextDraft, setShowNextDraft] = useState(false);
  const [nextDraft, setNextDraft] = useState(() => createFollowUpDraft(contact));

  useEffect(() => {
    document.body.setAttribute("data-contact-panel-open", shouldHideFloatingActions ? "true" : "false");
    return () => {
      document.body.setAttribute("data-contact-panel-open", "false");
    };
  }, [shouldHideFloatingActions]);

  useEffect(() => {
    setCreateDraft(createFollowUpDraft(contact));
    setNextDraft(createFollowUpDraft(contact));
    setCompletionNote("");
    setShowNextDraft(false);
    setLocalPendingId(null);
    setLocalNotice(null);
  }, [contact]);

  if (!shouldRenderPanel) {
    return null;
  }

  const backdropVisible = isCompactViewport && isVisible;

  async function handleSaveEdit() {
    if (!selectedFollowUp || !editDraft || editDraft.followUpId !== selectedFollowUp.id) {
      return;
    }

    const trimmedObjective = editDraft.objective.trim();
    const nextScheduledFor = editDraft.scheduledFor ? new Date(editDraft.scheduledFor).toISOString() : "";

    if (!trimmedObjective || !nextScheduledFor || Number.isNaN(new Date(nextScheduledFor).getTime())) {
      return;
    }

    await onFollowUpUpdate(selectedFollowUp, {
      objective: trimmedObjective,
      notes: editDraft.notes.trim() ? editDraft.notes.trim() : null,
      scheduled_for: nextScheduledFor,
      company_id: selectedFollowUp.company_id,
      project_id: selectedFollowUp.project_id,
    });
    setEditDraft(null);
  }

  async function handleCreateFollowUp() {
    if (!contact) {
      return;
    }

    const objective = createDraft.objective.trim();
    const scheduledFor = createDraft.scheduledFor ? new Date(createDraft.scheduledFor).toISOString() : "";
    if (!objective || !scheduledFor || Number.isNaN(new Date(scheduledFor).getTime())) {
      setLocalNotice({ tone: "error", message: "Add an objective and schedule to create the next touch." });
      return;
    }

    setLocalPendingId("create");
    setLocalNotice(null);
    onDismissFollowUpNotice();

    try {
      const response = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contact_id: contact.id,
          company_id: createDraft.companyId || null,
          project_id: createDraft.projectId || null,
          objective,
          notes: createDraft.notes.trim() ? createDraft.notes.trim() : null,
          scheduled_for: scheduledFor,
        }),
      });

      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setLocalNotice({ tone: "error", message: result?.error ?? "Couldn't create this follow-up right now." });
        return;
      }

      setCreateDraft(createFollowUpDraft(contact));
      setLocalNotice({ tone: "success", message: "Next touch created." });
      window.dispatchEvent(new CustomEvent("contact-manager:data-changed"));
    } catch (error) {
      setLocalNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Couldn't create this follow-up right now.",
      });
    } finally {
      setLocalPendingId(null);
    }
  }

  async function handleCompleteWithNext(followUp: MindMapFollowUp) {
    if (!contact) {
      return;
    }

    const objective = nextDraft.objective.trim();
    const scheduledFor = nextDraft.scheduledFor ? new Date(nextDraft.scheduledFor).toISOString() : "";
    if (!objective || !scheduledFor || Number.isNaN(new Date(scheduledFor).getTime())) {
      setLocalNotice({ tone: "error", message: "Add an objective and schedule for the next touch before completing." });
      return;
    }

    setLocalPendingId(followUp.id);
    setLocalNotice(null);
    onDismissFollowUpNotice();

    try {
      const response = await fetch(`/api/follow-ups/${followUp.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          completion_note: completionNote.trim() ? completionNote.trim() : null,
          next: {
            contact_id: contact.id,
            company_id: nextDraft.companyId || null,
            project_id: nextDraft.projectId || null,
            objective,
            notes: nextDraft.notes.trim() ? nextDraft.notes.trim() : null,
            scheduled_for: scheduledFor,
          },
        }),
      });

      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setLocalNotice({ tone: "error", message: result?.error ?? "Couldn't complete and schedule the next touch." });
        return;
      }

      setCompletionNote("");
      setNextDraft(createFollowUpDraft(contact));
      setShowNextDraft(false);
      setLocalNotice({ tone: "success", message: "Follow-up completed and next touch scheduled." });
      window.dispatchEvent(new CustomEvent("contact-manager:data-changed"));
    } catch (error) {
      setLocalNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Couldn't complete and schedule the next touch.",
      });
    } finally {
      setLocalPendingId(null);
    }
  }

  function renderNotice() {
    const activeNotice = localNotice ?? followUpNotice;

    if (!activeNotice) {
      return null;
    }

    return (
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${activeNotice.tone === "error" ? "rgba(220,38,38,0.16)" : "rgba(22,163,74,0.16)"}`,
          background: activeNotice.tone === "error" ? "rgba(254,242,242,0.94)" : "rgba(240,253,244,0.94)",
          color: activeNotice.tone === "error" ? "#b91c1c" : "#166534",
          padding: "10px 12px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, fontSize: 12, lineHeight: 1.45 }}>{activeNotice.message}</div>
        <button
          type="button"
          onClick={() => {
            setLocalNotice(null);
            onDismissFollowUpNotice();
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Dismiss follow-up message"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  function renderSelectedFollowUp() {
    if (!contact) {
      return null;
    }

    if (!selectedFollowUp) {
      const isCreating = localPendingId === "create";
      const companyOptions = contact.contact_companies.map(({ companies: company }) => company);
      const projectOptions = contact.contact_projects.map(({ projects: project }) => project);

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(15,23,42,0.06)",
            background: "linear-gradient(155deg, rgba(255,255,255,0.94), rgba(245,240,235,0.92))",
            boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
            Next touchpoint
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--clay-text)" }}>
            No open follow-up for this contact yet.
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--clay-text-secondary)" }}>
            Create the next touch so this person appears in the queue and can move through your follow-up flow.
          </div>
          <input
            value={createDraft.objective}
            onChange={(event) => setCreateDraft((current) => ({ ...current, objective: event.target.value }))}
            placeholder="What do you want to move forward?"
            style={fieldStyle}
          />
          <textarea
            value={createDraft.notes}
            onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={3}
            placeholder="Prep notes or reminders"
            style={{
              ...fieldStyle,
              resize: "vertical",
            }}
          />
          <input
            type="datetime-local"
            value={createDraft.scheduledFor}
            onChange={(event) => setCreateDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
            style={fieldStyle}
          />
          {(companyOptions.length > 0 || projectOptions.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <select
                value={createDraft.companyId}
                onChange={(event) => setCreateDraft((current) => ({ ...current, companyId: event.target.value }))}
                style={fieldStyle}
              >
                <option value="">No company</option>
                {companyOptions.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <select
                value={createDraft.projectId}
                onChange={(event) => setCreateDraft((current) => ({ ...current, projectId: event.target.value }))}
                style={fieldStyle}
              >
                <option value="">No project</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            disabled={isCreating}
            onClick={() => void handleCreateFollowUp()}
            style={{
              borderRadius: 12,
              border: "none",
              padding: "10px 12px",
              background: isCreating ? "rgba(37,99,235,0.35)" : "#2563eb",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: isCreating ? "default" : "pointer",
            }}
          >
            {isCreating ? "Creating..." : "Create next touch"}
          </button>
        </div>
      );
    }

    const referenceLabel = buildReferenceLabel(selectedFollowUp, companyById, projectById);
    const isPending = followUpPendingId === selectedFollowUp.id || localPendingId === selectedFollowUp.id;
    const isEditingSelectedFollowUp = editDraft?.followUpId === selectedFollowUp.id;
    const isSnoozeOpen = snoozeFollowUpId === selectedFollowUp.id;
    const saveDisabled = isPending
      || !isEditingSelectedFollowUp
      || editDraft.objective.trim().length === 0
      || editDraft.scheduledFor.length === 0;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px",
          borderRadius: 20,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(241,237,231,0.94))",
          boxShadow: "0 18px 40px rgba(15,23,42,0.09)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
              Next touchpoint
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, color: "var(--clay-text)" }}>
              {selectedFollowUp.objective}
            </div>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              padding: "4px 9px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "rgba(37,99,235,0.1)",
              color: "#1d4ed8",
            }}
          >
            Open
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--clay-text-secondary)" }}>
            <CalendarClock style={{ width: 14, height: 14, color: "#64748b", flexShrink: 0 }} />
            <span>{formatDueLabel(selectedFollowUp.scheduled_for)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--clay-text-secondary)" }}>
            <FolderOpen style={{ width: 14, height: 14, color: "#64748b", flexShrink: 0 }} />
            <span>{referenceLabel}</span>
          </div>
          {selectedFollowUp.notes && (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--clay-text-secondary)" }}>
              {selectedFollowUp.notes}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void onFollowUpComplete(selectedFollowUp)}
            style={{
              borderRadius: 12,
              border: "none",
              padding: "10px 12px",
              background: isPending ? "rgba(22,163,74,0.35)" : "linear-gradient(145deg, #16a34a, #15803d)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: isPending ? "default" : "pointer",
            }}
          >
            Mark done
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setSnoozeFollowUpId((current) => current === selectedFollowUp.id ? null : selectedFollowUp.id)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(37,99,235,0.16)",
              padding: "10px 12px",
              background: "rgba(37,99,235,0.08)",
              color: "#1d4ed8",
              fontSize: 12,
              fontWeight: 700,
              cursor: isPending ? "default" : "pointer",
            }}
          >
            Snooze
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSnoozeFollowUpId(null);
              setEditDraft((current) => current?.followUpId === selectedFollowUp.id
                ? null
                : {
                    followUpId: selectedFollowUp.id,
                    objective: selectedFollowUp.objective,
                    notes: selectedFollowUp.notes ?? "",
                    scheduledFor: toDateTimeLocalValue(selectedFollowUp.scheduled_for),
                  });
            }}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.08)",
              padding: "10px 12px",
              background: "rgba(0,0,0,0.03)",
              color: "var(--clay-text)",
              fontSize: 12,
              fontWeight: 700,
              cursor: isPending ? "default" : "pointer",
            }}
          >
            Edit
          </button>
        </div>

        {isSnoozeOpen && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {[
              { label: "Tomorrow", days: 1 },
              { label: "+3 days", days: 3 },
              { label: "Next week", days: 7 },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                disabled={isPending}
                onClick={async () => {
                  await onFollowUpUpdate(selectedFollowUp, {
                    objective: selectedFollowUp.objective,
                    notes: selectedFollowUp.notes,
                    scheduled_for: addDaysToFollowUp(selectedFollowUp.scheduled_for, option.days),
                    company_id: selectedFollowUp.company_id,
                    project_id: selectedFollowUp.project_id,
                  });
                  setSnoozeFollowUpId(null);
                }}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(13,148,136,0.18)",
                  padding: "10px 8px",
                  background: "rgba(13,148,136,0.08)",
                  color: "#0f766e",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: isPending ? "default" : "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {isEditingSelectedFollowUp && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingTop: 4,
            }}
          >
            <input
              value={editDraft.objective}
              onChange={(event) => setEditDraft((current) => current ? { ...current, objective: event.target.value } : current)}
              placeholder="Objective"
              style={fieldStyle}
            />
            <textarea
              value={editDraft.notes}
              onChange={(event) => setEditDraft((current) => current ? { ...current, notes: event.target.value } : current)}
              rows={3}
              placeholder="Notes"
              style={{
                ...fieldStyle,
                resize: "vertical",
              }}
            />
            <input
              type="datetime-local"
              value={editDraft.scheduledFor}
              onChange={(event) => setEditDraft((current) => current ? { ...current, scheduledFor: event.target.value } : current)}
              style={fieldStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={saveDisabled}
                onClick={() => void handleSaveEdit()}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: "none",
                  padding: "10px 12px",
                  background: saveDisabled ? "rgba(37,99,235,0.35)" : "#2563eb",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saveDisabled ? "default" : "pointer",
                }}
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditDraft(null)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.08)",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.03)",
                  color: "var(--clay-text)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.08)",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowNextDraft((current) => !current)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.08)",
              padding: "10px 12px",
              background: "rgba(0,0,0,0.03)",
              color: "var(--clay-text)",
              fontSize: 12,
              fontWeight: 700,
              cursor: isPending ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>Completion note and next touch</span>
            <ChevronRight
              style={{
                width: 14,
                height: 14,
                transform: showNextDraft ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.18s ease",
              }}
            />
          </button>

          {showNextDraft && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "4px 0 0",
              }}
            >
              <textarea
                value={completionNote}
                onChange={(event) => setCompletionNote(event.target.value)}
                rows={2}
                placeholder="What happened on this touch?"
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                }}
              />
              <input
                value={nextDraft.objective}
                onChange={(event) => setNextDraft((current) => ({ ...current, objective: event.target.value }))}
                placeholder="Next follow-up objective"
                style={fieldStyle}
              />
              <textarea
                value={nextDraft.notes}
                onChange={(event) => setNextDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={2}
                placeholder="Optional notes for the next touch"
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                }}
              />
              <input
                type="datetime-local"
                value={nextDraft.scheduledFor}
                onChange={(event) => setNextDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
                style={fieldStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <select
                  value={nextDraft.companyId}
                  onChange={(event) => setNextDraft((current) => ({ ...current, companyId: event.target.value }))}
                  style={fieldStyle}
                >
                  <option value="">No company</option>
                  {contact.contact_companies.map(({ companies: company }) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                <select
                  value={nextDraft.projectId}
                  onChange={(event) => setNextDraft((current) => ({ ...current, projectId: event.target.value }))}
                  style={fieldStyle}
                >
                  <option value="">No project</option>
                  {contact.contact_projects.map(({ projects: project }) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => void handleCompleteWithNext(selectedFollowUp)}
                style={{
                  borderRadius: 12,
                  border: "none",
                  padding: "10px 12px",
                  background: isPending ? "rgba(22,163,74,0.35)" : "#0f766e",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isPending ? "default" : "pointer",
                }}
              >
                Done and schedule next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSelectedContactBody() {
    if (!contact) {
      return null;
    }

    return (
      <>
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--clay-border)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <EntityAvatar
            name={contact.name}
            imageUrl={contact.photo_url}
            className="rounded-full"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: typeConfig[contact.type].bg,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: typeConfig[contact.type].bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: typeConfig[contact.type].color,
                }}
              >
                {getInitials(contact.name)}
              </div>
            }
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <button
                type="button"
                onClick={onCloseSelectedContact}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Queue
              </button>
              <ChevronRight style={{ width: 12, height: 12, color: "#94a3b8" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Selected contact</span>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--clay-text)",
                lineHeight: 1.3,
              }}
            >
              {contact.name}
            </h3>
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 10,
                background: typeConfig[contact.type].bg,
                color: typeConfig[contact.type].color,
                border: `1px solid ${typeConfig[contact.type].border}`,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {typeConfig[contact.type].label}
            </span>
          </div>

          <button
            type="button"
            onClick={isCompactViewport ? onCloseRail : onCloseSelectedContact}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.1)",
              background: "linear-gradient(145deg, #ffffff, #ede9e3)",
              boxShadow: "2px 2px 6px rgba(0,0,0,0.08), -1px -1px 3px rgba(255,255,255,0.9)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--clay-text)",
            }}
            aria-label={isCompactViewport ? "Close panel" : "Back to queue"}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {renderNotice()}
          {renderSelectedFollowUp()}

          {contact.role && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Briefcase style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--clay-text)", fontWeight: 500 }}>{contact.role}</span>
            </div>
          )}

          {contact.bio && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--clay-text-secondary)", lineHeight: 1.6 }}>
              {contact.bio}
            </p>
          )}

          {(contact.email || contact.phone) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {contact.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--clay-text)" }}>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--clay-text)" }}>{contact.phone}</span>
                </div>
              )}
            </div>
          )}

          {contact.contact_companies.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Companies
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {contact.contact_companies.map(({ companies: company }) => (
                  <div
                    key={company.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <EntityAvatar
                      name={company.name}
                      imageUrl={company.logo_url}
                      className="rounded-lg"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        background: company.is_owned ? "#dbeafe" : "#ccfbf1",
                        flexShrink: 0,
                      }}
                      fallback={
                        <div
                          className="flex h-full w-full items-center justify-center rounded-lg text-[10px] font-bold"
                          style={{
                            color: company.is_owned ? "#1d4ed8" : "#0f766e",
                            background: company.is_owned ? "#dbeafe" : "#ccfbf1",
                          }}
                        >
                          {getInitials(company.name)}
                        </div>
                      }
                    />
                    <span style={{ fontSize: 12, color: "var(--clay-text)", fontWeight: 500 }}>{company.name}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: company.is_owned ? "#dbeafe" : "#ccfbf1",
                        color: company.is_owned ? "#1d4ed8" : "#0f766e",
                      }}
                    >
                      {company.is_owned ? "Owned" : "Partner"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contact.contact_projects.length > 0 && (
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Projects
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {contact.contact_projects.map(({ projects: project }) => (
                  <div
                    key={project.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <EntityAvatar
                      name={project.name}
                      imageUrl={project.logo_url}
                      className="rounded-lg"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        background: "rgba(99,102,241,0.1)",
                        flexShrink: 0,
                      }}
                      fallback={
                        <div
                          className="flex h-full w-full items-center justify-center rounded-lg"
                          style={{
                            background: "rgba(99,102,241,0.1)",
                            color: "#6366f1",
                          }}
                        >
                          <FolderOpen style={{ width: 12, height: 12 }} />
                        </div>
                      }
                    />
                    <span style={{ fontSize: 12, color: "var(--clay-text)", fontWeight: 500 }}>{project.name}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: statusConfig[project.status].bg,
                        color: statusConfig[project.status].color,
                      }}
                    >
                      {statusConfig[project.status].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RelationshipManager
            contact={contact}
            directContacts={directContacts}
            relationships={relationships}
            saving={savingRelationship}
            onSaved={onRelationshipSaved}
          />
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--clay-border)",
          }}
        >
          <button
            type="button"
            onClick={() => onEdit(contact)}
            style={{
              width: "100%",
              padding: "9px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(145deg, #6366f1, #5558e3)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
            }}
          >
            <Pencil style={{ width: 13, height: 13 }} />
            Edit Contact
          </button>
        </div>
      </>
    );
  }

  function renderIdleQueue() {
    return (
      <>
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--clay-border)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
              Hybrid rail
            </div>
            <h3
              style={{
                margin: "6px 0 0",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--clay-text)",
                lineHeight: 1.3,
              }}
            >
              Touchpoint queue
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--clay-text-secondary)", lineHeight: 1.55 }}>
              {queueCount === 0
                ? "No open follow-ups are flowing into the rail yet."
                : `${queueCount} open follow-up${queueCount === 1 ? "" : "s"} grouped by urgency.`}
            </p>
          </div>

          {isCompactViewport && (
            <button
              type="button"
              onClick={onCloseRail}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "linear-gradient(145deg, #ffffff, #ede9e3)",
                boxShadow: "2px 2px 6px rgba(0,0,0,0.08), -1px -1px 3px rgba(255,255,255,0.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--clay-text)",
              }}
              aria-label="Close queue"
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {renderNotice()}
          {queueBuckets.map((bucket) => (
            <div
              key={bucket.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "14px 14px 12px",
                borderRadius: 18,
                border: `1px solid ${queueAccent[bucket.key].border}`,
                background: "linear-gradient(155deg, rgba(255,255,255,0.96), rgba(245,240,235,0.94))",
                boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      background: queueAccent[bucket.key].chipBg,
                      color: queueAccent[bucket.key].chipColor,
                    }}
                  >
                    {bucket.key === "overdue"
                      ? <Clock3 style={{ width: 14, height: 14 }} />
                      : bucket.key === "today"
                        ? <CalendarClock style={{ width: 14, height: 14 }} />
                        : <RotateCcw style={{ width: 14, height: 14 }} />}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clay-text)" }}>{bucket.label}</div>
                    <div style={{ fontSize: 11, color: "var(--clay-text-secondary)" }}>
                      {bucket.items.length === 0 ? "Nothing waiting here." : `${bucket.items.length} queued`}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: 999,
                    background: queueAccent[bucket.key].chipBg,
                    color: queueAccent[bucket.key].chipColor,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {bucket.items.length}
                </span>
              </div>

              {bucket.items.length === 0 ? (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px dashed rgba(15,23,42,0.12)",
                    padding: "12px 12px",
                    fontSize: 12,
                    color: "var(--clay-text-secondary)",
                    lineHeight: 1.55,
                  }}
                >
                  This bucket is clear right now.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bucket.items.map((followUp) => {
                    const queueContact = contactById.get(followUp.contact_id) ?? null;
                    const referenceLabel = buildReferenceLabel(followUp, companyById, projectById);

                    return (
                      <button
                        key={followUp.id}
                        type="button"
                        disabled={!queueContact}
                        onClick={() => queueContact && onSelectContact(queueContact)}
                        style={{
                          width: "100%",
                          borderRadius: 14,
                          border: "1px solid rgba(15,23,42,0.08)",
                          background: "rgba(255,255,255,0.92)",
                          padding: "12px 12px",
                          textAlign: "left",
                          cursor: queueContact ? "pointer" : "default",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <EntityAvatar
                          name={queueContact?.name ?? "Unknown"}
                          imageUrl={queueContact?.photo_url ?? null}
                          className="rounded-full"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: queueContact ? typeConfig[queueContact.type].bg : "rgba(148,163,184,0.15)",
                            flexShrink: 0,
                          }}
                          fallback={
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                background: queueContact ? typeConfig[queueContact.type].bg : "rgba(148,163,184,0.15)",
                                color: queueContact ? typeConfig[queueContact.type].color : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {getInitials(queueContact?.name ?? "Unknown")}
                            </div>
                          }
                        />

                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--clay-text)" }}>
                              {queueContact?.name ?? "Unknown contact"}
                            </span>
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: 10,
                                fontWeight: 700,
                                color: queueAccent[bucket.key].chipColor,
                                background: queueAccent[bucket.key].chipBg,
                                padding: "3px 7px",
                                borderRadius: 999,
                              }}
                            >
                              {formatQueueChip(followUp.scheduled_for)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clay-text)", lineHeight: 1.5 }}>
                            {followUp.objective}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--clay-text-secondary)" }}>
                            {referenceLabel}
                          </div>
                          {followUp.notes && (
                            <div style={{ fontSize: 11, color: "var(--clay-text-secondary)", lineHeight: 1.5 }}>
                              {followUp.notes}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div
        onClick={backdropVisible ? (isSelectedMode ? onCloseSelectedContact : onCloseRail) : undefined}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 29,
          background: "var(--clay-overlay-bg)",
          opacity: backdropVisible ? 1 : 0,
          pointerEvents: backdropVisible ? "all" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: isCompactViewport ? 76 : 86,
          right: isCompactViewport ? 12 : 16,
          bottom: 16,
          left: isCompactViewport ? 12 : "auto",
          width: isCompactViewport ? "auto" : "min(380px, calc(100vw - 32px))",
          maxHeight: isCompactViewport ? "calc(100dvh - 92px)" : "none",
          zIndex: 45,
          pointerEvents: shouldRenderPanel ? "all" : "none",
          transform: shouldRenderPanel
            ? "translate3d(0, 0, 0)"
            : isCompactViewport
              ? "translate3d(0, calc(100% + 24px), 0)"
              : "translate3d(calc(100% + 24px), 0, 0)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
            boxShadow: isCompactViewport ? "0 -12px 36px rgba(0,0,0,0.18)" : "-8px 0 32px rgba(0,0,0,0.15)",
            border: "1px solid var(--clay-border)",
            borderRadius: 24,
            transition: "background 0.3s ease",
          }}
        />

        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {isSelectedMode ? renderSelectedContactBody() : renderIdleQueue()}
        </div>
      </div>
    </>
  );
}
