import { useEffect, useMemo, useState } from "react";
import { supabase, BUSINESS_ID } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { moneyCLP } from "../../utils/format";

const STATUS_FLOW = ["new", "confirmed", "shipped", "delivered"];

const STATUS_LABEL = {
  new: "Nuevo",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_META = {
  new: { icon: "🧾" },
  confirmed: { icon: "✅" },
  shipped: { icon: "🚚" },
  delivered: { icon: "📦" },
  cancelled: { icon: "⛔" },
};

const badgeClass = (status) => {
  switch (status) {
    case "new":
      return "bg-amber-400/15 text-amber-200 border border-amber-400/20";
    case "confirmed":
      return "bg-sky-400/15 text-sky-200 border border-sky-400/20";
    case "shipped":
      return "bg-violet-400/15 text-violet-200 border border-violet-400/20";
    case "delivered":
      return "bg-emerald-400/15 text-emerald-200 border border-emerald-400/20";
    case "cancelled":
      return "bg-rose-400/15 text-rose-200 border border-rose-400/20";
    default:
      return "bg-white/10 text-zinc-200 border border-white/10";
  }
};

function stepIndex(status) {
  const idx = STATUS_FLOW.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function prettyDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { icon: "ℹ️" };
  return (
    <span
      className={[
        "inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full",
        "backdrop-blur",
        badgeClass(status),
      ].join(" ")}
      title={STATUS_LABEL[status] ?? status}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span className="font-semibold">{STATUS_LABEL[status] ?? status}</span>
    </span>
  );
}

function Timeline({ status }) {
  const cancelled = status === "cancelled";
  const idx = stepIndex(status);

  return (
    <div className="mt-4">
      <div className="text-xs text-zinc-500 mb-2">Tracking</div>

      <div className="grid grid-cols-4 gap-2">
        {STATUS_FLOW.map((s, i) => {
          const done = !cancelled && i <= idx;
          return (
            <div key={s} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    cancelled ? "bg-rose-400/50" : done ? "bg-white" : "bg-white/20"
                  }`}
                />
                <div
                  className={`h-[2px] flex-1 ${
                    i === STATUS_FLOW.length - 1
                      ? "bg-transparent"
                      : cancelled
                      ? "bg-rose-400/20"
                      : done
                      ? "bg-white/50"
                      : "bg-white/10"
                  }`}
                />
              </div>
              <div className={`text-[11px] ${done ? "text-zinc-200" : "text-zinc-500"}`}>
                {STATUS_LABEL[s]}
              </div>
            </div>
          );
        })}
      </div>

      {cancelled ? (
        <div className="mt-3 text-xs text-rose-200 border border-rose-400/20 bg-rose-400/10 rounded-2xl px-3 py-2">
          ⛔ Pedido cancelado.
        </div>
      ) : null}
    </div>
  );
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [orders, setOrders] = useState([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [toast, setToast] = useState(null); // { type: "ok"|"err", msg: string }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2400);
  };

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, created_at, status, total, notes, customer_name, customer_phone, user_id,
        order_items ( id, product_name_snapshot, qty, unit_price_snapshot, line_total )
      `
      )
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      const okStatus = !statusFilter || o.status === statusFilter;
      const okTerm =
        !term ||
        o.id?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_phone?.toLowerCase().includes(term);
      return okStatus && okTerm;
    });
  }, [orders, q, statusFilter]);

  const updateStatus = async (orderId, nextStatus) => {
    // Evita update innecesario si es el mismo valor
    const current = orders.find((x) => x.id === orderId)?.status;
    if (current === nextStatus) return;

    setSavingId(orderId);
    try {
      const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
      if (error) throw error;

      // actualización local rápida
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));

      showToast("ok", `Estado actualizado a: ${STATUS_LABEL[nextStatus] ?? nextStatus}`);

      // refresco suave (por si cambió algo más en DB)
      setTimeout(() => load(), 450);
    } catch (e) {
      console.error(e);
      showToast("err", e.message ?? String(e));
      alert(e.message ?? e);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {toast ? (
        <div className="fixed top-4 right-4 z-[100]">
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
              toast.type === "ok"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/20 bg-rose-400/10 text-rose-100",
            ].join(" ")}
          >
            {toast.msg}
          </div>
        </div>
      ) : null}

      <header className="border-b border-white/10 bg-zinc-950/75 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white text-zinc-950 grid place-items-center font-black">
            SB
          </div>
          <div>
            <div className="font-extrabold tracking-tight">Admin • Pedidos</div>
            <div className="text-xs text-zinc-400">StiloBkno • Gestión de órdenes</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={load}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Actualizar
            </button>

            <a
              href="/admin/products"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Productos
            </a>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = "/admin/login";
              }}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-3xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <h2 className="text-xl font-extrabold tracking-tight">Pedidos</h2>

            <input
              className="md:ml-auto rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Buscar por ID / nombre / teléfono..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="new">Nuevo</option>
              <option value="confirmed">Confirmado</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {loading ? (
            <Loading label="Cargando pedidos..." />
          ) : filtered.length === 0 ? (
            <div className="mt-6 text-sm text-zinc-400">No hay pedidos con ese filtro.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {filtered.map((o) => (
                <div key={o.id} className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-zinc-500">ID: {o.id}</div>
                      <div className="text-xs text-zinc-400 mt-1">{prettyDate(o.created_at)}</div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={o.status} />
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-400">
                          Cliente: <span className="text-zinc-200 font-semibold">{o.customer_name ?? "—"}</span>
                        </span>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-400">
                          Tel: <span className="text-zinc-200 font-semibold">{o.customer_phone ?? "—"}</span>
                        </span>
                      </div>

                      {o.notes ? (
                        <div className="text-xs text-zinc-300 mt-3 border border-white/10 bg-white/5 rounded-2xl px-3 py-2">
                          📝 {o.notes}
                        </div>
                      ) : null}

                      <Timeline status={o.status} />

                      <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
                        {(o.order_items ?? []).map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-sm">
                            <div className="text-zinc-200">
                              {it.product_name_snapshot} <span className="text-zinc-500">x{it.qty}</span>
                            </div>
                            <div className="font-semibold text-zinc-200">${moneyCLP(it.line_total)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 lg:w-56">
                      <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-4">
                        <div className="text-xs text-zinc-400">Total</div>
                        <div className="text-2xl font-extrabold mt-1">${moneyCLP(o.total)}</div>

                        <div className="mt-4 text-xs text-zinc-400">Cambiar estado</div>
                        <select
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          disabled={savingId === o.id}
                        >
                          <option value="new">Nuevo</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="shipped">Enviado</option>
                          <option value="delivered">Entregado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>

                        {savingId === o.id ? (
                          <div className="mt-2 text-xs text-zinc-500">Guardando...</div>
                        ) : (
                          <div className="mt-2 text-xs text-zinc-500">
                            Cambiar estado → Email automático ✅
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}