"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ProfileFormProps {
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
  email: string | null;
}

export function ProfileForm({ initialDisplayName, initialAvatarUrl, email }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const json = (await res.json()) as { avatar_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setAvatarUrl(json.avatar_url ?? null);
      setAvatarBroken(false);
      toast.success("Photo updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAvatar() {
    setIsDeletingAvatar(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Delete failed.");
      }
      setAvatarUrl(null);
      setAvatarBroken(false);
      toast.success("Photo removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeletingAvatar(false);
    }
  }

  async function handleSaveName() {
    setIsSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() || null }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Save failed.");
      }
      toast.success("Name saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-2xl p-8 flex flex-col gap-8"
      style={{
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
        boxShadow: "var(--clay-shadow)",
      }}
    >
      <h1
        className="text-xl font-bold tracking-tight"
        style={{ color: "var(--clay-text)", fontFamily: "var(--font-space-grotesk), ui-sans-serif" }}
      >
        Profile Settings
      </h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative" style={{ width: 96, height: 96 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(145deg, #d1fae5, #a7f3d0)",
              boxShadow:
                "inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.06), 3px 3px 8px rgba(45,212,168,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatarUrl && !avatarBroken ? (
              <img
                src={avatarUrl}
                alt="Profile"
                referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <User style={{ width: 40, height: 40, color: "#059669", strokeWidth: 2 }} />
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(145deg, #6366f1, #4f46e5)",
              boxShadow: "2px 2px 6px rgba(99,102,241,0.3)",
            }}
            title="Change photo"
          >
            {isUploadingAvatar ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            ) : (
              <Camera style={{ width: 14, height: 14, color: "white" }} />
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {avatarUrl && !avatarBroken && (
          <button
            type="button"
            onClick={handleDeleteAvatar}
            disabled={isDeletingAvatar}
            className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60"
            style={{ color: "var(--clay-text-muted)" }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            {isDeletingAvatar ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>

      {/* Display name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="display-name" className="text-sm font-medium" style={{ color: "var(--clay-text-secondary)" }}>
          Display name
        </label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          style={{ background: "var(--clay-surface)", color: "var(--clay-text)" }}
        />
        <Button
          type="button"
          onClick={handleSaveName}
          disabled={isSavingName}
          size="sm"
          className="self-end"
        >
          {isSavingName ? "Saving…" : "Save name"}
        </Button>
      </div>

      {/* Email (read-only) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--clay-text-secondary)" }}>
          Email
        </label>
        <Input
          id="email"
          value={email ?? ""}
          readOnly
          disabled
          style={{ background: "var(--clay-surface)", color: "var(--clay-text-muted)", cursor: "not-allowed" }}
        />
        <p className="text-xs" style={{ color: "var(--clay-text-muted)" }}>
          Email cannot be changed here.
        </p>
      </div>
    </div>
  );
}
