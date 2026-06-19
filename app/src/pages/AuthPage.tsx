import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, authApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = isRegister
        ? await authApi.register({ name, email, password, workspaceName: workspaceName || undefined })
        : await authApi.login({ email, password });
      setSession(res);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white">
            W
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {isRegister ? "Create your WebForge account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500">
            {isRegister ? "Build your first site in minutes." : "Sign in to your workspace."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {isRegister && (
            <input
              className={field}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={field}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={field}
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : undefined}
          />
          {isRegister && (
            <input
              className={field}
              placeholder="Workspace name (optional)"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {isRegister ? "Already have an account? " : "New to WebForge? "}
          <a
            href={isRegister ? "/login" : "/register"}
            className="font-semibold text-indigo-600 hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </a>
        </p>
      </div>
    </div>
  );
}
