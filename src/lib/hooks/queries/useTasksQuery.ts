"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { Task } from "@/lib/repositories/tasks";

async function fetchOpenTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks?completed=false", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useTasksQuery() {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.all,
    queryFn: fetchOpenTasks,
    staleTime: 5 * 60_000,
  });
}
