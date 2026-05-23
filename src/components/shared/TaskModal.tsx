"use client";

import { useRef, useState, Suspense } from "react";
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

const INBOX_SENTINEL = "__inbox__";

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
  const isSubmittingRef = useRef(false);
  const createTask = useCreateTask();
  const { data: network } = useNetworkQuery();
  const projects = network?.projects ?? [];

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("");
      setRawDate("");
      setProjectId(INBOX_SENTINEL);
      setNotes("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!title.trim() || createTask.isPending || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const payload: CreateTaskMutationInput = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate: rawDate ? new Date(rawDate) : undefined,
        projectId: projectId === INBOX_SENTINEL ? undefined : projectId,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ minHeight: 44 }}
          />

          {entityContext?.type !== "project" && (
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? INBOX_SENTINEL)}>
              <SelectTrigger>
                <SelectValue placeholder="None — goes to Inbox" />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!title.trim() || createTask.isPending}
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
