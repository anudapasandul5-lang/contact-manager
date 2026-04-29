"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CommandPaletteDialog } from "./CommandPaletteDialog";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  }
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const disabled = pathname === "/login";
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (disabled) return;
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable) &&
          !target.closest("[data-slot='command-input']");
        if (isEditable) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled]);

  // Close when route changes.
  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {!disabled && <CommandPaletteDialog open={open} onOpenChange={setOpen} />}
    </CommandPaletteContext.Provider>
  );
}
