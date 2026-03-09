import { useEffect, useMemo, useRef, useState } from "react";
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
        badgeClass(status),
      ].join(" ")}
    >
      <span>{meta.icon}</span>
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

      {cancelled && (
        <div className="mt-3 text-xs text-rose-200 border border-rose-400/20 bg-rose-400/10 rounded-2xl px-3 py-2">
          ⛔ Pedido cancelado.
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [livePulse, setLivePulse] = useState(false);

  const reloadTimeoutRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  const pulseLive = () => {
    setLivePulse(true);
    window.clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = window.setTimeout(() => setLivePulse(false), 1400);
  };

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, created_at, status, total, notes, customer_name, customer_phone,
        order_items ( id, product_name_snapshot, variant_snapshot, qty, unit_price_snapshot, line_total )
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

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-${BUSINESS_ID}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        pulseLive();
        window.clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = setTimeout(load, 300);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        pulseLive();
        window.clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = setTimeout(load, 300);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.clearTimeout(reloadTimeoutRef.current);
      window.clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();

    return orders.filter((o) => {
      const okStatus = !statusFilter || o.status === statusFilter;

      const okTerm =
        !term ||
        o.id.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_phone?.toLowerCase().includes(term);

      return okStatus && okTerm;
    });
  }, [orders, q, statusFilter]);

  const updateStatus = async (orderId, status) => {
    setSavingId(orderId);

    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);

    if (error) {
      alert(error.message);
      setSavingId(null);
      return;
    }

    await load();
    setSavingId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
            <div
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                livePulse
                  ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {livePulse ? "Actualizado en vivo" : "Realtime activo"}
            </div>

            <button
              onClick={() => load()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Actualizar
            </button>

            <a
              href="/admin/dashboard"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Dashboard
            </a>

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
              className="md:ml-auto rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm"
              placeholder="Buscar pedido..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm"
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
          ) : (
            <div className="mt-5 space-y-3">
              {filtered.map((o) => (
                <div key={o.id} className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-zinc-500">ID: {o.id}</div>
                      <div className="text-xs text-zinc-400">{prettyDate(o.created_at)}</div>

                      <div className="mt-3 flex items-center gap-2">
                        <StatusBadge status={o.status} />
                      </div>

                      <Timeline status={o.status} />

                      <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
                        {(o.order_items ?? []).map((it) => (
                          <div
                            key={it.id}
                            className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 flex justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-zinc-200 truncate">{it.product_name_snapshot}</div>

                              {it.variant_snapshot ? (
                                <div className="text-xs text-zinc-400 mt-1">{it.variant_snapshot}</div>
                              ) : null}

                              <div className="text-xs text-zinc-500 mt-1">
                                x{it.qty} • ${moneyCLP(it.unit_price_snapshot)}
                              </div>
                            </div>

                            <div className="font-semibold whitespace-nowrap">
                              ${moneyCLP(it.line_total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:w-52">
                      <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-4">
                        <div className="text-xs text-zinc-400">Total</div>
                        <div className="text-2xl font-extrabold">${moneyCLP(o.total)}</div>

                        <div className="mt-4 text-xs text-zinc-400">Cambiar estado</div>

                        <select
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm"
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
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 ? (
                <div className="text-sm text-zinc-400">No hay pedidos con ese filtro.</div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}