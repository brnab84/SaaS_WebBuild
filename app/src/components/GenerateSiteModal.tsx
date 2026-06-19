import { useState } from "react";
import { ApiError, siteApi } from "../lib/api.js";

const EXAMPLES = [
  "A cozy neighbourhood bookstore that also hosts weekly author events.",
  "A freelance UX designer's portfolio, minimalist and bold.",
  "An artisanal coffee roaster selling beans online with a subscription.",
];

export function GenerateSiteModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (siteId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (prompt.trim().length < 10) {
      setError("Describe your business in a bit more detail (10+ characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const site = await siteApi.generate(workspaceId, {
        prompt: prompt.trim(),
        name: name.trim() || undefined,
      });
      onCreated(site.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Generation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h2 className="text-lg font-bold text-slate-800">Generate a site with AI</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Describe your business and Claude will draft the structure, copy, color palette,
          typography and a logo. You can refine everything in the editor afterwards.
        </p>

        <label className="mb-1 block text-xs font-medium text-slate-500">
          Business description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPromptAndClear(e.target.value)}
          placeholder="e.g. A boutique yoga studio offering beginner classes and retreats…"
          disabled={busy}
          className="min-h-[110px] w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => setPromptAndClear(ex)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-200 disabled:opacity-60"
            >
              {ex.slice(0, 32)}…
            </button>
          ))}
        </div>

        <label className="mb-1 mt-4 block text-xs font-medium text-slate-500">
          Site name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leave blank to let AI name it"
          disabled={busy}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60"
        />

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Generating… (this can take ~30s)" : "Generate site"}
          </button>
        </div>
      </div>
    </div>
  );

  function setPromptAndClear(value: string) {
    setPrompt(value);
    if (error) setError(null);
  }
}
