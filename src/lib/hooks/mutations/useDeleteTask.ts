"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to delete task");
  }
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't delete task.");
    },
  });
}
