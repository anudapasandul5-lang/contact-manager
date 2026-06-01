"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNetworkQuery } from "@/lib/hooks/queries/useNetworkQuery";
import { useCreateTask, type CreateTaskMutationInput } from "@/lib/hooks/mutations/useCreateTask";
import { useUpdateTask } from "@/lib/hooks/mutations/useUpdateTask";
import { useDeleteTask } from "@/lib/hooks/mutations/useDeleteTask";
import { validateRrule } from "@/lib/recurrence/engine";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/repositories/tasks";

const INBOX_SENTINEL = "__inbox__";
const NONE_SENTINEL = "__none__";

const PRESETS = [
  { label: "Daily",    value: "RRULE:FREQ=DAILY" },
  { label: "Weekly",   value: "RRULE:FREQ=WEEKLY" },
  { label: "Biweekly", value: "RRULE:FREQ=WEEKLY;INTERVAL=2" },
  { label: "Monthly",  value: "RRULE:FREQ=MONTHLY" },
  { label: "Yearly",   value: "RRULE:FREQ=YEARLY" },
  { label: "Custom…",  value: "custom" },
] as const;

export type EntityContext = {
  type: "contact" | "company" | "project";
  id: string;
  name: string;
};

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityContext?: EntityContext;
  task?: Task;
}

function TaskModalInner({ open, onOpenChange, entityContext, task }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [rawDate, setRawDate] = useState("");
  const [projectId, setProjectId] = useState<string>(INBOX_SENTINEL);
  const [notes, setNotes] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customRrule, setCustomRrule] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>(NONE_SENTINEL);
  const [contactId, setContactId] = useState<string>(NONE_SENTINEL);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const isSubmittingRef = useRef(false);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: network } = useNetworkQuery();
  const allContacts = network?.contacts ?? [];

  // Derive company id: from entityContext or from selected business (biz-<companyId>)
  const activeCompanyId =
    entityContext?.type === "company"
      ? entityContext.id
      : businessId !== NONE_SENTINEL
        ? businessId.slice(4)
        : null;

  const contacts = activeCompanyId
    ? allContacts.filter((c) =>
        (c.contact_companies ?? []).some(
          ({ companies }: { companies: { id: string } }) => companies.id === activeCompanyId
        )
      )
    : allContacts;

  const recurrenceRule: string | null =
    selectedPreset === null ? null
    : selectedPreset === "custom"
      ? (validationError === null && customRrule.trim() ? customRrule.trim() : null)
      : selectedPreset;

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setBusinesses(Array.isArray(data) ? (data as { id: string; name: string }[]) : []))
      .catch(() => {});
  }, []);

  // Prefill state when editing an existing task
  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setRawDate(
        task.due_date != null
          ? new Date(task.due_date).toISOString().slice(0, 10)
          : ""
      );
      setProjectId(task.project_id ?? INBOX_SENTINEL);
      setBusinessId(task.business_id ?? NONE_SENTINEL);
      setContactId(task.contact_id ?? NONE_SENTINEL);

      if (task.recurrence_rule != null) {
        const matchedPreset = PRESETS.find((p) => p.value === task.recurrence_rule && p.value !== "custom");
        if (matchedPreset) {
          setSelectedPreset(matchedPreset.value);
          setCustomRrule("");
        } else {
          setSelectedPreset("custom");
          setCustomRrule(task.recurrence_rule);
        }
      } else {
        setSelectedPreset(null);
        setCustomRrule("");
      }
      setValidationError(null);
    }
  }, [task, open]);

  useEffect(() => {
    if (selectedPreset !== "custom" || !customRrule.trim()) {
      setValidationError(null);
      return;
    }
    const t = setTimeout(() => {
      const result = validateRrule(customRrule.trim());
      setValidationError(result.ok ? null : result.error);
    }, 400);
    return () => clearTimeout(t);
  }, [customRrule, selectedPreset]);

  function handleChipClick(value: string) {
    if (selectedPreset === value) {
      setSelectedPreset(null);
      setCustomRrule("");
      setValidationError(null);
    } else {
      setSelectedPreset(value);
      if (value !== "custom") {
        setCustomRrule("");
        setValidationError(null);
      }
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("");
      setRawDate("");
      setProjectId(INBOX_SENTINEL);
      setNotes("");
      setSelectedPreset(null);
      setCustomRrule("");
      setValidationError(null);
      setBusinessId(NONE_SENTINEL);
      setContactId(NONE_SENTINEL);
    }
    onOpenChange(next);
  };

  const isCustomInvalid =
    selectedPreset === "custom" && (!customRrule.trim() || validationError !== null);
  const submitDisabled =
    !title.trim() ||
    createTask.isPending ||
    updateTask.isPending ||
    isCustomInvalid;

  const handleSubmit = async () => {
    if (submitDisabled || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      if (task) {
        // Edit mode
        await updateTask.mutateAsync({
          id: task.id,
          title: title.trim(),
          notes: notes.trim() || null,
          dueDate: rawDate ? new Date(rawDate) : null,
          projectId: projectId === INBOX_SENTINEL ? null : projectId,
          businessId: businessId === NONE_SENTINEL ? null : businessId,
          contactId: contactId === NONE_SENTINEL ? null : contactId,
          recurrenceRule: recurrenceRule ?? null,
        });
        handleOpenChange(false);
      } else {
        // Create mode
        const payload: CreateTaskMutationInput = {
          title: title.trim(),
          notes: notes.trim() || undefined,
          dueDate: rawDate ? new Date(rawDate) : undefined,
          projectId: projectId === INBOX_SENTINEL ? undefined : projectId,
          recurrenceRule: recurrenceRule ?? undefined,
        };
        if (entityContext?.type === "contact") payload.contactId = entityContext.id;
        if (entityContext?.type === "company") payload.companyId = entityContext.id;
        if (entityContext?.type === "project") payload.projectId = entityContext.id;
        if (businessId !== NONE_SENTINEL) payload.businessId = businessId;
        if (contactId !== NONE_SENTINEL) payload.contactId = contactId;

        await createTask.mutateAsync(payload);
        handleOpenChange(false);
      }
    } catch {
      // toast already fired in mutation onError
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    try {
      await deleteTask.mutateAsync(task.id);
      handleOpenChange(false);
    } catch {
      // toast already fired in useDeleteTask onError
    }
  };

  const isEditMode = !!task;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit task" : "Add task"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {entityContext && (
            <div className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="truncate block">Linked to: {entityContext.name}</span>
            </div>
          )}

          <Input
            autoFocus
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
          />

          <input
            type="date"
            value={rawDate}
            onChange={(e) => setRawDate(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11"
          />


          {businesses.length > 0 && entityContext?.type !== "company" && (
            <Select value={businessId} onValueChange={(v) => { setBusinessId(v ?? NONE_SENTINEL); setContactId(NONE_SENTINEL); }}>
              <SelectTrigger>
                <SelectValue>
                  {businessId === NONE_SENTINEL
                    ? "No business"
                    : (businesses.find((b) => b.id === businessId)?.name ?? "No business")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>No business</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {contacts.length > 0 && entityContext?.type !== "contact" && (
            <Select value={contactId} onValueChange={(v) => setContactId(v ?? NONE_SENTINEL)}>
              <SelectTrigger>
                <SelectValue>
                  {contactId === NONE_SENTINEL
                    ? "No person"
                    : (contacts.find((c) => c.id === contactId)?.name ?? "No person")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>No person</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          {/* Recurrence */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Repeats</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Recurrence preset">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={selectedPreset === p.value}
                  onClick={() => handleChipClick(p.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    selectedPreset === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {selectedPreset === "custom" && (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={customRrule}
                  onChange={(e) => setCustomRrule(e.target.value)}
                  placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO"
                  aria-invalid={validationError !== null}
                  className={cn(
                    "flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-9",
                    validationError !== null ? "border-destructive" : "border-input"
                  )}
                />
                {validationError !== null && (
                  <p className="text-xs text-destructive" role="alert">
                    {validationError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEditMode && (
            <div>
              <Button
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitDisabled}
            >
              {isEditMode
                ? (updateTask.isPending ? "Saving..." : "Save changes")
                : (createTask.isPending ? "Adding..." : "Add task")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskModal(props: TaskModalProps) {
  return (
    <Suspense fallback={null}>
      <TaskModalInner {...props} />
    </Suspense>
  );
}
