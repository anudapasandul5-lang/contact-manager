export function MindMapSkeleton() {
  return (
    <div className="relative h-full w-full" style={{ background: "#f5f0eb" }}>
      {/* Center node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-20 w-20 animate-pulse rounded-full bg-stone-300/70" />
      </div>
      {/* Satellite nodes */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-12 w-12 animate-pulse rounded-full bg-stone-300/50" style={{ animationDelay: "0.1s" }} />
      </div>
      <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-stone-300/50" style={{ animationDelay: "0.2s" }} />
      </div>
      <div className="absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-stone-300/50" style={{ animationDelay: "0.3s" }} />
      </div>
      <div className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-stone-300/50" style={{ animationDelay: "0.4s" }} />
      </div>
      <div className="absolute left-1/4 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-stone-300/40" style={{ animationDelay: "0.15s" }} />
      </div>
      <div className="absolute left-3/4 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-stone-300/40" style={{ animationDelay: "0.25s" }} />
      </div>
      <div className="absolute left-3/4 top-2/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-stone-300/40" style={{ animationDelay: "0.35s" }} />
      </div>
    </div>
  );
}
