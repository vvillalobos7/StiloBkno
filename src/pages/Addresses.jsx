import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";

export default function Addresses() {
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);

  const emptyForm = {
    id: null,
    label: "Casa",
    full_name: "",
    phone: "",
    street: "",
    city: "Santiago",
    region: "RM",
    zip: "",
    notes: "",
    is_default: false,
  };

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const u = authData?.user ?? null;
    setUser(u);

    if (!u) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", u.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setAddresses(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openNew = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setForm({ ...addr });
    setShowForm(true);
  };

  const saveAddress = async () => {
    if (!user) return showError("Debes iniciar sesión.");
    if (!form.full_name.trim() || !form.street.trim()) {
      return showError("Nombre y dirección son obligatorios.");
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        label: form.label.trim() || "Casa",
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        street: form.street.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        zip: form.zip.trim() || null,
        notes: form.notes.trim() || null,
        is_default: form.is_default,
      };

      // If marking as default, unmark others first
      if (payload.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      if (form.id) {
        const { error } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        success("Dirección actualizada ✅");
      } else {
        const { error } = await supabase.from("addresses").insert(payload);
        if (error) throw error;
        success("Dirección guardada ✅");
      }

      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      showError(`Error: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!confirm("¿Eliminar esta dirección?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) return showError(error.message);
    success("Dirección eliminada");
    await load();
  };

  const setDefault = async (id) => {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
    await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id);
    success("Dirección predeterminada actualizada");
    await load();
  };

  const LABEL_OPTIONS = ["Casa", "Trabajo", "Pareja", "Familia", "Otro"];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Mis direcciones" />

      <main className="mx-auto max-w-3xl w-full px-4 py-8 flex-1">
        <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Mis direcciones</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Guarda direcciones para usar en el checkout.
              </p>
            </div>
            {user && (
              <button
                onClick={openNew}
                className="rounded-2xl bg-white text-zinc-950 font-bold text-sm px-4 py-2.5 hover:opacity-90 transition shrink-0"
              >
                + Nueva
              </button>
            )}
          </div>

          {loading ? (
            <Loading label="Cargando direcciones..." />
          ) : !user ? (
            <div className="mt-6 text-sm text-zinc-300">
              Debes iniciar sesión.{" "}
              <Link className="underline text-zinc-200" to="/auth">
                Ir a login
              </Link>
            </div>
          ) : addresses.length === 0 ? (
            <div className="mt-6 text-sm text-zinc-300">
              No tienes direcciones guardadas.{" "}
              <button onClick={openNew} className="underline text-zinc-200">
                Agrega una
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-2xl border p-4 transition ${
                    a.is_default
                      ? "border-emerald-400/30 bg-emerald-400/5"
                      : "border-violet-500/15 bg-zinc-950/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-violet-500/15 text-zinc-200 font-medium">
                          {a.label}
                        </span>
                        {a.is_default && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/20 text-emerald-200 font-medium">
                            ✓ Predeterminada
                          </span>
                        )}
                      </div>
                      <div className="mt-2 font-semibold">{a.full_name}</div>
                      <div className="text-sm text-zinc-300 mt-1">{a.street}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {a.city}, {a.region}
                        {a.zip ? ` • ${a.zip}` : ""}
                      </div>
                      {a.phone && (
                        <div className="text-xs text-zinc-400 mt-0.5">📞 {a.phone}</div>
                      )}
                      {a.notes && (
                        <div className="text-xs text-zinc-500 mt-1 italic">"{a.notes}"</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-xl border border-violet-500/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-violet-500/10 transition"
                    >
                      Editar
                    </button>
                    {!a.is_default && (
                      <button
                        onClick={() => setDefault(a.id)}
                        className="rounded-xl border border-violet-500/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-violet-500/10 transition"
                      >
                        Marcar predeterminada
                      </button>
                    )}
                    <button
                      onClick={() => deleteAddress(a.id)}
                      className="rounded-xl border border-rose-400/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Address form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowForm(false)}
          />

          <div className="relative w-full max-w-lg rounded-3xl border border-violet-500/15 bg-zinc-950 p-5 sm:p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold">
                {form.id ? "Editar dirección" : "Nueva dirección"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="h-9 w-9 rounded-xl border border-violet-500/15 grid place-items-center text-zinc-300 hover:bg-violet-500/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {/* Label */}
              <div className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Etiqueta</span>
                <div className="flex flex-wrap gap-2">
                  {LABEL_OPTIONS.map((l) => (
                    <button
                      key={l}
                      onClick={() => updateField("label", l)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        form.label === l
                          ? "bg-white text-zinc-950 border-white"
                          : "border-violet-500/15 text-zinc-200 hover:bg-violet-500/10"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Nombre completo *</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  placeholder="Ej: Vicente Alonso"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Teléfono</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Dirección (calle, número) *</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  value={form.street}
                  onChange={(e) => updateField("street", e.target.value)}
                  placeholder="Ej: Av. Providencia 1234"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Ciudad</span>
                  <input
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Región</span>
                  <input
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={form.region}
                    onChange={(e) => updateField("region", e.target.value)}
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Notas (depto, referencia, portería...)</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Ej: Depto 302, portería abierta"
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => updateField("is_default", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-zinc-200">Marcar como predeterminada</span>
              </label>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveAddress}
                  disabled={saving}
                  className="flex-1 rounded-2xl btn-accent py-3 hover:opacity-90 disabled:opacity-60 transition"
                >
                  {saving ? "Guardando..." : form.id ? "Actualizar" : "Guardar"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-2xl border border-violet-500/15 px-5 py-3 text-sm text-zinc-200 hover:bg-violet-500/10 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
