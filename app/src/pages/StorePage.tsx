import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OrderDTO, ProductDTO, SiteDTO } from "@webforge/shared";
import { ApiError, orderApi, productApi, siteApi, storefrontApi } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);

export function StorePage() {
  const workspace = useAuthStore((s) => s.workspace);

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [sites, setSites] = useState<SiteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-product form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    if (!workspace) return;
    setLoading(true);
    try {
      const [p, o, s] = await Promise.all([
        productApi.list(workspace.id),
        orderApi.list(workspace.id),
        siteApi.list(workspace.id),
      ]);
      setProducts(p.items);
      setOrders(o.items);
      setSites(s.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace) return;
    const cents = Math.round(parseFloat(price) * 100);
    if (!title.trim() || !Number.isFinite(cents) || cents < 0) {
      setError("Enter a title and a valid price.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await productApi.create(workspace.id, {
        title: title.trim(),
        priceCents: cents,
        currency,
        images: [],
        active: true,
      });
      setTitle("");
      setPrice("");
      void refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create product");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: ProductDTO) {
    await productApi.update(p.id, { active: !p.active });
    void refresh();
  }
  async function editPrice(p: ProductDTO) {
    const next = window.prompt(`New price for "${p.title}" (${p.currency})`, (p.priceCents / 100).toFixed(2));
    if (next == null) return;
    const cents = Math.round(parseFloat(next) * 100);
    if (Number.isFinite(cents) && cents >= 0) {
      await productApi.update(p.id, { priceCents: cents });
      void refresh();
    }
  }
  async function removeProduct(p: ProductDTO) {
    if (window.confirm(`Delete "${p.title}"?`)) {
      await productApi.remove(p.id);
      void refresh();
    }
  }
  async function testCheckout(p: ProductDTO) {
    const site = sites[0];
    if (!site) {
      setError("Create a site first — checkout is tied to a site.");
      return;
    }
    try {
      const res = await storefrontApi.checkout(site.id, {
        items: [{ productId: p.id, quantity: 1 }],
        customer: { name: "Test Buyer", email: "test@webforge.dev" },
      });
      window.open(res.checkoutUrl, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
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
            <span className="font-bold text-slate-800">Store</span>
            {workspace && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {workspace.name}
              </span>
            )}
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            Payments: mock (set PAYMENT_DRIVER for Stripe / Mercado Pago)
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Add product */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Add a product</h2>
          <form onSubmit={addProduct} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Title</span>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Signed paperback" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Price</span>
              <input className={`${inputCls} w-28`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" inputMode="decimal" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Currency</span>
              <input className={`${inputCls} w-24 uppercase`} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
            </label>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Adding…" : "Add product"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </section>

        {/* Products */}
        <section>
          <h2 className="mb-3 font-semibold text-slate-800">Products</h2>
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : products.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
              No products yet — add one above.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{p.title}</td>
                      <td className="px-4 py-2">{money(p.priceCents, p.currency)}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => toggleActive(p)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.active ? "active" : "inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button onClick={() => testCheckout(p)} className="rounded-md bg-slate-900 px-2.5 py-1 font-medium text-white hover:bg-slate-700">Test buy</button>
                          <button onClick={() => editPrice(p)} className="text-slate-500 hover:text-slate-800">Price</button>
                          <button onClick={() => removeProduct(p)} className="text-slate-400 hover:text-rose-600">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Orders */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent orders</h2>
            <button onClick={refresh} className="text-xs font-semibold text-indigo-600 hover:underline">
              Refresh
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet. Use “Test buy” and pay on the mock page.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                  <span className="text-slate-600">
                    {o.customer?.email ?? "—"} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{money(o.totalCents, o.currency)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {o.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
