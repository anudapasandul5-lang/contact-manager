import { describe, it, expect } from "vitest"
import { parseTask } from "./use-workload-overlay"
import { computeWorkload } from "@/lib/workload/overlay"

const isoString = "2025-06-01T12:00:00.000Z"

const rawTask = {
  id: "task-1",
  user_id: "user-1",
  title: "Test task",
  notes: null,
  due_date: isoString,
  defer_date: isoString,
  completed_at: null,
  created_at: isoString,
  updated_at: isoString,
  contact_id: "contact-uuid",
  company_id: null,
  business_id: null,
  project_id: null,
  parent_task_id: null,
  recurrence_rule: null,
}

describe("parseTask", () => {
  it("converts ISO date strings to Date instances", () => {
    const task = parseTask(rawTask)
    expect(task.due_date).toBeInstanceOf(Date)
    expect(task.defer_date).toBeInstanceOf(Date)
    expect(task.created_at).toBeInstanceOf(Date)
    expect(task.updated_at).toBeInstanceOf(Date)
    expect(task.completed_at).toBeNull()
  })

  it("handles null date fields without crashing", () => {
    const task = parseTask({ ...rawTask, due_date: null, defer_date: null })
    expect(task.due_date).toBeNull()
    expect(task.defer_date).toBeNull()
  })
})

describe("computeWorkload smoke test", () => {
  it("does not throw on parsed tasks", () => {
    const task = parseTask(rawTask)
    const tz = "UTC"
    expect(() =>
      computeWorkload([task], ["contact-uuid"], new Date(), tz)
    ).not.toThrow()
  })
})
