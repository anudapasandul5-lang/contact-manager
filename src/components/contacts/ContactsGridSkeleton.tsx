export function ContactsGridSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-stone-200/80" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-stone-200/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl bg-stone-200/80"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}
