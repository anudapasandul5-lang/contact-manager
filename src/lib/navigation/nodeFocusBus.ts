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
