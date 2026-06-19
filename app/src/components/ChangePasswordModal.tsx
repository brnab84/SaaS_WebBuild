import { useState } from "react";
import { ApiError, authApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";

/** Authenticated password change (current → new). Refreshes session tokens. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const setTokens = useAuthStore((s) => s.setTokens);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { tokens } = await authApi.changePassword(current, next);
      setTokens(tokens);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Change password</h2>
        {done ? (
          <p className="text-sm text-emerald-600">Password updated ✓</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input className={field} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <input className={field} type="password" placeholder="New password (min 8)" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {busy ? "Saving…" : "Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
