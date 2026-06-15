import { useEffect, useState } from "react";
import { supabase, BUSINESS_ID } from "../../lib/supabase";
import AdminLayout from "../../components/AdminLayout";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";

const STORAGE_BUCKET = "banners";

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function AdminBanners() {
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    id: null,
    title: "",
    subtitle: "",
    image_path: "",
    link: "",
    sort_order: 0,
    is_active: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("business_id", BUSINESS_ID)
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setBanners(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const updateField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const openNew = () => {
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({
      id: b.id,
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      image_path: b.image_path,
      link: b.link ?? "",
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active,
    });
    setFile(null);
    setPreview(b.image_path ? imageUrl(b.image_path) : null);
    setShowForm(true);
  };

  const saveBanner = async () => {
    setSaving(true);
    try {
      let imagePath = form.image_path;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${BUSINESS_ID}/${uid()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

        if (upErr) throw upErr;
        imagePath = path;
      }

      if (!imagePath) throw new Error("Sube una imagen para el banner.");

      const payload = {
        business_id: BUSINESS_ID,
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        image_path: imagePath,
        link: form.link.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (form.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", form.id);
        if (error) throw error;
        success("Banner actualizado ✅");
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
        success("Banner creado ✅");
      }

      setShowForm(false);
      setForm(emptyForm);
      setFile(null);
      setPreview(null);
      await load();
    } catch (e) {
      showError(`Error: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (b) => {
    if (!confirm(`¿Eliminar banner "${b.title || "Sin título"}"?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) return showError(error.message);
    success("Banner eliminado");
    await load();
  };

  const toggleActive = async (b) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return showError(error.message);
    await load();
  };

  return (
    <AdminLayout title="Banners" subtitle="Gestiona el slider del Home">
      <div className="rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-3 sm:p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Banners</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Los banners activos se muestran como slider en el Home.
            </p>
          </div>
          <button
            onClick={openNew}
            className="rounded-xl btn-accent text-sm px-4 py-2 transition"
          >
            + Nuevo banner
          </button>
        </div>

        {loading ? (
          <Loading label="Cargando banners..." />
        ) : banners.length === 0 ? (
          <div className="mt-6 text-sm text-zinc-300">
            Aún no hay banners.{" "}
            <button onClick={openNew} className="underline text-violet-300">
              Crea el primero
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`rounded-2xl border p-4 transition ${
                  b.is_active
                    ? "border-violet-500/15 bg-zinc-950/30"
                    : "border-violet-500/5 bg-zinc-950/10 opacity-60"
                }`}
              >
                <div className="flex gap-4 items-start flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-40 aspect-video rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                    {b.image_path ? (
                      <img
                        src={imageUrl(b.image_path)}
                        alt={b.title ?? "Banner"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full grid place-items-center text-zinc-500 text-xs">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          b.is_active
                            ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-200"
                            : "border-violet-500/15 bg-violet-500/5 text-zinc-400"
                        }`}
                      >
                        {b.is_active ? "Activo" : "Inactivo"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Orden: {b.sort_order}
                      </span>
                    </div>

                    <div className="mt-2 font-semibold truncate">
                      {b.title || "(Sin título)"}
                    </div>
                    {b.subtitle && (
                      <div className="text-sm text-zinc-400 truncate mt-0.5">
                        {b.subtitle}
                      </div>
                    )}
                    {b.link && (
                      <div className="text-xs text-zinc-500 mt-1 truncate">
                        🔗 {b.link}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEdit(b)}
                        className="rounded-lg btn-secondary px-3 py-1.5 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(b)}
                        className="rounded-lg btn-secondary px-3 py-1.5 text-xs"
                      >
                        {b.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => deleteBanner(b)}
                        className="rounded-lg btn-danger px-3 py-1.5 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowForm(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-950 p-4 sm:p-5 md:p-6 animate-slide-up max-h-[90vh] overflow-y-auto shadow-xl shadow-violet-500/5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold">
                {form.id ? "Editar banner" : "Nuevo banner"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="h-9 w-9 rounded-lg border border-white/10 grid place-items-center text-zinc-300 hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {/* Image upload */}
              <div>
                <span className="text-xs text-zinc-400">Imagen del banner *</span>
                {preview && (
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-zinc-800">
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="mt-2 text-sm text-zinc-300"
                />
                <div className="text-[11px] text-zinc-500 mt-1">
                  Tamaño sugerido: 1400×500px (aspecto 21:8).
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Título</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Ej: Nuevo Drop de Verano 🔥"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Subtítulo</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                  value={form.subtitle}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  placeholder="Ej: Descubre lo más nuevo en poleras y zapatillas"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Link (destino al hacer click)</span>
                <input
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                  value={form.link}
                  onChange={(e) => updateField("link", e.target.value)}
                  placeholder="Ej: /catalog o /catalog?cat=abc123"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Orden</span>
                  <input
                    type="number"
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                    value={form.sort_order}
                    onChange={(e) => updateField("sort_order", e.target.value)}
                  />
                </label>
                <label className="flex items-end gap-3 pb-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-zinc-200">Activo</span>
                </label>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveBanner}
                  disabled={saving}
                  className="flex-1 rounded-xl btn-accent py-2.5 disabled:opacity-60 transition"
                >
                  {saving ? "Guardando..." : form.id ? "Actualizar" : "Crear banner"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-xl btn-secondary px-5 py-2.5 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
