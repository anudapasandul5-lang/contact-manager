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
import { validateRrule } from "@/lib/recurrence/engine";
import { cn } from "@/lib/utils";

const INBOX_SENTINEL = "__inbox__";

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
}

function TaskModalInner({ open, onOpenChange, entityContext }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [rawDate, setRawDate] = useState("");
  const [projectId, setProjectId] = useState<string>(INBOX_SENTINEL);
  const [notes, setNotes] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customRrule, setCustomRrule] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const createTask = useCreateTask();
  const { data: network } = useNetworkQuery();
  const projects = network?.projects ?? [];

  const recurrenceRule: string | null =
    selectedPreset === null ? null
    : selectedPreset === "custom"
      ? (validationError === null && customRrule.trim() ? customRrule.trim() : null)
      : selectedPreset;

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
    }
    onOpenChange(next);
  };

  const isCustomInvalid =
    selectedPreset === "custom" && (!customRrule.trim() || validationError !== null);
  const submitDisabled = !title.trim() || createTask.isPending || isCustomInvalid;

  const handleSubmit = async () => {
    if (submitDisabled || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
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

      await createTask.mutateAsync(payload);
      handleOpenChange(false);
    } catch {
      // toast already fired in useCreateTask.onError
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
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

          {entityContext?.type !== "project" && (
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? INBOX_SENTINEL)}>
              <SelectTrigger>
                <SelectValue>
                  {projectId === INBOX_SENTINEL
                    ? "None — goes to Inbox"
                    : (projects.find((p) => p.id === projectId)?.name ?? "None — goes to Inbox")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INBOX_SENTINEL}>None — goes to Inbox</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="truncate">
                    {p.name}
                  </SelectItem>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitDisabled}
          >
            {createTask.isPending ? "Adding..." : "Add task"}
          </Button>
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
