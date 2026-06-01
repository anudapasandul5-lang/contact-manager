"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Package } from "@phosphor-icons/react";
import { queryKeys } from "@/lib/query/keys";
import type { BucketedTasks, Bucket } from "@/lib/forecast/buckets";
import type { Task } from "@/lib/repositories/tasks";
import { ForecastTaskCard } from "./ForecastTaskCard";

type Business = { id: string; name: string; color: string };

interface ForecastColumnsProps {
  buckets: BucketedTasks;
  businesses: Business[];
}

const COLUMN_CONFIG: { bucket: Bucket; label: string; isOverdue?: boolean }[] = [
  { bucket: "overdue", label: "Overdue", isOverdue: true },
  { bucket: "today", label: "Today" },
  { bucket: "tomorrow", label: "Tomorrow" },
  { bucket: "thisWeek", label: "This Week" },
  { bucket: "later", label: "Later" },
  { bucket: "noDate", label: "No Date" },
];

export function ForecastColumns({ buckets, businesses }: ForecastColumnsProps) {
  const qc = useQueryClient();
  const [selectedBizIds, setSelectedBizIds] = useState<Set<string>>(new Set());

  function toggleBiz(bizId: string) {
    setSelectedBizIds((prev) => {
      const next = new Set(prev);
      if (next.has(bizId)) next.delete(bizId);
      else next.add(bizId);
      return next;
    });
  }

  function filterTasks(tasks: Task[]): Task[] {
    if (selectedBizIds.size === 0) return tasks;
    return tasks.filter(
      (t) => t.business_id === null || selectedBizIds.has(t.business_id)
    );
  }

  const handleComplete = useCallback(
    async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) {
        console.error("[ForecastColumns] complete failed", res.status);
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    [qc],
  );

  const handleDefer = useCallback(
    async (taskId: string, newDate: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDate }),
      });
      if (!res.ok) {
        console.error("[ForecastColumns] defer failed", res.status);
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    [qc],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Business filter chips */}
      <div
        className="flex gap-2 px-6 py-3 flex-wrap flex-shrink-0"
        style={{
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
          borderBottom: "1px solid var(--clay-header-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedBizIds(new Set())}
          className="text-xs font-medium rounded-full px-3 py-1 transition-all duration-150"
          style={
            selectedBizIds.size === 0
              ? { background: "#6366f1", color: "#fff" }
              : {
                  background: "var(--clay-card)",
                  color: "var(--clay-text-muted)",
                  border: "1px solid var(--clay-header-border)",
                  boxShadow: "var(--clay-shadow-sm)",
                }
          }
        >
          All
        </button>

        {businesses.map((biz) => {
          const isSelected = selectedBizIds.has(biz.id);
          return (
            <button
              key={biz.id}
              type="button"
              onClick={() => toggleBiz(biz.id)}
              className="flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-all duration-150"
              style={
                isSelected
                  ? { background: "#6366f1", color: "#fff" }
                  : {
                      background: "var(--clay-card)",
                      color: "var(--clay-text)",
                      border: "1px solid var(--clay-header-border)",
                      boxShadow: "var(--clay-shadow-sm)",
                    }
              }
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isSelected ? "#fff" : biz.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {biz.name}
            </button>
          );
        })}
      </div>

      {/* Columns */}
      <div className="flex-1 flex gap-4 px-6 pb-4 pt-3 overflow-x-auto min-h-0">
        {COLUMN_CONFIG.map(({ bucket, label, isOverdue }) => {
          const tasks = filterTasks(buckets[bucket]);
          return (
            <div key={bucket} className="flex flex-col min-w-[240px] flex-shrink-0">
              {/* Column header */}
              <div
                className="rounded-t-xl px-3 py-2.5 flex items-center justify-between flex-shrink-0"
                style={
                  isOverdue
                    ? { background: "rgba(239,68,68,0.10)" }
                    : {
                        background:
                          "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
                        boxShadow: "var(--clay-shadow-sm)",
                      }
                }
              >
                <span
                  className="text-sm font-semibold tracking-tight"
                  style={{
                    color: isOverdue ? "#dc2626" : "var(--clay-text)",
                    fontFamily: "var(--font-space-grotesk), ui-sans-serif",
                  }}
                >
                  {label}
                </span>
                <span
                  className="text-xs font-mono rounded-full px-1.5 py-0.5"
                  style={{
                    background: isOverdue
                      ? "rgba(239,68,68,0.15)"
                      : "var(--clay-surface)",
                    color: isOverdue ? "#dc2626" : "var(--clay-text-muted)",
                  }}
                >
                  {tasks.length}
                </span>
              </div>

              {/* Task list */}
              <div
                className="flex-1 overflow-y-auto rounded-b-xl space-y-2 p-2 min-h-0"
                style={{
                  background: "var(--clay-surface)",
                  boxShadow: "var(--clay-inset-input)",
                }}
              >
                {tasks.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center h-24 gap-1"
                    style={{ color: "var(--clay-text-muted)" }}
                  >
                    <Package size={20} weight="light" />
                    <span className="text-xs">No tasks</span>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {tasks.map((task) => (
                      <ForecastTaskCard
                        key={`${task.id}:${task.due_date ? task.due_date.toISOString() : "nodate"}`}
                        task={task}
                        business={businesses.find((b) => b.id === task.business_id) ?? undefined}
                        onComplete={handleComplete}
                        onDefer={handleDefer}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
