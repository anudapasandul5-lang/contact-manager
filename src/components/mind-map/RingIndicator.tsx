import type { RingState } from "@/lib/workload/overlay";

type Props = { state: RingState; size: number };

const stateColors: Record<Exclude<RingState, "active" | "none">, string> = {
  rotting: "#dc2626",
  overdue: "#f97316",
  "due-today": "#f59e0b",
  "due-tomorrow": "#3b82f6",
  "due-this-week": "#7dd3fc",
};

export function RingIndicator({ state, size }: Props) {
  if (state === "none" || state === "active") {
    return null;
  }

  const color = stateColors[state];
  const radius = (size - 4) / 2;

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
      className={state === "rotting" ? "ring-pulse" : undefined}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={2}
        stroke={color}
      />
    </svg>
  );
}
