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
import { TaskModal, type EntityContext } from "@/components/shared/TaskModal";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  taskModalOpen: boolean;
  taskModalEntityContext: EntityContext | null;
  openTaskModal: (ctx?: EntityContext) => void;
  closeTaskModal: () => void;
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalEntityContext, setTaskModalEntityContext] = useState<EntityContext | null>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const openTaskModal = useCallback((ctx?: EntityContext) => {
    setTaskModalEntityContext(ctx ?? null);
    setTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false);
    setTaskModalEntityContext(null);
  }, []);

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

  useEffect(() => { setMounted(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  const value = useMemo(
    () => ({ open, setOpen, toggle, taskModalOpen, taskModalEntityContext, openTaskModal, closeTaskModal }),
    [open, toggle, taskModalOpen, taskModalEntityContext, openTaskModal, closeTaskModal],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {!disabled && mounted && (
        <>
          <CommandPaletteDialog open={open} onOpenChange={setOpen} openTaskModal={openTaskModal} />
          <TaskModal
            open={taskModalOpen}
            onOpenChange={(v) => { if (!v) closeTaskModal(); }}
            entityContext={taskModalEntityContext ?? undefined}
          />
        </>
      )}
    </CommandPaletteContext.Provider>
  );
}
