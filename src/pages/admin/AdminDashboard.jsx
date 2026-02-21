import { useEffect, useMemo, useState } from "react";
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

function MiniBars({ series }) {
  // series: [{ key, value }]
  const values = series.map((s) => Number(s.value || 0));
  const max = Math.max(...values, 1);

  return (
    <div className="h-16 flex items-end gap-1">
      {series.map((s) => {
        const h = clamp((Number(s.value || 0) / max) * 100, 2, 100);
        return (
          <div key={s.key} className="flex-1">
            <div
              className="w-full rounded-xl border border-white/10 bg-white/10"
              style={{ height: `${h}%` }}
              title={`${s.key}: $${moneyCLP(s.value)}`}
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

  const load = async () => {
    setLoading(true);

    // Traemos orders + order_items. (Si tu DB está grande, luego optimizamos con una view / RPC)
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, created_at, status, total, business_id,
        order_items ( id, product_id, product_name_snapshot, qty, line_total )
      `
      )
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    const o = data ?? [];
    setOrders(o);

    const flat = [];
    for (const ord of o) {
      for (const it of ord.order_items ?? []) flat.push({ ...it, order_id: ord.id, created_at: ord.created_at, status: ord.status });
    }
    setItems(flat);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const k30 = useMemo(() => lastNDaysKeys(30), []);
  const k7 = useMemo(() => lastNDaysKeys(7), []);

  const metrics = useMemo(() => {
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6); // incluye hoy
    d7.setHours(0, 0, 0, 0);

    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    d30.setHours(0, 0, 0, 0);

    let totalAll = 0;
    let total7 = 0;
    let total30 = 0;

    const countByStatus = {};
    const salesByDay30 = {};
    const salesByDay7 = {};

    for (const o of orders) {
      const st = o.status ?? "unknown";
      countByStatus[st] = (countByStatus[st] ?? 0) + 1;

      // Opcional: excluir cancelled de ventas
      const includeInSales = st !== "cancelled";

      const created = new Date(o.created_at);
      const key = isoDayKey(created);

      if (includeInSales) {
        totalAll += Number(o.total ?? 0);

        if (created >= d7) total7 += Number(o.total ?? 0);
        if (created >= d30) total30 += Number(o.total ?? 0);

        salesByDay30[key] = (salesByDay30[key] ?? 0) + Number(o.total ?? 0);
        salesByDay7[key] = (salesByDay7[key] ?? 0) + Number(o.total ?? 0);
      }
    }

    // Top productos por ingresos
    const byProduct = {};
    for (const it of items) {
      const name = it.product_name_snapshot ?? "Producto";
      byProduct[name] = (byProduct[name] ?? 0) + Number(it.line_total ?? 0);
    }
    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, revenue]) => ({ name, revenue }));

    // Series ordenadas
    const series30 = k30.map((k) => ({ key: k.slice(5), value: salesByDay30[k] ?? 0 }));
    const series7 = k7.map((k) => ({ key: k.slice(5), value: salesByDay7[k] ?? 0 }));

    return { totalAll, total7, total30, countByStatus, topProducts, series30, series7 };
  }, [orders, items, k30, k7]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/75 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white text-zinc-950 grid place-items-center font-black">SB</div>
          <div>
            <div className="font-extrabold tracking-tight">Admin • Dashboard</div>
            <div className="text-xs text-zinc-400">StiloBkno • Métricas en tiempo real</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
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
              onClick={load}
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
            {/* KPIs */}
            <div className="grid md:grid-cols-3 gap-3">
              <Card
                title="Ventas (total)"
                value={`$${moneyCLP(metrics.totalAll)}`}
                sub="Excluye pedidos cancelados"
                right={<div className="text-2xl">💸</div>}
              />
              <Card
                title="Ventas (últimos 7 días)"
                value={`$${moneyCLP(metrics.total7)}`}
                sub="Incluye hoy"
                right={<div className="text-2xl">📈</div>}
              />
              <Card
                title="Ventas (últimos 30 días)"
                value={`$${moneyCLP(metrics.total30)}`}
                sub="Incluye hoy"
                right={<div className="text-2xl">🗓️</div>}
              />
            </div>

            {/* Charts + Status */}
            <div className="mt-3 grid lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Ventas por día</div>
                    <div className="text-lg font-extrabold mt-1">Últimos 30 días</div>
                  </div>
                  <div className="text-xs text-zinc-500">Hover para ver el valor</div>
                </div>
                <div className="mt-4">
                  <MiniBars series={metrics.series30} />
                </div>
                <div className="mt-4 text-xs text-zinc-500">Tip: si está “plano”, crea más pedidos para ver movimiento 😄</div>
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

            {/* Top Products */}
            <div className="mt-3 rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Top productos</div>
                  <div className="text-lg font-extrabold mt-1">Por ingresos (snapshot)</div>
                </div>
                <a
                  href="/admin/products"
                  className="text-xs text-zinc-300 underline hover:text-white"
                >
                  Ir a productos
                </a>
              </div>

              {metrics.topProducts.length === 0 ? (
                <div className="mt-5 text-sm text-zinc-400">Aún no hay ventas por productos.</div>
              ) : (
                <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metrics.topProducts.map((p) => (
                    <div key={p.name} className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4">
                      <div className="text-sm font-semibold text-zinc-200 truncate">{p.name}</div>
                      <div className="mt-2 text-xs text-zinc-500">Ingresos</div>
                      <div className="text-xl font-extrabold mt-1">${moneyCLP(p.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
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
                <div className="mt-2 text-sm text-zinc-400">Crear / editar / activar.</div>
              </a>

              <div className="rounded-3xl border border-white/10 bg-zinc-950/30 p-5">
                <div className="text-xs text-zinc-500">Emails</div>
                <div className="mt-1 text-lg font-extrabold">Notificaciones</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Activo ✅ (modo testing)
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}