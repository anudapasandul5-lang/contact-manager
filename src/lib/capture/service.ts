import "server-only";
import type { CreateTaskInput } from "@/lib/repositories/tasks";

export type CaptureSource = "cmd-k" | "ios-shortcut" | "right-click-graph";

export type CmdKPayload = {
  title: string;
  notes?: string;
  dueDate?: Date;
  projectId?: string;
  businessId?: string;
  contactId?: string;
  companyId?: string;
};

export type IosShortcutPayload = {
  title: string;
  notes?: string;
};

export type RightClickPayload = {
  title: string;
  entityType: "contact" | "company" | "project";
  entityId: string;
};

export type CaptureInput =
  | { source: "cmd-k"; payload: CmdKPayload }
  | { source: "ios-shortcut"; payload: IosShortcutPayload }
  | { source: "right-click-graph"; payload: RightClickPayload };

export function normalizeCapture(input: CaptureInput): CreateTaskInput {
  const { source, payload } = input;

  if (!payload.title || !payload.title.trim()) {
    throw new Error("title cannot be empty");
  }

  if (source === "cmd-k") {
    return {
      title: payload.title.trim(),
      notes: payload.notes,
      dueDate: payload.dueDate,
      projectId: payload.projectId,
      businessId: payload.businessId,
      contactId: payload.contactId,
      companyId: payload.companyId,
    };
  }

  if (source === "ios-shortcut") {
    return {
      title: payload.title.trim(),
      notes: payload.notes,
    };
  }

  if (source === "right-click-graph") {
    const { entityType, entityId } = payload;
    if (entityType === "contact") return { title: payload.title.trim(), contactId: entityId };
    if (entityType === "company") return { title: payload.title.trim(), companyId: entityId };
    if (entityType === "project") return { title: payload.title.trim(), projectId: entityId };
    throw new Error(`Unknown entityType: ${entityType as string}`);
  }

  const _exhaustive: never = source;
  throw new Error(`Unknown source: ${_exhaustive as string}`);
}
