"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Network, Users, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { fetchAllNetworkData } from "@/lib/db/queries";
import { queryKeys } from "@/lib/query/keys";

interface HeaderProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

const tabs = [
  { href: "/mind-map", label: "Mind Map", icon: Network },
  { href: "/contacts", label: "Contacts", icon: Users },
];

export function Header({ avatarUrl, displayName, email }: HeaderProps) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const qc = useQueryClient();
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = mounted && theme === "dark";

  const debouncedPrefetch = useMemo(
    () =>
      debounce(
        () =>
          void qc.prefetchQuery({
            queryKey: queryKeys.network.all,
            queryFn: fetchAllNetworkData,
            staleTime: 5 * 60_000,
          }),
        150,
      ),
    [qc],
  );

  useEffect(() => () => debouncedPrefetch.cancel(), [debouncedPrefetch]);

  const initials = displayName
    ? displayName.charAt(0).toUpperCase()
    : email
      ? email.charAt(0).toUpperCase()
      : "?";

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    qc.clear();
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: `linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))`,
        borderBottom: `1px solid var(--clay-header-border)`,
        boxShadow: "var(--clay-shadow-sm)",
        transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(145deg, #6366f1, #4f46e5)",
              boxShadow: "3px 3px 8px rgba(99,102,241,0.25), -1px -1px 3px rgba(255,255,255,0.15)",
            }}
          >
            <Network className="h-4 w-4 text-white" />
          </div>
          <h1
            className="text-[15px] font-bold tracking-tight"
            style={{
              color: "var(--clay-text)",
              fontFamily: "var(--font-space-grotesk), ui-sans-serif",
              transition: "color 0.3s ease",
            }}
          >
            Contact Manager
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <nav
            className="flex gap-1 rounded-xl p-1"
            style={{
              background: `linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))`,
              boxShadow: "var(--clay-inset-input)",
              transition: "background 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  )}
                  style={
                    isActive
                      ? {
                          background: `linear-gradient(145deg, var(--clay-card), var(--clay-card-end))`,
                          color: isDark ? "#a5b4fc" : "#4f46e5",
                          boxShadow: "var(--clay-shadow-sm)",
                        }
                      : { color: "var(--clay-text-muted)" }
                  }
                  onMouseEnter={debouncedPrefetch}
                  onMouseLeave={() => debouncedPrefetch.cancel()}
                >
                  <tab.icon
                    className="h-3.5 w-3.5"
                    style={{ color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : "var(--clay-text-muted)" }}
                  />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
            style={{
              background: `linear-gradient(145deg, var(--clay-card), var(--clay-card-end))`,
              boxShadow: "var(--clay-shadow-sm)",
              color: "var(--clay-text-secondary)",
            }}
            title={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Profile avatar */}
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden transition-all duration-200"
            style={{
              background: `linear-gradient(145deg, var(--clay-card), var(--clay-card-end))`,
              boxShadow: pathname.startsWith("/profile")
                ? "0 0 0 2px #6366f1"
                : "var(--clay-shadow-sm)",
            }}
            title="Profile settings"
          >
            {avatarUrl && !avatarBroken ? (
              <Image
                src={avatarUrl}
                alt={displayName ? `${displayName}'s profile` : "Your profile"}
                referrerPolicy="no-referrer"
                width={32}
                height={32}
                style={{ objectFit: "cover" }}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--clay-text-secondary)" }}>
                {initials}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="flex h-8 items-center gap-2 rounded-lg px-3 transition-all duration-200 disabled:opacity-60"
            style={{
              background: `linear-gradient(145deg, var(--clay-card), var(--clay-card-end))`,
              boxShadow: "var(--clay-shadow-sm)",
              color: "var(--clay-text-secondary)",
            }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">{isPending ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
