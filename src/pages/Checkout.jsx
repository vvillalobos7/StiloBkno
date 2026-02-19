import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/navbar";
import Loading from "../components/Loading";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/Format";
import { buildWhatsAppMessage, waLink } from "../utils/Whatsapp";

export default function Checkout() {
  const { items, inc, dec, remove, total, clear } = useCart();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,whatsapp_phone")
        .eq("id", BUSINESS_ID)
        .single();

      if (error) console.error(error);
      setBusiness(data);
      setLoading(false);
    })();
  }, []);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const itemsForMessage = useMemo(
    () => items.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
    [items]
  );

  const send = async () => {
    if (!business) return;
    if (items.length === 0) return alert("Tu carrito está vacío.");

    setSending(true);
    try {
      // 1) crear pedido
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          business_id: BUSINESS_ID,
          customer_name: name || null,
          customer_phone: phone || null,
          notes: notes || null,
          total,
          status: "new",
        })
        .select("*")
        .single();

      if (orderErr) throw orderErr;

      // 2) items del pedido
      const rows = items.map((it) => ({
        order_id: order.id,
        product_id: it.id,
        product_name_snapshot: it.name,
        unit_price_snapshot: it.price,
        qty: it.qty,
        line_total: it.price * it.qty,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      // 3) abrir whatsapp
      const msg = buildWhatsAppMessage({
        storeName: business.name ?? "StiloBkno",
        customer: { name, phone },
        items: itemsForMessage,
        total,
        notes,
      });

      window.open(waLink(business.whatsapp_phone, msg), "_blank");
      clear();
    } catch (e) {
      console.error(e);
      alert("Error enviando pedido. Revisa consola.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar subtitle="Checkout • Pedido por WhatsApp" />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <Loading label="Cargando checkout..." />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2">
              <h2 className="text-2xl font-extrabold tracking-tight">Tu carrito</h2>

              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6 text-zinc-300">
                    Carrito vacío. Vuelve al catálogo y agrega productos.
                  </div>
                ) : (
                  items.map((it) => (
                    <div
                      key={it.id}
                      className="rounded-3xl border border-white/10 bg-zinc-900/30 p-4 flex items-center gap-4"
                    >
                      <div className="h-20 w-20 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                        {it.image_path ? (
                          <img className="h-full w-full object-cover" src={imageUrl(it.image_path)} alt={it.name} />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{it.name}</div>
                        <div className="text-xs text-zinc-400">${moneyCLP(it.price)} c/u</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5" onClick={() => dec(it.id)}>
                          −
                        </button>
                        <div className="w-8 text-center font-semibold">{it.qty}</div>
                        <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5" onClick={() => inc(it.id)}>
                          +
                        </button>
                      </div>

                      <div className="w-28 text-right font-extrabold">
                        ${moneyCLP(it.price * it.qty)}
                      </div>

                      <button
                        className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5 text-zinc-200"
                        onClick={() => remove(it.id)}
                        title="Quitar"
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <aside className="lg:col-span-1">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-5 sticky top-24">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-300">Total</div>
                  <div className="text-2xl font-extrabold">${moneyCLP(total)}</div>
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Tu nombre (opcional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Teléfono (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <textarea
                    className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    rows={4}
                    placeholder="Notas (talla, color, dirección, etc.)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  disabled={sending || items.length === 0}
                  onClick={send}
                  className="mt-4 w-full rounded-2xl bg-emerald-500 text-zinc-950 font-extrabold py-3 hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar pedido por WhatsApp"}
                </button>

                <div className="mt-3 text-xs text-zinc-400">
                  El pedido también queda guardado en tu panel admin.
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
