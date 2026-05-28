export type FocusableEntityKind = "contact" | "company" | "project" | "vendor";

export interface FocusRequest {
  id: string;
  kind: FocusableEntityKind;
}

type Listener = (req: FocusRequest) => void;

const EVENT_NAME = "node-focus-bus";

// Use window events so emitFocus works across webpack chunk boundaries.
export function emitFocus(req: FocusRequest) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: req }));
}

export function subscribeFocus(listener: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    try {
      listener((e as CustomEvent<FocusRequest>).detail);
    } catch {
      /* ignore listener errors */
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
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
