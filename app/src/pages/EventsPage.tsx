import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { EventDTO, FormSubmissionDTO } from "@webforge/shared";
import { ApiError, eventApi, storefrontApi, submissionApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function EventsPage() {
  const workspace = useAuthStore((s) => s.workspace);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [subs, setSubs] = useState<FormSubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // New-event form
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    if (!workspace) return;
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        eventApi.list(workspace.id),
        submissionApi.list(workspace.id),
      ]);
      setEvents(e.items);
      setSubs(s.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace) return;
    if (!title.trim() || !startsAt) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await eventApi.create(workspace.id, {
        title: title.trim(),
        startsAt: new Date(startsAt),
        location: location.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
      });
      setTitle("");
      setStartsAt("");
      setLocation("");
      setCapacity("");
      void refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create event");
    } finally {
      setSaving(false);
    }
  }

  async function testRsvp(ev: EventDTO) {
    try {
      await storefrontApi.rsvp(ev.id, {
        name: "Test Guest",
        email: `guest-${Date.now()}@webforge.dev`,
        guests: 1,
        status: "going",
      });
      void refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "RSVP failed");
    }
  }

  async function removeEvent(ev: EventDTO) {
    if (window.confirm(`Delete event "${ev.title}"?`)) {
      await eventApi.remove(ev.id);
      void refresh();
    }
  }

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
              ← Sites
            </Link>
            <span className="font-bold text-slate-800">Events</span>
            {workspace && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {workspace.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Create event */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Create an event</h2>
          <form onSubmit={addEvent} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Title</span>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Launch party" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Date &amp; time</span>
              <input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Location</span>
              <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="HQ rooftop" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Capacity</span>
              <input className={`${inputCls} w-24`} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="∞" inputMode="numeric" />
            </label>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create event"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </section>

        {/* Events */}
        <section>
          <h2 className="mb-3 font-semibold text-slate-800">Upcoming events</h2>
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
              No events yet — create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{ev.title}</h3>
                      <p className="text-sm text-slate-500">
                        {fmtDate(ev.startsAt)}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{ev.goingCount}</span> going
                        {ev.capacity != null ? ` · ${ev.spotsLeft} spot(s) left of ${ev.capacity}` : " · unlimited"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={() => testRsvp(ev)} className="rounded-md bg-slate-900 px-2.5 py-1 font-medium text-white hover:bg-slate-700">
                        Test RSVP
                      </button>
                      <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)} className="text-slate-500 hover:text-slate-800">
                        {expanded === ev.id ? "Hide" : `RSVPs (${ev.rsvps.length})`}
                      </button>
                      <button onClick={() => removeEvent(ev)} className="text-slate-400 hover:text-rose-600">
                        Delete
                      </button>
                    </div>
                  </div>
                  {expanded === ev.id && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {ev.rsvps.length === 0 ? (
                        <p className="text-sm text-slate-400">No RSVPs yet.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {ev.rsvps.map((r, i) => (
                            <li key={i} className="flex items-center justify-between">
                              <span className="text-slate-600">{r.name} · {r.email}</span>
                              <span className="text-xs text-slate-500">
                                {r.guests} guest(s) · <span className={r.status === "going" ? "text-emerald-600" : "text-slate-400"}>{r.status}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Form submissions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Form submissions</h2>
            <button onClick={refresh} className="text-xs font-semibold text-indigo-600 hover:underline">
              Refresh
            </button>
          </div>
          {subs.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{s.name ?? s.email ?? "Anonymous"}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{s.formName}</span>
                  </div>
                  {s.message && <p className="mt-1 text-slate-600">{s.message}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
