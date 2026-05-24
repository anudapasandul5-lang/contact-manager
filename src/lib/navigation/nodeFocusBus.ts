export type FocusableEntityKind = "contact" | "company" | "project" | "vendor";

export interface FocusRequest {
  id: string;
  kind: FocusableEntityKind;
}

type Listener = (req: FocusRequest) => void;

const listeners = new Set<Listener>();

export function emitFocus(req: FocusRequest) {
  listeners.forEach((fn) => {
    try {
      fn(req);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function subscribeFocus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Priority: contactId > companyId > projectId. businessId = null (no graph node).
export function resolveTaskNode(task: {
  contactId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
}): FocusRequest | null {
  if (task.contactId) return { kind: "contact", id: task.contactId };
  if (task.companyId) return { kind: "company", id: task.companyId };
  if (task.projectId) return { kind: "project", id: task.projectId };
  return null;
}

// Emitter helper — resolves FK then calls emitFocus.
export function emitTaskFocus(task: {
  contactId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
}): void {
  const req = resolveTaskNode(task);
  if (req) emitFocus(req);
}
