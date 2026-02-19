import { useEffect, useMemo, useState } from "react";
import { supabase, BUSINESS_ID } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { moneyCLP } from "../../utils/Format";

// Estados permitidos
const STATUS = [
  { key: "new", label: "Nuevo" },
  { key: "processed", label: "Procesado" },
  { key: "canceled", label: "Cancelado" },
];

function badgeClass(s) {
  if (s === "processed") return "bg-emerald-500 text-zinc-950";
  if (s === "canceled") return "bg-red-500 text-zinc-950";
  return "bg-white/10 text-zinc-200 border border-white/10";
}

function prettyDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso;
  }
}

// Limpia teléfonos a formato wa.me (solo dígitos)
function normalizePhoneToWa(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  // Si el usuario escribió 9XXXXXXXX lo convertimos a Chile 56 + 9XXXXXXXX
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`;

  // Si ya viene 56XXXXXXXXX o 569XXXXXXXX lo dejamos
  if (digits.startsWith("56")) return digits;

  // Default: devolver tal cual (por si es otro país)
  return digits;
}

function buildAdminMessage(order) {
  const lines = [];
  lines.push(`Hola! Soy StiloBkno 👟🖤`);
  lines.push(`Te hablo por tu pedido: ${order.id}`);
  lines.push(`Estado actual: ${order.status}`);
  lines.push("");
  lines.push("Resumen:");
  (order.order_items ?? []).forEach((it) => {
    lines.push(`• ${it.product_name_snapshot} x${it.qty}`);
  });
  lines.push("");
  lines.push(`Total: $${moneyCLP(order.total)}`);
  lines.push("");
  lines.push("Confírmame talla/color y método de entrega 🙌");
  return lines.join("\n");
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState(""); // yyyy-mm-dd

  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);

    let query = supabase
      .from("orders")
      .select(
        `
        id, business_id, customer_name, customer_phone, notes, total, status, created_at,
        order_items ( id, product_name_snapshot, unit_price_snapshot, qty, line_total )
      `
      )
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false })
      .limit(300);

    if (from) query = query.gte("created_at", `${from}T00:00:00`);
    if (to) query = query.lte("created_at", `${to}T23:59:59`);

    const { data, error } = await query;

    if (error) console.error("Orders error:", error);
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = orders.filter((o) => {
      const okStatus = status === "all" || o.status === status;

      const hay = [o.id, o.customer_name, o.customer_phone, o.notes, o.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okTerm = !term || hay.includes(term);
      return okStatus && okTerm;
    });

    // Bonus pro: ordena “new” primero
    base.sort((a, b) => {
      const prio = (s) => (s === "new" ? 0 : s === "processed" ? 1 : 2);
      const d = prio(a.status) - prio(b.status);
      if (d !== 0) return d;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return base;
  }, [orders, q, status]);

  // ====== MÉTRICAS ======
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalSales = orders
      .filter((o) => o.status !== "canceled")
      .reduce((acc, o) => acc + (o.total ?? 0), 0);

    const newCount = orders.filter((o) => o.status === "new").length;
    const processedCount = orders.filter((o) => o.status === "processed").length;

    // hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayProcessed = orders.filter((o) => {
      if (o.status !== "processed") return false;
      const d = new Date(o.created_at);
      return d >= today;
    }).length;

    return { totalOrders, totalSales, newCount, processedCount, todayProcessed };
  }, [orders]);

  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

    if (error) {
      console.error("Update status error:", error);
      alert(error.message || "No se pudo actualizar el estado.");
      return;
    }

    // update local
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selected?.id === orderId) setSelected((s) => ({ ...s, status: newStatus }));
  };

  const openWhatsApp = (order) => {
    const wa = normalizePhoneToWa(order.customer_phone);
    if (!wa) return alert("Este pedido no tiene teléfono válido.");
    const msg = buildAdminMessage(order);
    const link = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank");
  };

  const copyMessage = async (order) => {
    try {
      const msg = buildAdminMessage(order);
      await navigator.clipboard.writeText(msg);
      alert("Mensaje copiado ✅");
    } catch {
      alert("No se pudo copiar (permiso del navegador).");
    }
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
            <div className="text-xs text-zinc-400">StiloBkno • Control + WhatsApp</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
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
        {/* ====== MÉTRICAS (A) ====== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card title="Pedidos" value={metrics.totalOrders} sub="Total" />
          <Card title="Ventas" value={`$${moneyCLP(metrics.totalSales)}`} sub="Sin cancelados" />
          <Card title="Nuevos" value={metrics.newCount} sub="Por atender" />
          <Card title="Procesados hoy" value={metrics.todayProcessed} sub={`Total procesados: ${metrics.processedCount}`} />
        </section>

        {/* ====== FILTROS ====== */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h2 className="text-xl font-extrabold tracking-tight">Listado</h2>

            <input
              className="md:ml-auto rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Buscar (nombre, teléfono, nota, id...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              {STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={load}
              className="rounded-2xl bg-white text-zinc-950 font-extrabold px-5 py-3 hover:opacity-90"
            >
              Refrescar
            </button>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <label className="text-xs text-zinc-400">
              Desde
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-white/20"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>

            <label className="text-xs text-zinc-400">
              Hasta
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-white/20"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>

            <button
              onClick={load}
              className="md:col-span-2 rounded-2xl border border-white/10 py-3 text-sm text-zinc-200 hover:bg-white/5"
            >
              Aplicar filtro de fechas
            </button>
          </div>

          {/* ====== LISTA ====== */}
          {loading ? (
            <Loading label="Cargando pedidos..." />
          ) : filtered.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-950/30 p-6 text-zinc-300">
              No hay pedidos aún. Haz un pedido desde el checkout para probar.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-3xl border border-white/10 bg-zinc-950/30 p-4 ${
                    o.status === "new" ? "ring-1 ring-white/10" : ""
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-zinc-500">ID: {o.id}</div>
                      <div className="font-semibold truncate">
                        {o.customer_name || "Cliente sin nombre"}{" "}
                        <span className="text-xs text-zinc-500">
                          {o.customer_phone ? `• ${o.customer_phone}` : ""}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">{prettyDate(o.created_at)}</div>

                      {o.notes ? (
                        <div className="text-xs text-zinc-300 mt-2 line-clamp-2">
                          📝 {o.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className={`text-xs px-3 py-2 rounded-2xl ${badgeClass(o.status)}`}>
                        {o.status}
                      </span>

                      <select
                        className="rounded-2xl border border-white/10 bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                      >
                        {STATUS.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      <div className="text-right sm:ml-2">
                        <div className="text-xs text-zinc-400">Total</div>
                        <div className="text-lg font-extrabold">${moneyCLP(o.total)}</div>
                      </div>

                      {/* ====== BOTONES WHATSAPP (B) ====== */}
                      <button
                        onClick={() => openWhatsApp(o)}
                        className="rounded-2xl bg-emerald-500 text-zinc-950 font-extrabold px-4 py-2 hover:opacity-90"
                        title="Abrir WhatsApp al cliente"
                      >
                        WhatsApp
                      </button>

                      <button
                        onClick={() => copyMessage(o)}
                        className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                        title="Copiar mensaje"
                      >
                        Copiar
                      </button>

                      <button
                        onClick={() => setSelected(o)}
                        className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MODAL detalle */}
      {selected ? (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(s) => updateStatus(selected.id, s)}
          onWhatsApp={() => openWhatsApp(selected)}
          onCopy={() => copyMessage(selected)}
        />
      ) : null}
    </div>
  );
}

function Card({ title, value, sub }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-5">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-2 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onStatusChange, onWhatsApp, onCopy }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Pedido</div>
            <div className="text-xl font-extrabold tracking-tight truncate">
              {order.customer_name || "Cliente sin nombre"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">{prettyDate(order.created_at)}</div>
            <div className="text-xs text-zinc-500 mt-1">ID: {order.id}</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-3 py-2 text-zinc-200 hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="text-sm text-zinc-200">
              Tel: <span className="text-zinc-400">{order.customer_phone || "—"}</span>
            </div>

            <div className="md:ml-auto flex items-center gap-2">
              <select
                className="rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={order.status}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                {STATUS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={onWhatsApp}
                className="rounded-2xl bg-emerald-500 text-zinc-950 font-extrabold px-4 py-2 hover:opacity-90"
              >
                WhatsApp
              </button>

              <button
                onClick={onCopy}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Copiar
              </button>
            </div>
          </div>

          {order.notes ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4 text-sm text-zinc-200">
              <div className="text-xs text-zinc-400 mb-1">Notas</div>
              {order.notes}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4">
            <div className="text-sm font-semibold">Items</div>

            <div className="mt-3 space-y-2">
              {(order.order_items ?? []).map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{it.product_name_snapshot}</div>
                    <div className="text-xs text-zinc-400">
                      ${moneyCLP(it.unit_price_snapshot)} c/u • x{it.qty}
                    </div>
                  </div>
                  <div className="font-extrabold whitespace-nowrap">${moneyCLP(it.line_total)}</div>
                </div>
              ))}
              {(order.order_items ?? []).length === 0 ? (
                <div className="text-sm text-zinc-400">Sin items.</div>
              ) : null}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-zinc-400">Estado: {order.status}</div>
              <div className="text-xl font-extrabold">Total: ${moneyCLP(order.total)}</div>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Tip: Si el cliente puso un número sin +56, el sistema igual intenta normalizarlo.
          </div>
        </div>
      </div>
    </div>
  );
}
