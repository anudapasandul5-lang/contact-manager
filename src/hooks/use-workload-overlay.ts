"use client"

import { useQuery } from "@tanstack/react-query"
import { computeWorkload } from "@/lib/workload/overlay"
import type { RingState } from "@/lib/workload/overlay"
import type { Task } from "@/lib/repositories/tasks"
import { queryKeys } from "@/lib/query/keys"
import type { Node } from "@xyflow/react"

// EXPORTED for testing
export function parseTask(raw: unknown): Task {
  const r = raw as Record<string, unknown>
  return {
    ...(r as unknown as Task),
    due_date:     r.due_date     ? new Date(r.due_date     as string) : null,
    defer_date:   r.defer_date   ? new Date(r.defer_date   as string) : null,
    completed_at: r.completed_at ? new Date(r.completed_at as string) : null,
    created_at:   new Date(r.created_at as string),
    updated_at:   new Date(r.updated_at as string),
  }
}

async function fetchOpenTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks?completed=false", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const raw: unknown[] = await res.json()
  return raw.map(parseTask)
}

export function useWorkloadOverlay(
  nodes: Node[],
  enabled: boolean,
): { workloadMap: Map<string, RingState>; countMap: Map<string, number> } | null {
  const { data } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.all,
    queryFn: fetchOpenTasks,
    enabled,
    staleTime: 60_000,
  })

  if (!enabled || !data) return null

  // Parse dates defensively (cache may have raw strings from other consumers)
  const tasks = data.map(parseTask)

  // Extract raw entity IDs from nodes (strip prefix from company nodes)
  const entityIds: string[] = []
  for (const node of nodes) {
    if (node.type === "contact") {
      const id = node.data.contactId as string | undefined
      if (id) entityIds.push(id)
    } else if (node.type === "company") {
      entityIds.push(node.id.replace("company-", ""))
    }
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const workloadMap = computeWorkload(tasks, entityIds, new Date(), tz)

  // Build countMap: count open tasks per entity (contact_id or company_id match)
  const countMap = new Map<string, number>()
  const entityIdSet = new Set(entityIds)
  for (const task of tasks) {
    if (task.completed_at) continue  // skip completed
    if (task.contact_id && entityIdSet.has(task.contact_id)) {
      countMap.set(task.contact_id, (countMap.get(task.contact_id) ?? 0) + 1)
    }
    if (task.company_id && entityIdSet.has(task.company_id)) {
      countMap.set(task.company_id, (countMap.get(task.company_id) ?? 0) + 1)
    }
  }

  return { workloadMap, countMap }
}
