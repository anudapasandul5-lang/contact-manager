"use client";

import { useRef, type ReactNode } from "react";
import { ImagePlus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { cn } from "@/lib/utils";

interface EntityImageFieldProps {
  label: string;
  name: string;
  imageUrl?: string | null;
  fallback: ReactNode;
  shape?: "circle" | "rounded";
  disabled?: boolean;
  canRemove?: boolean;
  fileName?: string | null;
  helperText?: string;
  status?: string | null;
  error?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
}

export function EntityImageField({
  label,
  name,
  imageUrl,
  fallback,
  shape = "rounded",
  disabled = false,
  canRemove = false,
  fileName,
  helperText = "JPG, PNG, or WebP up to 5 MB. Saved privately and served with signed URLs.",
  status,
  error,
  onFileSelect,
  onRemove,
}: EntityImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasPreview = Boolean(imageUrl);

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-sm font-medium">{label}</label>

      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
        <EntityAvatar
          name={name || label}
          imageUrl={imageUrl}
          fallback={fallback}
          className={cn("shrink-0", shape === "circle" ? "rounded-full" : "rounded-2xl")}
          style={{
            width: 64,
            height: 64,
            background: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(235,235,245,0.7))",
            boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.06)",
          }}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>
              {hasPreview ? "Preview" : "No image selected"}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--clay-text-secondary)" }}>
              {fileName || helperText}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {hasPreview ? <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
              {hasPreview ? "Replace" : "Choose image"}
            </Button>
            {canRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={onRemove}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onFileSelect(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      {status && !error && (
        <p className="text-xs" style={{ color: "var(--clay-text-secondary)" }}>
          {status}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
