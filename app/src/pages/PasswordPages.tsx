import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, authApi } from "../lib/api.js";

const card = "w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-xl";
const field =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const wrap = "grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4";
const btn =
  "w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={wrap}>
      <div className={card}>
        <h1 className="mb-1 text-xl font-bold text-slate-800">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-slate-600">
            If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your
            inbox (and, in dev, the server logs).
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">We'll email you a link to set a new one.</p>
            <form onSubmit={submit} className="space-y-3">
              <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" disabled={busy} className={btn}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={wrap}>
      <div className={card}>
        <h1 className="mb-1 text-xl font-bold text-slate-800">Set a new password</h1>
        {!token ? (
          <p className="text-sm text-rose-600">Missing or invalid reset link.</p>
        ) : done ? (
          <p className="text-sm text-emerald-600">Password updated! Redirecting to sign in…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              className={field}
              type="password"
              placeholder="New password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={busy} className={btn}>
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
