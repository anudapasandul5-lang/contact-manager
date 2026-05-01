"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-sm" style={{ color: "var(--clay-text-secondary)" }}>
        Something went wrong loading this page.
      </p>
      <button
        onClick={reset}
        className="rounded-xl px-4 py-2 text-sm font-medium"
        style={{
          background: "linear-gradient(145deg, #6366f1, #4f46e5)",
          color: "white",
          boxShadow: "2px 2px 6px rgba(99,102,241,0.25)",
        }}
      >
        Try again
      </button>
    </div>
  );
}
