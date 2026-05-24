"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Building2, CheckSquare, FolderKanban, Truck, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useNetworkQuery } from "@/lib/hooks/queries/useNetworkQuery";
import { useTasksQuery } from "@/lib/hooks/queries/useTasksQuery";
import { useCreateContact } from "@/lib/hooks/mutations/useCreateContact";
import { emitFocus, emitTaskFocus, resolveTaskNode, type FocusableEntityKind } from "@/lib/navigation/nodeFocusBus";
import type { ContactType } from "@/lib/supabase/types";
import type { EntityContext } from "@/components/shared/TaskModal";

type Mode = "browse" | "quickAdd";

interface CommandPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openTaskModal: (ctx?: EntityContext) => void;
}

export function CommandPaletteDialog({ open, onOpenChange, openTaskModal }: CommandPaletteDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("browse");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<ContactType | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const createContact = useCreateContact();

  // Clean up flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);
  const { data: network } = useNetworkQuery();
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useTasksQuery();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setMode("browse");
    setQuery("");
    setSelectedType(null);
    setSuccessFlash(null);
    onOpenChange(nextOpen);
  };

  const navigateTo = (kind: FocusableEntityKind, id: string) => {
    handleOpenChange(false);
    const targetPath = "/mind-map";
    const goNow = () => {
      requestAnimationFrame(() => emitFocus({ id, kind }));
    };
    if (pathname !== targetPath && pathname !== "/contacts") {
      router.push(targetPath);
      setTimeout(goNow, 250);
    } else if (pathname === "/contacts" && kind !== "contact") {
      router.push(targetPath);
      setTimeout(goNow, 250);
    } else {
      goNow();
    }
  };

  const contacts = network?.contacts ?? [];
  const companies = network?.companies ?? [];
  const projects = network?.projects ?? [];
  const vendors = network?.vendors ?? [];

  const submitQuickAddContact = async () => {
    const trimmed = query.trim();
    if (!trimmed || !selectedType || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await createContact.mutateAsync({ name: trimmed, type: selectedType });
      // Clear flash timer to handle rapid submits
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setSuccessFlash(`${trimmed} added ✓`);
      flashTimerRef.current = setTimeout(() => setSuccessFlash(null), 1500);
      // Stay in quickAdd mode — just clear name and type
      setQuery("");
      setSelectedType(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch {
      // toast already fired inside the hook
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const placeholder = useMemo(() => {
    if (mode === "quickAdd") return "Name for the new contact...";
    return "Search, jump to a node, or add something new...";
  }, [mode]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-[90] bg-black/15 supports-backdrop-filter:backdrop-blur-sm",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed left-1/2 top-[18vh] z-[100] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl outline-none",
            "sm:top-[18vh]",
            "max-sm:inset-x-2 max-sm:top-4 max-sm:max-w-none max-sm:translate-x-0",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search contacts, jump to nodes, or add something new.
          </DialogPrimitive.Description>
          <Command
            shouldFilter={mode === "browse"}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (mode === "quickAdd") {
                  e.preventDefault();
                  e.nativeEvent.stopImmediatePropagation();
                  setMode("browse");
                  setQuery("");
                }
              }
              if (e.key === "Enter" && mode === "quickAdd") {
                e.preventDefault();
                void submitQuickAddContact();
              }
            }}
          >
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
            />
            {mode === "browse" ? (
              <CommandList>
                <CommandEmpty>No results. Try a different keyword.</CommandEmpty>

                <CommandGroup heading="Quick actions">
                  <CommandItem value="action-add-contact quick-add new contact" onSelect={() => setMode("quickAdd")}>
                    <UserPlus />
                    <span>Add contact...</span>
                    <CommandShortcut>Enter name</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    value="action-add-task new task add task"
                    onSelect={() => {
                      handleOpenChange(false);
                      openTaskModal();
                    }}
                  >
                    <CheckSquare />
                    <span>Add task...</span>
                  </CommandItem>
                </CommandGroup>

                {contacts.length > 0 && (
                  <CommandGroup heading="Contacts">
                    {contacts.slice(0, 40).map((c) => (
                      <CommandItem
                        key={`contact-${c.id}`}
                        value={`contact ${c.name} ${c.email ?? ""} ${c.role ?? ""}`}
                        onSelect={() => navigateTo("contact", c.id)}
                      >
                        <Users />
                        <span className="truncate">{c.name}</span>
                        {c.role && (
                          <span className="ml-auto truncate text-xs text-[var(--muted-foreground)]">
                            {c.role}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {companies.length > 0 && (
                  <CommandGroup heading="Companies">
                    {companies.slice(0, 20).map((co) => (
                      <CommandItem
                        key={`company-${co.id}`}
                        value={`company ${co.name} ${co.industry ?? ""}`}
                        onSelect={() => navigateTo("company", co.id)}
                      >
                        <Building2 />
                        <span className="truncate">{co.name}</span>
                        {co.industry && (
                          <span className="ml-auto truncate text-xs text-[var(--muted-foreground)]">
                            {co.industry}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {projects.length > 0 && (
                  <CommandGroup heading="Projects">
                    {projects.slice(0, 20).map((p) => (
                      <CommandItem
                        key={`project-${p.id}`}
                        value={`project ${p.name} ${p.status ?? ""}`}
                        onSelect={() => navigateTo("project", p.id)}
                      >
                        <FolderKanban />
                        <span className="truncate">{p.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {vendors.length > 0 && (
                  <CommandGroup heading="Vendors">
                    {vendors.slice(0, 20).map((v) => (
                      <CommandItem
                        key={`vendor-${v.id}`}
                        value={`vendor ${v.name} ${v.specialty ?? ""}`}
                        onSelect={() => navigateTo("vendor", v.id)}
                      >
                        <Truck />
                        <span className="truncate">{v.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!tasksLoading && !tasksError && tasks && tasks
                  .filter((t) => !t.completed_at && resolveTaskNode({ contactId: t.contact_id, companyId: t.company_id, projectId: t.project_id }) !== null)
                  .slice(0, 8)
                  .length > 0 && (
                  <CommandGroup heading="Tasks">
                    {tasks
                      .filter((t) => !t.completed_at && resolveTaskNode({ contactId: t.contact_id, companyId: t.company_id, projectId: t.project_id }) !== null)
                      .slice(0, 8)
                      .map((t) => (
                        <CommandItem
                          key={`task-${t.id}`}
                          value={`task ${t.title}`}
                          onSelect={() => {
                            handleOpenChange(false);
                            const targetPath = "/mind-map";
                            const doFocus = () => requestAnimationFrame(() => emitTaskFocus({ contactId: t.contact_id, companyId: t.company_id, projectId: t.project_id }));
                            if (pathname !== targetPath) {
                              router.push(targetPath);
                              setTimeout(doFocus, 250);
                            } else {
                              doFocus();
                            }
                          }}
                        >
                          <CheckSquare />
                          <span className="truncate">{t.title}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            ) : (
              <>
                {/* Success flash — sibling to CommandList so cmdk doesn't treat it as a command item */}
                {successFlash && (
                  <div
                    className="px-3 py-1.5 text-xs font-medium text-green-700"
                    style={{ backgroundColor: "rgba(22,163,74,0.08)", borderBottom: "1px solid var(--border)" }}
                  >
                    {successFlash}
                  </div>
                )}
                <CommandList>
                  <CommandGroup heading="Quick add contact">
                    {/* Type picker pill row */}
                    <div className="px-3 py-2 flex flex-wrap gap-1.5">
                      {(["employee", "investor", "cofounder", "partner", "vendor"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedType(selectedType === t ? null : t)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-100"
                          style={
                            selectedType === t
                              ? { background: "#6366f1", color: "#fff", border: "1px solid #4f46e5" }
                              : { background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }
                          }
                        >
                          {t === "cofounder" ? "Co-founder" : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>

                    <CommandItem
                      value="quick-add-submit"
                      onSelect={() => void submitQuickAddContact()}
                      disabled={!query.trim() || !selectedType || createContact.isPending}
                    >
                      <UserPlus />
                      <span>
                        {createContact.isPending
                          ? "Adding..."
                          : query.trim() && selectedType
                            ? `Add "${query.trim()}" as ${selectedType === "cofounder" ? "Co-founder" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`
                            : !query.trim()
                              ? "Type a name above"
                              : "Select a type above"}
                      </span>
                      <CommandShortcut>↵</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      value="quick-add-cancel"
                      onSelect={() => {
                        setMode("browse");
                        setQuery("");
                        setSelectedType(null);
                        setSuccessFlash(null);
                      }}
                    >
                      <span>Cancel</span>
                      <CommandShortcut>Esc</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </>
            )}
          </Command>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
