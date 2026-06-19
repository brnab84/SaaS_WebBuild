import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type {
  AdminSiteRow,
  AdminStats,
  AdminUserRow,
  AdminWorkspaceRow,
} from "@webforge/shared";
import { adminApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";

const STAT_LABELS: { key: keyof AdminStats; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "workspaces", label: "Workspaces" },
  { key: "sites", label: "Sites" },
  { key: "pages", label: "Pages" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "events", label: "Events" },
  { key: "submissions", label: "Submissions" },
];

export function AdminPage() {
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([]);
  const [sites, setSites] = useState<AdminSiteRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [s, u, w, si] = await Promise.all([
        adminApi.stats(),
        adminApi.users(),
        adminApi.workspaces(),
        adminApi.sites(),
      ]);
      setStats(s);
      setUsers(u.items);
      setWorkspaces(w.items);
      setSites(si.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Guard: only the platform owner.
  if (user && user.role !== "superadmin") return <Navigate to="/" replace />;

  async function deleteSite(s: AdminSiteRow) {
    if (window.confirm(`Delete site "${s.name}" (/${s.slug})? This removes it for the tenant.`)) {
      await adminApi.deleteSite(s.id);
      void refresh();
    }
  }

  const th = "px-4 py-2 text-left text-xs uppercase text-slate-400";
  const td = "px-4 py-2";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
              ← Sites
            </Link>
            <span className="font-bold text-slate-800">Platform admin</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
              owner
            </span>
          </div>
          <button onClick={refresh} className="text-xs font-semibold text-indigo-600 hover:underline">
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            {/* Stats */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAT_LABELS.map(({ key, label }) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-slate-800">{stats?.[key] ?? 0}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                </div>
              ))}
            </section>

            {/* Sites (with cross-tenant delete) */}
            <section>
              <h2 className="mb-2 font-semibold text-slate-800">All sites</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Site</th>
                      <th className={th}>Slug</th>
                      <th className={th}>Status</th>
                      <th className={th}>Domain</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className={`${td} font-medium text-slate-800`}>{s.name}</td>
                        <td className={td}>/{s.slug}</td>
                        <td className={td}>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className={`${td} text-slate-500`}>{s.customDomain ?? "—"}</td>
                        <td className={`${td} text-right`}>
                          <button onClick={() => deleteSite(s)} className="text-xs text-slate-400 hover:text-rose-600">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Workspaces */}
            <section>
              <h2 className="mb-2 font-semibold text-slate-800">Workspaces</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Name</th>
                      <th className={th}>Owner</th>
                      <th className={th}>Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaces.map((w) => (
                      <tr key={w.id} className="border-t border-slate-100">
                        <td className={`${td} font-medium text-slate-800`}>{w.name}</td>
                        <td className={`${td} text-slate-500`}>{w.ownerEmail ?? "—"}</td>
                        <td className={td}>{w.siteCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Users */}
            <section>
              <h2 className="mb-2 font-semibold text-slate-800">Users</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Name</th>
                      <th className={th}>Email</th>
                      <th className={th}>Plan</th>
                      <th className={th}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className={`${td} font-medium text-slate-800`}>{u.name}</td>
                        <td className={`${td} text-slate-500`}>{u.email}</td>
                        <td className={td}>{u.plan}</td>
                        <td className={td}>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.role === "superadmin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
