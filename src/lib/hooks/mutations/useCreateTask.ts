"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";

export interface CreateTaskMutationInput {
  title: string;
  notes?: string;
  dueDate?: Date;
  projectId?: string;
  businessId?: string;
  contactId?: string;
  companyId?: string;
}

async function postTask(input: CreateTaskMutationInput): Promise<{ id: string }> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      notes: input.notes ?? null,
      dueDate: input.dueDate?.toISOString() ?? null,
      projectId: input.projectId ?? null,
      businessId: input.businessId ?? null,
      contactId: input.contactId ?? null,
      companyId: input.companyId ?? null,
    }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to create task");
  }
  return res.json() as Promise<{ id: string }>;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postTask,
    onSuccess: () => {
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save task.");
    },
  });
}
