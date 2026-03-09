import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import { moneyCLP } from "../utils/format";

const STATUS_FLOW = ["new", "confirmed", "shipped", "delivered"];

const STATUS_LABEL = {
  new: "Nuevo",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_META = {
  new: { icon: "🧾", tone: "amber" },
  confirmed: { icon: "✅", tone: "sky" },
  shipped: { icon: "🚚", tone: "violet" },
  delivered: { icon: "📦", tone: "emerald" },
  cancelled: { icon: "⛔", tone: "rose" },
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
  const meta = STATUS_META[status] ?? { icon: "ℹ️", tone: "zinc" };

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
  const currentLabel = STATUS_LABEL[status] ?? status;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">Tracking</div>

        <div
          className={[
            "text-[11px] px-3 py-1 rounded-full border",
            cancelled
              ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
              : "border-white/10 bg-white/5 text-zinc-200",
          ].join(" ")}
        >
          Estado actual: <span className="font-semibold">{currentLabel}</span>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
        <div className="grid grid-cols-4 gap-3">
          {STATUS_FLOW.map((s, i) => {
            const done = !cancelled && i <= idx;
            const isCurrent = !cancelled && i === idx;

            return (
              <div key={s} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "h-3.5 w-3.5 rounded-full border",
                      cancelled
                        ? "bg-rose-400/30 border-rose-400/30"
                        : done
                        ? "bg-white border-white/60"
                        : "bg-white/10 border-white/10",
                      isCurrent ? "ring-4 ring-white/10" : "",
                    ].join(" ")}
                  />
                  <div
                    className={[
                      "h-[2px] flex-1",
                      i === STATUS_FLOW.length - 1
                        ? "bg-transparent"
                        : cancelled
                        ? "bg-rose-400/20"
                        : done
                        ? "bg-white/40"
                        : "bg-white/10",
                    ].join(" ")}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className={done ? "text-zinc-200" : "text-zinc-500"}>
                    <span className="text-[11px]">{STATUS_LABEL[s]}</span>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-zinc-950 font-extrabold">
                      AHORA
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {cancelled ? (
          <div className="mt-4 text-xs text-rose-200 border border-rose-400/20 bg-rose-400/10 rounded-2xl px-3 py-2">
            ⛔ Este pedido fue cancelado.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MyOrders() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user ?? null;
      setUser(u);

      if (!u) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, total, status, created_at, notes,
          order_items ( id, product_name_snapshot, variant_snapshot, qty, unit_price_snapshot, line_total )
        `
        )
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  const countByStatus = useMemo(() => {
    const map = {};
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [orders]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Mis pedidos" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Mis pedidos</h1>
              <p className="text-sm text-zinc-400 mt-1">Revisa el estado y el detalle de tus compras.</p>
            </div>

            {orders.length > 0 ? (
              <div className="md:ml-auto flex flex-wrap gap-2">
                {Object.entries(countByStatus).map(([s, n]) => (
                  <span key={s} className={`text-xs px-3 py-1.5 rounded-full ${badgeClass(s)}`}>
                    {STATUS_LABEL[s] ?? s}: <span className="font-semibold">{n}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {loading ? (
            <Loading label="Cargando pedidos..." />
          ) : !user ? (
            <div className="mt-6 text-sm text-zinc-300">
              Debes iniciar sesión.{" "}
              <a className="underline text-zinc-200" href="/auth">
                Ir a login
              </a>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 text-sm text-zinc-300">
              Aún no tienes pedidos.{" "}
              <a className="underline text-zinc-200" href="/catalog">
                Ir al catálogo
              </a>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={o.status} />
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-400">{prettyDate(o.created_at)}</span>
                      </div>

                      <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-6">
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">ID</div>
                          <div className="text-sm text-zinc-200 truncate">{o.id}</div>
                        </div>

                        <div className="sm:ml-auto text-right">
                          <div className="text-xs text-zinc-500">Total</div>
                          <div className="text-xl font-extrabold tracking-tight">
                            ${moneyCLP(o.total)}
                          </div>
                        </div>
                      </div>

                      {o.notes ? (
                        <div className="mt-4 text-xs text-zinc-200 border border-white/10 bg-white/5 rounded-2xl px-3 py-2">
                          <span className="text-zinc-400">📝 Nota:</span> {o.notes}
                        </div>
                      ) : null}

                      <Timeline status={o.status} />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="text-xs text-zinc-500 mb-3">Detalle</div>

                    <div className="space-y-2">
                      {(o.order_items ?? []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-zinc-200 truncate">
                              {it.product_name_snapshot}
                            </div>

                            {it.variant_snapshot ? (
                              <div className="text-xs text-zinc-400 mt-1">
                                {it.variant_snapshot}
                              </div>
                            ) : null}

                            <div className="text-xs text-zinc-500 mt-0.5">
                              ${moneyCLP(it.unit_price_snapshot)} c/u • x{it.qty}
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-zinc-200 whitespace-nowrap">
                            ${moneyCLP(it.line_total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}