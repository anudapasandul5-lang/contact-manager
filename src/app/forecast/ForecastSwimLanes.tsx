"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Package } from "@phosphor-icons/react";
import { queryKeys } from "@/lib/query/keys";
import type { BucketedTasks } from "@/lib/forecast/buckets";
import type { Task } from "@/lib/repositories/tasks";
import { ForecastTaskCard } from "./ForecastTaskCard";

type Business = { id: string; name: string; color: string };

interface ForecastSwimLanesProps {
  buckets: BucketedTasks;
  businesses: Business[];
}

const SWIM_COLUMNS: { key: keyof BucketedTasks; label: string; isOverdue?: boolean }[] = [
  { key: "overdue", label: "Overdue", isOverdue: true },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisWeek", label: "This Week" },
];

const DEFAULT_COLOR = "#6b7280";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ForecastSwimLanes({ buckets, businesses }: ForecastSwimLanesProps) {
  const qc = useQueryClient();

  const handleComplete = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    if (!res.ok) {
      console.error("[ForecastSwimLanes] complete failed", res.status);
      return;
    }
    void qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
  }, [qc]);

  const handleDefer = useCallback(async (taskId: string, newDate: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: newDate }),
    });
    if (!res.ok) {
      console.error("[ForecastSwimLanes] defer failed", res.status);
      return;
    }
    void qc.invalidateQueries({ queryKey: queryKeys.forecast.all });
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
  }, [qc]);

  // Build rows: one per business + one "No Business" row
  const rows: { id: string; name: string; color: string }[] = [
    ...businesses,
    { id: "__none__", name: "No Business", color: DEFAULT_COLOR },
  ];

  function getTasksForCell(bucket: keyof BucketedTasks, rowId: string): Task[] {
    return buckets[bucket].filter((t) =>
      rowId === "__none__" ? t.business_id === null : t.business_id === rowId
    );
  }

  function getOpenCount(rowId: string): number {
    return SWIM_COLUMNS.reduce((sum, col) => sum + getTasksForCell(col.key, rowId).length, 0);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky column header row */}
      <div
        className="flex flex-shrink-0 overflow-x-auto"
        style={{
          borderBottom: "1px solid var(--clay-header-border)",
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
        }}
      >
        {/* Lane header spacer */}
        <div className="flex-shrink-0" style={{ width: 140, minWidth: 140 }} />
        {SWIM_COLUMNS.map(({ key, label, isOverdue }) => (
          <div
            key={key}
            className="flex-1 px-3 py-2 text-xs font-semibold tracking-tight text-center"
            style={{
              minWidth: 180,
              color: isOverdue ? "#dc2626" : "var(--clay-text-muted)",
              fontFamily: "var(--font-space-grotesk), ui-sans-serif",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Swimlane rows */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {rows.map((row) => {
          const hasColor = row.color !== DEFAULT_COLOR;
          const openCount = getOpenCount(row.id);
          return (
            <div
              key={row.id}
              className="flex border-b"
              style={{
                borderColor: "var(--clay-header-border)",
                background: hasColor ? hexToRgba(row.color, 0.08) : "transparent",
                minHeight: 120,
              }}
            >
              {/* Lane header cell */}
              <div
                className="flex-shrink-0 flex flex-col justify-center px-3 py-3 gap-1"
                style={{
                  width: 140,
                  minWidth: 140,
                  background: hasColor ? hexToRgba(row.color, 0.15) : "var(--clay-surface)",
                  borderRight: "1px solid var(--clay-header-border)",
                }}
              >
                <span
                  className="text-sm font-semibold leading-tight truncate"
                  style={{
                    color: "var(--clay-text)",
                    fontFamily: "var(--font-space-grotesk), ui-sans-serif",
                  }}
                >
                  {row.name}
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--clay-text-muted)" }}>
                  {openCount} open
                </span>
              </div>

              {/* Day cells */}
              {SWIM_COLUMNS.map(({ key, isOverdue }) => {
                const tasks = getTasksForCell(key, row.id);
                return (
                  <div
                    key={key}
                    className="flex-1 p-2 space-y-1.5"
                    style={{
                      minWidth: 180,
                      borderRight: "1px solid var(--clay-header-border)",
                      background: isOverdue ? "rgba(239,68,68,0.04)" : "transparent",
                    }}
                  >
                    {tasks.length === 0 ? (
                      <div
                        className="flex items-center justify-center h-full min-h-[80px]"
                        style={{ color: "var(--clay-text-muted)", opacity: 0.4 }}
                      >
                        <Package size={16} weight="light" />
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {tasks.map((task) => (
                          <ForecastTaskCard
                            key={`${task.id}:${task.due_date ? task.due_date.toISOString() : "nodate"}`}
                            task={task}
                            business={businesses.find((b) => b.id === task.business_id)}
                            onComplete={handleComplete}
                            onDefer={handleDefer}
                            onOpen={() => {}}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
