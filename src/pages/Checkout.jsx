import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import { useCart } from "../store/cart";
import { supabase, BUSINESS_ID, STORE_WHATSAPP } from "../lib/supabase";
import { moneyCLP } from "../utils/format";
import { useToast } from "../components/Toast";

function buildWhatsAppMessage({ orderId, customerName, customerPhone, customerEmail, address, notes, items, total }) {
  const lines = [];
  lines.push("🛍️ *Nuevo pedido — StiloBkno*");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`📋 *ID:* ${orderId}`);
  lines.push(`👤 *Cliente:* ${customerName || "—"}`);
  lines.push(`📞 *Teléfono:* ${customerPhone || "—"}`);
  if (customerEmail) lines.push(`📧 *Email:* ${customerEmail}`);

  if (address) {
    lines.push("");
    lines.push("📍 *Dirección de entrega:*");
    lines.push(`   ${address.street}`);
    lines.push(`   ${address.city}, ${address.region}${address.zip ? ` (${address.zip})` : ""}`);
    if (address.notes) lines.push(`   📝 ${address.notes}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("*Productos:*");

  items.forEach((it, i) => {
    const variantText = it.variant_snapshot ? ` (${it.variant_snapshot})` : "";
    lines.push(`${i + 1}. ${it.product_name_snapshot}${variantText}`);
    lines.push(`   x${it.qty} — $${moneyCLP(it.line_total)}`);
  });

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`💰 *TOTAL: $${moneyCLP(total)}*`);

  if (notes) {
    lines.push("");
    lines.push(`📝 *Notas:* ${notes}`);
  }

  lines.push("");
  lines.push("¡Confirma disponibilidad y coordina la entrega! 🙌");
  return lines.join("\n");
}

export default function Checkout() {
  const { items, total, count, clear, inc, dec, remove } = useCart();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Address fields
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Santiago");
  const [region, setRegion] = useState("RM");
  const [zip, setZip] = useState("");
  const [addressNotes, setAddressNotes] = useState("");

  // Saved addresses
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (!u) return;

      // Auto-fill email from auth
      if (u.email) setCustomerEmail(u.email);

      // Load profile
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", u.id)
        .single();

      if (!error && prof) {
        if (prof.full_name) setCustomerName(prof.full_name);
        if (prof.phone) setCustomerPhone(prof.phone);
      }

      // Load saved addresses
      const { data: addrs } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", u.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      const addrList = addrs ?? [];
      setAddresses(addrList);

      // Auto-select default address
      if (addrList.length > 0) {
        const def = addrList.find((a) => a.is_default) ?? addrList[0];
        setSelectedAddressId(def.id);
        applyAddress(def);
        setSaveNewAddress(false);
      }
    })();
  }, []);

  const applyAddress = (addr) => {
    if (!addr) return;
    if (addr.full_name) setCustomerName(addr.full_name);
    if (addr.phone) setCustomerPhone(addr.phone);
    setStreet(addr.street || "");
    setCity(addr.city || "Santiago");
    setRegion(addr.region || "RM");
    setZip(addr.zip || "");
    setAddressNotes(addr.notes || "");
  };

  const handleAddressChange = (id) => {
    setSelectedAddressId(id);
    if (id === "new") {
      // Clear address fields for new entry
      setStreet("");
      setCity("Santiago");
      setRegion("RM");
      setZip("");
      setAddressNotes("");
      setSaveNewAddress(true);
      return;
    }
    setSaveNewAddress(false);
    const addr = addresses.find((a) => a.id === id);
    if (addr) applyAddress(addr);
  };

  const lines = useMemo(() => {
    return (items ?? []).map((it) => {
      const qty = Number(it.qty ?? 1);
      const price = Number(it.price ?? 0);

      return {
        product_id: it.id,
        variant_id: it.variant_id ?? null,
        product_name_snapshot: it.name,
        variant_snapshot: it.variant_label ?? null,
        unit_price_snapshot: price,
        qty,
        line_total: price * qty,
      };
    });
  }, [items]);

  const canCheckout = count > 0 && customerName.trim() && customerPhone.trim();

  const validateStock = async () => {
    const variantIds = items.map((it) => it.variant_id).filter(Boolean);
    if (variantIds.length === 0) return true;

    const { data, error } = await supabase
      .from("product_variants")
      .select("id, stock, is_active")
      .in("id", variantIds);

    if (error) throw error;

    const dbMap = {};
    for (const v of data ?? []) dbMap[v.id] = v;

    for (const it of items) {
      if (!it.variant_id) continue;
      const dbVar = dbMap[it.variant_id];
      if (!dbVar) throw new Error(`La variante de "${it.name}" ya no existe.`);
      if (!dbVar.is_active) throw new Error(`La variante de "${it.name}" está inactiva.`);
      if (Number(dbVar.stock ?? 0) < Number(it.qty ?? 0)) {
        throw new Error(`No hay stock suficiente para "${it.name}" (${it.variant_label ?? "variante"}).`);
      }
    }
    return true;
  };

  const discountStock = async (orderItems) => {
    for (const line of orderItems) {
      if (!line.variant_id) continue;
      const { data: current, error: currentErr } = await supabase
        .from("product_variants")
        .select("id, stock")
        .eq("id", line.variant_id)
        .single();
      if (currentErr) throw currentErr;

      const nextStock = Number(current.stock ?? 0) - Number(line.qty ?? 0);
      if (nextStock < 0) throw new Error(`Stock insuficiente al descontar.`);

      const { error: updErr } = await supabase
        .from("product_variants")
        .update({ stock: nextStock })
        .eq("id", line.variant_id);
      if (updErr) throw updErr;
    }
  };

  const saveAddressIfNew = async () => {
    if (!user || !saveNewAddress || !street.trim()) return;

    // Check if user already has this exact address
    const existing = addresses.find(
      (a) => a.street?.toLowerCase() === street.trim().toLowerCase() && a.city?.toLowerCase() === city.trim().toLowerCase()
    );
    if (existing) return;

    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: "Casa",
      full_name: customerName.trim(),
      phone: customerPhone.trim() || null,
      street: street.trim(),
      city: city.trim(),
      region: region.trim(),
      zip: zip.trim() || null,
      notes: addressNotes.trim() || null,
      is_default: addresses.length === 0, // first address = default
    });

    if (error) console.error("Error guardando dirección:", error);
  };

  const placeOrder = async () => {
    if (!canCheckout) {
      return showError("Completa nombre, teléfono y agrega productos al carrito.");
    }
    if (!STORE_WHATSAPP) {
      return showError("El número de WhatsApp de la tienda no está configurado.");
    }

    setLoading(true);
    try {
      await validateStock();

      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      // Build full notes with address
      const fullNotes = [
        notes.trim(),
        street.trim() ? `Dirección: ${street.trim()}, ${city.trim()}, ${region.trim()}${zip.trim() ? ` (${zip.trim()})` : ""}` : "",
        addressNotes.trim() ? `Ref: ${addressNotes.trim()}` : "",
      ].filter(Boolean).join(" | ");

      const orderPayload = {
        business_id: BUSINESS_ID,
        user_id: currentUser?.id ?? null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        notes: fullNotes || null,
        total: Number(total),
        status: "new",
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload = lines.map((l) => ({
        business_id: BUSINESS_ID,
        order_id: order.id,
        product_id: l.product_id,
        variant_id: l.variant_id,
        product_name_snapshot: l.product_name_snapshot,
        variant_snapshot: l.variant_snapshot,
        unit_price_snapshot: l.unit_price_snapshot,
        qty: l.qty,
        line_total: l.line_total,
      }));

      if (itemsPayload.length > 0) {
        const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      await discountStock(itemsPayload);

      // Save new address for future purchases
      await saveAddressIfNew();

      // Build WhatsApp message
      const addressData = street.trim()
        ? { street: street.trim(), city: city.trim(), region: region.trim(), zip: zip.trim(), notes: addressNotes.trim() }
        : null;

      const message = buildWhatsAppMessage({
        orderId: order.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        address: addressData,
        notes: notes.trim(),
        items: itemsPayload,
        total: Number(total),
      });

      const waLink = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

      clear();
      success("¡Pedido creado! 🎉 Te redirigimos a WhatsApp para confirmar.");

      setTimeout(() => {
        window.open(waLink, "_blank");
      }, 600);
    } catch (e) {
      console.error(e);
      showError(`Error creando pedido: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const isNewAddress = selectedAddressId === "new" || addresses.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Checkout • Confirma por WhatsApp" />

      <main className="mx-auto max-w-6xl w-full px-4 py-6 sm:py-8 flex-1">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Form */}
          <section className="lg:col-span-2 space-y-4">
            {/* Customer data */}
            <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Confirma tus datos y enviaremos el pedido al WhatsApp de la tienda.
                  </p>
                </div>
                {!user && (
                  <Link
                    to="/auth"
                    className="rounded-2xl border border-violet-500/15 px-4 py-2 text-sm text-zinc-200 hover:bg-violet-500/10"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>

              {user && (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 flex items-center gap-3">
                  <span className="text-emerald-300 text-sm">✅</span>
                  <div className="text-sm text-emerald-200">
                    Sesión activa como <span className="font-semibold">{customerEmail || user.email}</span>.
                    Datos auto-completados.
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Nombre completo *</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Vicente Alonso"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Teléfono *</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                    />
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Email</span>
                  <input
                    type="email"
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="tuemail@gmail.com"
                  />
                  <span className="text-[11px] text-zinc-500">
                    Te notificaremos por correo cuando cambie el estado de tu pedido.
                  </span>
                </label>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">📍 Dirección de entrega</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Se incluye en el mensaje de WhatsApp.</p>
                </div>
                {user && addresses.length > 0 && (
                  <Link to="/addresses" className="text-xs text-zinc-400 underline hover:text-zinc-200 shrink-0">
                    Gestionar
                  </Link>
                )}
              </div>

              {/* Address selector (if user has saved addresses) */}
              {user && addresses.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-zinc-400">Selecciona una dirección</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleAddressChange(a.id)}
                        className={`text-xs px-3 py-2 rounded-2xl border transition ${
                          selectedAddressId === a.id && selectedAddressId !== "new"
                            ? "bg-violet-600 text-white border-violet-500 font-bold shadow-lg shadow-violet-500/20"
                            : "border-violet-500/15 text-zinc-200 hover:bg-violet-500/10"
                        }`}
                      >
                        📍 {a.label}{a.is_default ? " ★" : ""}
                        <span className="hidden sm:inline text-zinc-400 ml-1">— {a.street?.substring(0, 20)}{(a.street?.length ?? 0) > 20 ? "..." : ""}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => handleAddressChange("new")}
                      className={`text-xs px-3 py-2 rounded-2xl border transition ${
                        selectedAddressId === "new"
                          ? "bg-violet-600 text-white border-violet-500 font-bold shadow-lg shadow-violet-500/20"
                          : "border-violet-500/15 text-zinc-200 hover:bg-violet-500/10"
                      }`}
                    >
                      ＋ Nueva dirección
                    </button>
                  </div>
                </div>
              )}

              {/* Address form fields */}
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Calle y número *</span>
                  <input
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ej: Av. Providencia 1234"
                  />
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Ciudad</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Santiago"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Región</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="RM"
                    />
                  </label>
                  <label className="grid gap-1.5 col-span-2 sm:col-span-1">
                    <span className="text-xs text-zinc-400">Código postal</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Referencia (depto, portería, instrucciones...)</span>
                  <input
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                    placeholder="Ej: Depto 302, portería abierta hasta las 20:00"
                  />
                </label>

                {/* Save address checkbox (only for new addresses and logged-in users) */}
                {user && isNewAddress && street.trim() && (
                  <label className="flex items-center gap-3 cursor-pointer animate-fade-in">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-zinc-200">Guardar esta dirección para futuras compras</span>
                  </label>
                )}
              </div>
            </div>

            {/* Notes + submit */}
            <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6">
              <h2 className="text-lg font-extrabold tracking-tight">📝 Notas del pedido</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Talla, color, instrucciones especiales, etc.</p>

              <textarea
                rows={3}
                className="mt-3 w-full rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Polera talla L negra, zapatillas 42..."
              />

              <button
                onClick={placeOrder}
                disabled={!canCheckout || loading}
                className="mt-4 w-full rounded-2xl btn-accent px-6 py-3.5 hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-zinc-900 animate-spin" />
                    Creando pedido...
                  </>
                ) : (
                  <>📱 Crear pedido y enviar a WhatsApp</>
                )}
              </button>

              <div className="mt-3 rounded-2xl border border-violet-500/15 bg-white/5 px-4 py-3 text-xs text-zinc-400 space-y-1">
                <div>🔹 Tu pedido se guarda y se envía al WhatsApp de StiloBkno.</div>
                <div>🔹 El equipo te confirmará disponibilidad y coordinará la entrega.</div>
                {user && <div>🔹 Podrás ver el estado en <Link to="/my-orders" className="underline text-zinc-200">Mis pedidos</Link>.</div>}
              </div>
            </div>
          </section>

          {/* Cart summary */}
          <aside className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6 h-fit lg:sticky lg:top-20">
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
                  <div key={it.key} className="rounded-2xl border border-violet-500/15 bg-zinc-950/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-sm">{it.name}</div>
                        {it.variant_label && (
                          <div className="text-xs text-zinc-400 mt-1">{it.variant_label}</div>
                        )}
                        <div className="text-xs text-zinc-400 mt-1">${moneyCLP(it.price)} c/u</div>
                      </div>
                      <div className="font-extrabold whitespace-nowrap text-sm">
                        ${moneyCLP(Number(it.price) * Number(it.qty))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => dec(it.key)}
                        className="rounded-xl border border-violet-500/15 px-3 py-1.5 text-sm text-zinc-200 hover:bg-violet-500/10 transition"
                      >
                        −
                      </button>
                      <div className="text-sm min-w-[24px] text-center font-semibold">{it.qty}</div>
                      <button
                        onClick={() => inc(it.key)}
                        className="rounded-xl border border-violet-500/15 px-3 py-1.5 text-sm text-zinc-200 hover:bg-violet-500/10 transition"
                      >
                        +
                      </button>
                      <button
                        onClick={() => remove(it.key)}
                        className="ml-auto rounded-xl border border-rose-400/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10 transition"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-violet-500/15">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-400">{count} producto(s)</div>
                    <div className="text-2xl font-extrabold">${moneyCLP(total)}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {loading && <Loading label="Procesando pedido..." />}
      </main>

      <Footer />
    </div>
  );
}