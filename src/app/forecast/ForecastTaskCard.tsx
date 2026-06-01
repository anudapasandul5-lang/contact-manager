"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowsClockwise, Circle, CheckCircle, CalendarDots } from "@phosphor-icons/react";
import type { Task } from "@/lib/repositories/tasks";
import { DeferPopover } from "./DeferPopover";

interface ForecastTaskCardProps {
  task: Task;
  business?: { id: string; name: string; color: string };
  onComplete: (taskId: string) => void;
  onDefer: (taskId: string, newDate: string) => void;
  onOpen: (task: Task) => void;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function ForecastTaskCard({ task, business, onComplete, onDefer, onOpen }: ForecastTaskCardProps) {
  const [completing, setCompleting] = useState(false);

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    setCompleting(true);
    onComplete(task.id);
    // Auto-reset after 5s in case parent mutation fails and card stays mounted
    setTimeout(() => setCompleting(false), 5000);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(task); } }}
      className="rounded-xl p-3 group cursor-pointer"
      style={{
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        boxShadow: "var(--clay-shadow-sm)",
        border: "1px solid var(--clay-header-border)",
        opacity: completing ? 0.5 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Row 1: checkbox + title + business chip */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={handleComplete}
          className="mt-0.5 flex-shrink-0 transition-colors duration-150"
          style={{ color: completing ? "#6366f1" : "var(--clay-text-muted)" }}
          title="Mark complete"
        >
          {completing ? (
            <CheckCircle size={16} weight="fill" style={{ color: "#6366f1" }} />
          ) : (
            <Circle size={16} />
          )}
        </button>

        <span
          className="flex-1 text-sm leading-snug min-w-0 break-words"
          style={{
            color: "var(--clay-text)",
            textDecoration: completing ? "line-through" : "none",
            fontFamily: "var(--font-space-grotesk), ui-sans-serif",
          }}
        >
          {task.title}
        </span>

        {task.recurrence_rule !== null && (
          <ArrowsClockwise
            size={12}
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--clay-text-muted)" }}
            aria-label="Recurring task"
          />
        )}

        {business && (
          <span
            className="flex-shrink-0 flex items-center gap-1 text-xs rounded-full px-1.5 py-0.5"
            style={{
              background: business.color + "1a",
              color: "var(--clay-text-secondary)",
              border: `1px solid ${business.color}33`,
              fontSize: "10px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: business.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {business.name}
          </span>
        )}
      </div>

      {/* Row 2: due date (if present) */}
      {task.due_date && (
        <div className="flex items-center gap-1 mt-1.5 ml-6" onClick={(e) => e.stopPropagation()}>
          <DeferPopover
            taskId={task.id}
            currentDate={task.due_date}
            onDefer={onDefer}
          >
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--clay-text-muted)" }}
            >
              <CalendarDots size={11} />
              {formatDate(task.due_date)}
            </span>
          </DeferPopover>
        </div>
      )}
    </motion.div>
  );
}
