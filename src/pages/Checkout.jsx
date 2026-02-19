import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Loading from "../components/Loading";
import { useCart } from "../store/cart";
import { supabase, BUSINESS_ID } from "../lib/supabase";
import { moneyCLP } from "../utils/Format";

function normalizePhoneToWa(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`; // Chile
  if (digits.startsWith("56")) return digits;
  return digits;
}

function buildWhatsAppMessage({ orderId, customer_name, customer_phone, notes, items, total }) {
  const lines = [];
  lines.push(`Hola! Soy ${customer_name || "cliente"} 👟🖤`);
  lines.push(`Acabo de realizar un pedido en StiloBkno.`);
  lines.push(`ID Pedido: ${orderId}`);
  lines.push("");
  lines.push("Items:");
  items.forEach((it) => {
    lines.push(`• ${it.product_name_snapshot} x${it.qty} — $${moneyCLP(it.line_total)}`);
  });
  lines.push("");
  lines.push(`Total: $${moneyCLP(total)}`);
  if (notes) {
    lines.push("");
    lines.push(`Notas: ${notes}`);
  }
  lines.push("");
  lines.push("¿Me confirmas disponibilidad y entrega? 🙌");
  return lines.join("\n");
}

export default function Checkout() {
  const { items, total, count, clear } = useCart();

  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Cargar usuario + profile (para autocompletar)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (!u) return;

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", u.id)
        .single();

      if (!error && prof) {
        setProfile(prof);
        if (prof.full_name) setCustomerName(prof.full_name);
        if (prof.phone) setCustomerPhone(prof.phone);
      }
    })();
  }, []);

  const lines = useMemo(() => {
    return (items ?? []).map((it) => {
      const qty = Number(it.qty ?? 1);
      const price = Number(it.price ?? 0);
      return {
        product_id: it.id,
        product_name_snapshot: it.name,
        unit_price_snapshot: price,
        qty,
        line_total: price * qty,
      };
    });
  }, [items]);

  const canCheckout = count > 0 && customerName.trim() && customerPhone.trim();

  const placeOrder = async () => {
    if (!canCheckout) {
      return alert("Completa nombre, teléfono y agrega productos al carrito.");
    }

    setLoading(true);
    try {
      // obtener user actual en tiempo real (por si cambió)
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      // 1) insert order
      const orderPayload = {
        business_id: BUSINESS_ID,
        user_id: currentUser?.id ?? null, // ✅ CLAVE
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        notes: notes.trim() || null,
        total: Number(total),
        status: "new",
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // 2) insert order_items
      const itemsPayload = lines.map((l) => ({
        business_id: BUSINESS_ID,
        order_id: order.id,
        product_id: l.product_id,
        product_name_snapshot: l.product_name_snapshot,
        unit_price_snapshot: l.unit_price_snapshot,
        qty: l.qty,
        line_total: l.line_total,
      }));

      if (itemsPayload.length > 0) {
        const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      // 3) limpiar carrito
      clear();

      // 4) enviar a WhatsApp
      const wa = normalizePhoneToWa(customerPhone);
      const message = buildWhatsAppMessage({
        orderId: order.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        notes: notes.trim(),
        items: itemsPayload,
        total: Number(total),
      });

      // Si no tienes número tienda configurado, abre WhatsApp sin destinatario (user elige contacto)
      // Si quieres número fijo (recomendado), dime tu número y lo dejamos hardcodeado/config en env.
      const storeNumber = null; // ej: "56912345678"
      const link = storeNumber
        ? `https://wa.me/${storeNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;

      window.open(link, "_blank");

      alert("Pedido creado ✅ Revisa WhatsApp para coordinar.");

    } catch (e) {
      console.error(e);
      alert(`Error creando pedido: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Checkout • Confirma y coordina por WhatsApp" />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Form */}
          <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Completa tus datos y enviamos el pedido por WhatsApp.
                </p>
              </div>

              {user ? (
                <Link
                  to="/my-orders"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  Mis pedidos
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs text-zinc-400">Nombre</span>
                <input
                  className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Vicente Alonso"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs text-zinc-400">Teléfono</span>
                <input
                  className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ej: +56 9 1234 5678"
                />
                <span className="text-[11px] text-zinc-500">
                  Tip: para WhatsApp ideal +56 9 XXXXXXXX.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-xs text-zinc-400">Notas (talla, color, comuna, etc.)</span>
                <textarea
                  rows={4}
                  className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Talla L, color negro, retiro en metro..."
                />
              </label>

              <button
                onClick={placeOrder}
                disabled={!canCheckout || loading}
                className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Creando pedido..." : "Crear pedido y enviar a WhatsApp"}
              </button>

              <div className="text-xs text-zinc-500">
                Al crear tu pedido, podrás ver su estado en “Mis pedidos” (si estás logueado).
              </div>
            </div>
          </section>

          {/* Summary */}
          <aside className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6 h-fit">
            <div className="text-xs text-zinc-400">Resumen</div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight">Carrito</div>

            {count === 0 ? (
              <div className="mt-4 text-sm text-zinc-400">
                Tu carrito está vacío.{" "}
                <Link className="underline text-zinc-200" to="/catalog">
                  Volver al catálogo
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{it.name}</div>
                      <div className="text-xs text-zinc-400">
                        x{it.qty} • ${moneyCLP(it.price)}
                      </div>
                    </div>
                    <div className="font-extrabold whitespace-nowrap">
                      ${moneyCLP(Number(it.price) * Number(it.qty))}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Total</div>
                  <div className="text-xl font-extrabold">${moneyCLP(total)}</div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {loading ? <Loading label="Procesando..." /> : null}
      </main>
    </div>
  );
}
