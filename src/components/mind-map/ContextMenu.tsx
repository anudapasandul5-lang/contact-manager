"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Pencil,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  FolderOpen,
  Maximize,
  RotateCcw,
  Moon,
  Minimize2,
  CheckSquare,
} from "lucide-react";

export interface ContextMenuState {
  x: number;
  y: number;
  nodeType?: "center" | "company" | "contact" | "project" | "vendor";
  nodeId?: string;
  entityId?: string;
  entityName?: string;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  // Node actions
  onEdit?: () => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
  onCollapseContacts?: () => void;
  isCompanyCollapsed?: boolean;
  // Center actions
  onToggleGravity?: () => void;
  isMapCollapsed?: boolean;
  // Canvas actions
  onAddContact?: () => void;
  onAddCompany?: () => void;
  onAddProject?: () => void;
  onFitView?: () => void;
  onResetZoom?: () => void;
  onToggleDarkMode?: () => void;
  onAddTask?: (entityType: "contact" | "company" | "project", entityId: string, entityName: string) => void;
}

interface MenuItem {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  color?: string;
  danger?: boolean;
}

export function ContextMenu({
  menu,
  onClose,
  onEdit,
  onViewDetails,
  onDelete,
  onCollapseContacts,
  isCompanyCollapsed,
  onToggleGravity,
  isMapCollapsed,
  onAddContact,
  onAddCompany,
  onAddProject,
  onFitView,
  onResetZoom,
  onToggleDarkMode,
  onAddTask,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    function closeIfOutside(target: EventTarget | null) {
      if (ref.current && target instanceof Node && !ref.current.contains(target)) {
        onClose();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      closeIfOutside(event.target);
    }

    function handleMouseUp(event: MouseEvent) {
      if (event.button === 3 || event.button === 4) {
        onClose();
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    function handleWindowChange() {
      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("blur", handleWindowChange);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("wheel", handleWindowChange, { passive: true });
    window.addEventListener("popstate", handleWindowChange);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("blur", handleWindowChange);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("wheel", handleWindowChange);
      window.removeEventListener("popstate", handleWindowChange);
    };
  }, [onClose]);

  useEffect(() => {
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Build menu items based on context
  const groups: MenuItem[][] = [];

  if (menu.nodeType === "center") {
    if (onToggleGravity) {
      groups.push([
        {
          icon: isMapCollapsed ? Maximize : Minimize2,
          label: isMapCollapsed ? "Expand All" : "Collapse All",
          onClick: () => { onToggleGravity(); onClose(); },
          color: "#f59e0b",
        },
      ]);
    }
  } else if (menu.nodeType === "contact") {
    const items: MenuItem[] = [];
    if (onViewDetails) items.push({ icon: Eye, label: "View Details", onClick: () => { onViewDetails(); onClose(); } });
    if (onEdit) items.push({ icon: Pencil, label: "Edit Contact", onClick: () => { onEdit(); onClose(); } });
    if (onAddTask && menu.entityId && menu.entityName) {
      items.push({
        icon: CheckSquare,
        label: "Add task",
        onClick: () => { onAddTask("contact", menu.entityId!, menu.entityName!); onClose(); },
      });
    }
    groups.push(items);
    if (onDelete) {
      groups.push([{ icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true }]);
    }
  } else if (menu.nodeType === "company") {
    const items: MenuItem[] = [];
    if (onViewDetails) items.push({ icon: Eye, label: "View Details", onClick: () => { onViewDetails(); onClose(); } });
    if (onEdit) items.push({ icon: Pencil, label: "Edit Company", onClick: () => { onEdit(); onClose(); } });
    if (onCollapseContacts) {
      items.push({
        icon: isCompanyCollapsed ? ChevronDown : ChevronUp,
        label: isCompanyCollapsed ? "Expand Contacts" : "Collapse Contacts",
        onClick: () => { onCollapseContacts(); onClose(); },
      });
    }
    if (onAddTask && menu.entityId && menu.entityName) {
      items.push({
        icon: CheckSquare,
        label: "Add task",
        onClick: () => { onAddTask("company", menu.entityId!, menu.entityName!); onClose(); },
      });
    }
    groups.push(items);
    if (onDelete) {
      groups.push([{ icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true }]);
    }
  } else if (menu.nodeType === "project") {
    const items: MenuItem[] = [];
    if (onViewDetails) items.push({ icon: Eye, label: "View Details", onClick: () => { onViewDetails(); onClose(); } });
    if (onEdit) items.push({ icon: Pencil, label: "Edit Project", onClick: () => { onEdit(); onClose(); } });
    if (onAddTask && menu.entityId && menu.entityName) {
      items.push({
        icon: CheckSquare,
        label: "Add task",
        onClick: () => { onAddTask("project", menu.entityId!, menu.entityName!); onClose(); },
      });
    }
    groups.push(items);
    if (onDelete) {
      groups.push([{ icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true }]);
    }
  } else if (menu.nodeType === "vendor") {
    const items: MenuItem[] = [];
    if (onEdit) items.push({ icon: Pencil, label: "Edit Vendor", onClick: () => { onEdit(); onClose(); } });
    groups.push(items);
    if (onDelete) {
      groups.push([{ icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true }]);
    }
  } else {
    // Canvas context menu
    groups.push([
      { icon: Users, label: "Add Contact", onClick: () => { onAddContact?.(); onClose(); }, color: "#22c55e" },
      { icon: Building2, label: "Add Company", onClick: () => { onAddCompany?.(); onClose(); }, color: "#3b82f6" },
      { icon: FolderOpen, label: "Add Project", onClick: () => { onAddProject?.(); onClose(); }, color: "#7c3aed" },
    ]);
    groups.push([
      { icon: Maximize, label: "Fit View", onClick: () => { onFitView?.(); onClose(); } },
      { icon: RotateCcw, label: "Reset Zoom", onClick: () => { onResetZoom?.(); onClose(); } },
    ]);
    const canvasUtilityItems: MenuItem[] = [];
    if (onToggleDarkMode) {
      canvasUtilityItems.push({ icon: Moon, label: "Toggle Dark Mode", onClick: () => { onToggleDarkMode(); onClose(); } });
    }
    if (onToggleGravity) {
      canvasUtilityItems.push({
        icon: isMapCollapsed ? Maximize : Minimize2,
        label: isMapCollapsed ? "Expand All" : "Collapse All",
        onClick: () => { onToggleGravity(); onClose(); },
      });
    }
    if (canvasUtilityItems.length > 0) {
      groups.push(canvasUtilityItems);
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 100,
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        borderRadius: 14,
        padding: "6px 0",
        boxShadow: "var(--clay-shadow)",
        minWidth: 180,
        overflow: "hidden",
      }}
    >
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div style={{ height: 1, background: "var(--clay-border)", margin: "4px 12px" }} />
          )}
          {group.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: item.danger ? "#ef4444" : "var(--clay-text-secondary)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.danger ? "rgba(239,68,68,0.06)" : "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <item.icon
                style={{
                  width: 14,
                  height: 14,
                  color: item.danger ? "#ef4444" : item.color || "#64748b",
                }}
              />
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
