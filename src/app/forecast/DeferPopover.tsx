"use client";

import { useRef, useState, useEffect } from "react";

interface DeferPopoverProps {
  taskId: string;
  currentDate?: Date | null;
  onDefer: (taskId: string, newDate: string) => void;
  children: React.ReactNode;
}

export function DeferPopover({ taskId, currentDate, onDefer, children }: DeferPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const currentValue = currentDate
    ? currentDate.toISOString().split("T")[0]
    : today;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{ cursor: "pointer" }}
      >
        {children}
      </span>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            background: "var(--clay-card)",
            border: "1px solid var(--clay-header-border)",
            borderRadius: "0.75rem",
            padding: "0.5rem",
            boxShadow: "var(--clay-shadow-sm)",
          }}
        >
          <input
            type="date"
            min={today}
            defaultValue={currentValue}
            onChange={(e) => {
              if (e.target.value) {
                onDefer(taskId, e.target.value);
                setOpen(false);
              }
            }}
            style={{
              background: "var(--clay-surface)",
              border: "1px solid var(--clay-header-border)",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.5rem",
              fontSize: "0.875rem",
              color: "var(--clay-text)",
              outline: "none",
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
