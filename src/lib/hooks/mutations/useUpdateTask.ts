"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";

export interface UpdateTaskMutationInput {
  id: string;
  title?: string;
  notes?: string | null;
  dueDate?: Date | null;
  projectId?: string | null;
  businessId?: string | null;
  contactId?: string | null;
  recurrenceRule?: string | null;
}

export async function patchTask(input: UpdateTaskMutationInput): Promise<unknown> {
  const { id, ...fields } = input;
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // only include keys that are present in fields
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.notes !== undefined && { notes: fields.notes }),
      ...("dueDate" in fields && { dueDate: fields.dueDate?.toISOString() ?? null }),
      ...(fields.projectId !== undefined && { projectId: fields.projectId }),
      ...(fields.businessId !== undefined && { businessId: fields.businessId }),
      ...(fields.contactId !== undefined && { contactId: fields.contactId }),
      ...(fields.recurrenceRule !== undefined && { recurrenceRule: fields.recurrenceRule }),
    }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update task");
  }
  return res.json();
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchTask,
    onSuccess: () => {
      toast.success("Task updated");
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't update task.");
    },
  });
}
