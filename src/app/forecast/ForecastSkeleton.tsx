export function ForecastSkeleton() {
  const columns = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No Date"];
  return (
    <div className="flex h-full gap-4 px-6 pb-4 pt-3 overflow-x-auto">
      {columns.map((label) => (
        <div key={label} className="flex flex-col min-w-[240px] flex-shrink-0">
          {/* Column header skeleton */}
          <div
            className="rounded-t-xl px-3 py-2.5 flex items-center justify-between"
            style={{ background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))" }}
          >
            <div className="h-4 w-20 rounded animate-pulse" style={{ background: "var(--clay-text-muted)", opacity: 0.3 }} />
            <div className="h-4 w-6 rounded animate-pulse" style={{ background: "var(--clay-text-muted)", opacity: 0.3 }} />
          </div>
          {/* Card skeletons */}
          <div
            className="flex-1 rounded-b-xl space-y-2 p-2"
            style={{ background: "var(--clay-surface)", boxShadow: "var(--clay-inset-input)" }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl p-3 animate-pulse"
                style={{
                  background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div className="flex gap-2 items-center">
                  <div className="h-4 w-4 rounded-full" style={{ background: "var(--clay-text-muted)", opacity: 0.3 }} />
                  <div className="h-3 rounded flex-1" style={{ background: "var(--clay-text-muted)", opacity: 0.3 }} />
                </div>
                <div className="mt-2 h-2.5 w-16 rounded" style={{ background: "var(--clay-text-muted)", opacity: 0.2 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
