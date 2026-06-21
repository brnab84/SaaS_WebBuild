import { create } from "zustand";

/**
 * Promise-based replacements for window.confirm / window.prompt.
 *
 * Browsers suppress the native dialogs in many embedded/preview contexts, so we
 * render our own. Call sites stay terse — `if (await confirmDialog({...}))` /
 * `const v = await promptDialog({...})` — while a single <DialogHost/> mounted at
 * the app root does the rendering.
 */

export interface ConfirmRequest {
  kind: "confirm";
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

export interface PromptRequest {
  kind: "prompt";
  title: string;
  message?: string;
  placeholder: string;
  initialValue: string;
  confirmLabel: string;
  cancelLabel: string;
  /** When true the input is rendered as a numeric field. */
  numeric: boolean;
}

type Pending =
  | { request: ConfirmRequest; resolve: (value: boolean) => void }
  | { request: PromptRequest; resolve: (value: string | null) => void };

interface DialogState {
  pending: Pending | null;
  /** Resolve the open dialog and clear it. Used by <DialogHost/> only. */
  settle: (value: boolean | string | null) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  pending: null,
  settle: (value) => {
    const current = get().pending;
    if (!current) return;
    set({ pending: null });
    // resolve types are compatible enough at the call sites that created them.
    (current.resolve as (v: typeof value) => void)(value);
  },
}));

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  const request: ConfirmRequest = {
    kind: "confirm",
    title: opts.title,
    message: opts.message,
    confirmLabel: opts.confirmLabel ?? "Confirm",
    cancelLabel: opts.cancelLabel ?? "Cancel",
    danger: opts.danger ?? false,
  };
  return new Promise<boolean>((resolve) => {
    useDialogStore.setState({ pending: { request, resolve } });
  });
}

export function promptDialog(opts: {
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  numeric?: boolean;
}): Promise<string | null> {
  const request: PromptRequest = {
    kind: "prompt",
    title: opts.title,
    message: opts.message,
    placeholder: opts.placeholder ?? "",
    initialValue: opts.initialValue ?? "",
    confirmLabel: opts.confirmLabel ?? "OK",
    cancelLabel: opts.cancelLabel ?? "Cancel",
    numeric: opts.numeric ?? false,
  };
  return new Promise<string | null>((resolve) => {
    useDialogStore.setState({ pending: { request, resolve } });
  });
}
