import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SiteDTO } from "@webforge/shared";
import { siteApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { GenerateSiteModal } from "../components/GenerateSiteModal.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const logout = useAuthStore((s) => s.logout);

  const [sites, setSites] = useState<SiteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  async function refresh() {
    if (!workspace) return;
    setLoading(true);
    try {
      const res = await siteApi.list(workspace.id);
      setSites(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  async function createSite() {
    if (!workspace) return;
    const name = window.prompt("Name your new site");
    if (!name) return;
    setCreating(true);
    try {
      const site = await siteApi.create(workspace.id, { name });
      navigate(`/editor/${site.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function removeSite(site: SiteDTO) {
    if (!window.confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    await siteApi.remove(site.id);
    void refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              W
            </div>
            <span className="font-bold text-slate-800">WebForge</span>
            {workspace && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {workspace.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => navigate("/store")}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Store
            </button>
            <button
              onClick={() => navigate("/events")}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Events
            </button>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{user?.email}</span>
            <button onClick={logout} className="font-medium text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Your sites</h1>
          <div className="flex items-center gap-2">
            {workspace && (
              <button
                onClick={() => setShowGenerate(true)}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                ✨ Generate with AI
              </button>
            )}
            <button
              onClick={createSite}
              disabled={creating}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {creating ? "Creating…" : "+ Blank site"}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-lg font-medium text-slate-700">No sites yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Describe your business and let AI build the first draft — or start from a blank site.
            </p>
            {workspace && (
              <button
                onClick={() => setShowGenerate(true)}
                className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                ✨ Generate with AI
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h2 className="font-semibold text-slate-800">{site.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      site.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {site.status}
                  </span>
                </div>
                <p className="mb-4 truncate text-xs text-slate-400">/{site.slug}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/editor/${site.id}`)}
                    className="flex-1 rounded-lg bg-slate-900 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  {site.status === "published" && (
                    <a
                      href={`/s/${site.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => removeSite(site)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-400 hover:border-rose-300 hover:text-rose-600"
                    title="Delete site"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showGenerate && workspace && (
        <GenerateSiteModal
          workspaceId={workspace.id}
          onClose={() => setShowGenerate(false)}
          onCreated={(siteId) => navigate(`/editor/${siteId}`)}
        />
      )}
    </div>
  );
}
