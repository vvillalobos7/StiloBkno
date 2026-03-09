import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, BUSINESS_ID } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { moneyCLP } from "../../utils/format";

const STATUS_LABEL = {
  new: "Nuevo",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDayKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function lastNDaysKeys(n) {
  const today = startOfDay(new Date());
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(isoDayKey(d));
  }
  return out;
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

function MiniBars({ series }) {
  const values = series.map((s) => Number(s.value || 0));
  const max = Math.max(...values, 1);

  return (
    <div className="h-16 flex items-end gap-1">
      {series.map((s) => {
        const raw = Number(s.value || 0);
        const h = raw === 0 ? 4 : clamp((raw / max) * 100, 6, 100);

        return (
          <div key={s.key} className="flex-1">
            <div
              className="w-full rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 transition"
              style={{ height: `${h}%` }}
              title={`${s.key}: $${moneyCLP(raw)}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, value, sub, right }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500">{title}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
          {sub ? <div className="mt-2 text-xs text-zinc-500">{sub}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [livePulse, setLivePulse] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("Conectando...");

  const mountedRef = useRef(false);
  const reloadTimeoutRef = useRef(null);
  const pulseTimeoutRef = useRef(null);
  const channelRef = useRef(null);

  const pulseLive = () => {
    setLivePulse(true);

    window.clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = window.setTimeout(() => {
      setLivePulse(false);
    }, 1400);
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, created_at, status, total, business_id, customer_name,
        order_items ( id, product_id, product_name_snapshot, qty, line_total )
      `
      )
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dashboard load error:", error);
    }

    const o = data ?? [];
    setOrders(o);

    const flat = [];
    for (const ord of o) {
      for (const it of ord.order_items ?? []) {
        flat.push({
          ...it,
          order_id: ord.id,
          created_at: ord.created_at,
          status: ord.status,
        });
      }
    }
    setItems(flat);

    if (!silent) setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    load();

    return () => {
      mountedRef.current = false;
      window.clearTimeout(reloadTimeoutRef.current);
      window.clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const debouncedReload = (source = "unknown") => {
      console.log("Realtime event from:", source);

      pulseLive();

      window.clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log("Reloading dashboard from realtime...");
          load(true);
        }
      }, 500);
    };

    const channel = supabase
      .channel(`admin-dashboard-realtime-${BUSINESS_ID}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Realtime orders payload:", payload);
          debouncedReload("orders");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("Realtime order_items payload:", payload);
          debouncedReload("order_items");
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        setRealtimeStatus(status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      window.clearTimeout(reloadTimeoutRef.current);
      window.clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const k30 = useMemo(() => lastNDaysKeys(30), []);
  const k7 = useMemo(() => lastNDaysKeys(7), []);

  const metrics = useMemo(() => {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    d7.setHours(0, 0, 0, 0);

    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    d30.setHours(0, 0, 0, 0);

    let totalAll = 0;
    let total7 = 0;
    let total30 = 0;
    let totalToday = 0;

    let ordersToday = 0;
    let orders7 = 0;
    let cancelledCount = 0;
    let validOrderCount = 0;

    const countByStatus = {};
    const salesByDay30 = {};

    for (const o of orders) {
      const st = o.status ?? "unknown";
      countByStatus[st] = (countByStatus[st] ?? 0) + 1;

      const created = new Date(o.created_at);
      const key = isoDayKey(created);

      if (created >= todayStart) ordersToday += 1;
      if (created >= d7) orders7 += 1;
      if (st === "cancelled") cancelledCount += 1;

      const includeInSales = st !== "cancelled";

      if (includeInSales) {
        const total = Number(o.total ?? 0);

        totalAll += total;
        validOrderCount += 1;

        if (created >= todayStart) totalToday += total;
        if (created >= d7) total7 += total;
        if (created >= d30) total30 += total;

        salesByDay30[key] = (salesByDay30[key] ?? 0) + total;
      }
    }

    const avgTicket = validOrderCount > 0 ? totalAll / validOrderCount : 0;

    const byProduct = {};
    for (const it of items) {
      const name = it.product_name_snapshot ?? "Producto";
      byProduct[name] = (byProduct[name] ?? 0) + Number(it.line_total ?? 0);
    }

    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, revenue]) => ({ name, revenue }));

    const series30 = k30.map((k) => ({ key: k.slice(5), value: salesByDay30[k] ?? 0 }));
    const latestOrders = [...orders].slice(0, 6);

    return {
      totalAll,
      totalToday,
      total7,
      total30,
      ordersToday,
      orders7,
      cancelledCount,
      avgTicket,
      countByStatus,
      topProducts,
      series30,
      latestOrders,
      validOrderCount,
    };
  }, [orders, items, k30]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/75 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white text-zinc-950 grid place-items-center font-black">
            SB
          </div>
          <div>
            <div className="font-extrabold tracking-tight">Admin • Dashboard</div>
            <div className="text-xs text-zinc-400">StiloBkno • Métricas en tiempo real</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                livePulse
                  ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {livePulse ? "Actualizado en vivo" : `Realtime: ${realtimeStatus}`}
            </div>

            <a
              href="/admin/products"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Productos
            </a>
            <a
              href="/admin/orders"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Pedidos
            </a>
            <button
              onClick={() => load()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Actualizar
            </button>
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
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
            <Loading label="Cargando métricas..." />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-3">
              <Card
                title="Ventas (total)"
                value={`$${moneyCLP(metrics.totalAll)}`}
                sub="Excluye pedidos cancelados"
                right={<div className="text-2xl">💸</div>}
              />
              <Card
                title="Ventas (hoy)"
                value={`$${moneyCLP(metrics.totalToday)}`}
                sub={`${metrics.ordersToday} pedido(s) hoy`}
                right={<div className="text-2xl">📅</div>}
              />
              <Card
                title="Ticket promedio"
                value={`$${moneyCLP(Math.round(metrics.avgTicket))}`}
                sub={`${metrics.validOrderCount} pedido(s) válidos`}
                right={<div className="text-2xl">🧾</div>}
              />
            </div>

            <div className="mt-3 grid md:grid-cols-4 gap-3">
              <Card
                title="Ventas (últimos 7 días)"
                value={`$${moneyCLP(metrics.total7)}`}
                sub="Incluye hoy"
                right={<div className="text-xl">📈</div>}
              />
              <Card
                title="Ventas (últimos 30 días)"
                value={`$${moneyCLP(metrics.total30)}`}
                sub="Incluye hoy"
                right={<div className="text-xl">🗓️</div>}
              />
              <Card
                title="Pedidos (semana)"
                value={`${metrics.orders7}`}
                sub="Últimos 7 días"
                right={<div className="text-xl">📦</div>}
              />
              <Card
                title="Cancelados"
                value={`${metrics.cancelledCount}`}
                sub="Total histórico"
                right={<div className="text-xl">⛔</div>}
              />
            </div>

            <div className="mt-3 grid lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Ventas por día</div>
                    <div className="text-lg font-extrabold mt-1">Últimos 30 días</div>
                  </div>
                  <div className="text-xs text-zinc-500">Pasa el mouse sobre las barras</div>
                </div>

                <div className="mt-4">
                  <MiniBars series={metrics.series30} />
                </div>

                <div className="mt-4 grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-15 gap-1 text-[10px] text-zinc-600">
                  {metrics.series30.map((d) => (
                    <div key={d.key} className="truncate text-center">
                      {d.key}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
                <div className="text-xs text-zinc-500">Pedidos por estado</div>
                <div className="text-lg font-extrabold mt-1">Resumen</div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(metrics.countByStatus).map(([st, n]) => (
                    <span key={st} className={`text-xs px-3 py-1.5 rounded-full ${badgeClass(st)}`}>
                      {STATUS_LABEL[st] ?? st}: <span className="font-semibold">{n}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">Total pedidos</div>
                  <div className="text-2xl font-extrabold mt-1">{orders.length}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Top productos</div>
                    <div className="text-lg font-extrabold mt-1">Por ingresos</div>
                  </div>
                  <a href="/admin/products" className="text-xs text-zinc-300 underline hover:text-white">
                    Ir a productos
                  </a>
                </div>

                {metrics.topProducts.length === 0 ? (
                  <div className="mt-5 text-sm text-zinc-400">Aún no hay ventas por productos.</div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {metrics.topProducts.map((p, idx) => (
                      <div
                        key={p.name}
                        className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">#{idx + 1}</div>
                          <div className="text-sm font-semibold text-zinc-200 truncate">{p.name}</div>
                        </div>
                        <div className="text-sm font-extrabold">${moneyCLP(p.revenue)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Últimos pedidos</div>
                    <div className="text-lg font-extrabold mt-1">Actividad reciente</div>
                  </div>
                  <a href="/admin/orders" className="text-xs text-zinc-300 underline hover:text-white">
                    Ver todos
                  </a>
                </div>

                {metrics.latestOrders.length === 0 ? (
                  <div className="mt-5 text-sm text-zinc-400">Aún no hay pedidos.</div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {metrics.latestOrders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-500 truncate">ID: {o.id}</div>
                            <div className="text-sm text-zinc-200 truncate">{o.customer_name ?? "Cliente"}</div>
                            <div className="text-xs text-zinc-500 mt-1">{prettyDate(o.created_at)}</div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-xs px-3 py-1 rounded-full ${badgeClass(o.status)}`}>
                              {STATUS_LABEL[o.status] ?? o.status}
                            </span>
                            <div className="mt-2 text-sm font-extrabold">${moneyCLP(o.total)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <a
                href="/admin/orders"
                className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5 hover:bg-white/5 transition"
              >
                <div className="text-xs text-zinc-500">Gestión</div>
                <div className="mt-1 text-lg font-extrabold">Pedidos</div>
                <div className="mt-2 text-sm text-zinc-400">Cambiar estado y notificar.</div>
              </a>

              <a
                href="/admin/products"
                className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5 hover:bg-white/5 transition"
              >
                <div className="text-xs text-zinc-500">Catálogo</div>
                <div className="mt-1 text-lg font-extrabold">Productos</div>
                <div className="mt-2 text-sm text-zinc-400">Crear, editar y activar catálogo.</div>
              </a>

              <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5">
                <div className="text-xs text-zinc-500">Emails</div>
                <div className="mt-1 text-lg font-extrabold">Notificaciones</div>
                <div className="mt-2 text-sm text-zinc-400">Activo ✅ (modo testing)</div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}