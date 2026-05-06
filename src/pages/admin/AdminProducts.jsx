import { useEffect, useMemo, useState } from "react";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../../lib/supabase";
import AdminLayout from "../../components/AdminLayout";
import Loading from "../../components/Loading";
import { moneyCLP, slug } from "../../utils/format";

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const formatCLP = (n) => {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "";
  return Math.trunc(num).toLocaleString("es-CL");
};

const parseCLP = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
};

const emptyVariant = {
  size: "",
  color: "",
  stock: 0,
  price_override: 0,
  is_active: true,
};

export default function AdminProducts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingVariantFor, setSavingVariantFor] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variantsByProduct, setVariantsByProduct] = useState({});

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const [newCategory, setNewCategory] = useState("");

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    price: 0,
    category_id: "",
    is_active: true,
    image_path: null,
  });

  const [variantForms, setVariantForms] = useState({});
  const [file, setFile] = useState(null);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const loadAll = async () => {
    setLoading(true);

    const { data: cats, error: catsErr } = await supabase
      .from("categories")
      .select("id,name")
      .eq("business_id", BUSINESS_ID)
      .order("name");

    if (catsErr) console.error(catsErr);
    setCategories(cats ?? []);

    const { data: prods, error: prodsErr } = await supabase
      .from("products")
      .select("id,name,description,price,category_id,is_active,image_path,created_at")
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (prodsErr) console.error(prodsErr);
    const productList = prods ?? [];
    setProducts(productList);

    const { data: vars, error: varsErr } = await supabase
      .from("product_variants")
      .select("id,product_id,size,color,stock,price_override,is_active,created_at")
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });

    if (varsErr) console.error(varsErr);

    const grouped = {};
    for (const v of vars ?? []) {
      if (!grouped[v.product_id]) grouped[v.product_id] = [];
      grouped[v.product_id].push(v);
    }
    setVariantsByProduct(grouped);

    const variantSeed = {};
    for (const p of productList) variantSeed[p.id] = { ...emptyVariant };
    setVariantForms((prev) => ({ ...variantSeed, ...prev }));

    setForm((s) => ({
      ...s,
      category_id: s.category_id || (cats?.[0]?.id ?? ""),
    }));

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const okTerm =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);

      const okActive = !onlyActive || p.is_active === true;
      return okTerm && okActive;
    });
  }, [products, q, onlyActive]);

  const reset = () => {
    setForm({
      id: null,
      name: "",
      description: "",
      price: 0,
      category_id: categories?.[0]?.id ?? "",
      is_active: true,
      image_path: null,
    });
    setFile(null);
  };

  const edit = (p) => {
    setForm({
      id: p.id,
      name: p.name ?? "",
      description: p.description ?? "",
      price: Number(p.price ?? 0),
      category_id: p.category_id ?? "",
      is_active: !!p.is_active,
      image_path: p.image_path ?? null,
    });
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadImageIfAny = async () => {
    if (!file) return form.image_path ?? null;

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${BUSINESS_ID}/${slug(form.name || "product")}-${uid()}.${ext}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

    if (error) throw error;
    return path;
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Nombre requerido.");
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      return alert("Precio inválido.");
    }

    setSaving(true);
    try {
      const imgPath = await uploadImageIfAny();

      const payload = {
        business_id: BUSINESS_ID,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: Number(form.price),
        category_id: form.category_id || null,
        is_active: !!form.is_active,
        image_path: imgPath,
      };

      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }

      await loadAll();
      reset();
      alert("Guardado ✅");
    } catch (e) {
      console.error(e);
      alert(`Error guardando: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return alert("Escribe el nombre de la categoría.");

    const exists = categories.some((c) => c.name?.toLowerCase() === name.toLowerCase());
    if (exists) return alert("Esa categoría ya existe.");

    setSavingCategory(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          business_id: BUSINESS_ID,
          name,
        })
        .select("id,name")
        .single();

      if (error) throw error;

      await loadAll();
      setNewCategory("");
      if (data?.id) {
        setForm((s) => ({ ...s, category_id: data.id }));
      }
      alert("Categoría creada ✅");
    } catch (e) {
      console.error(e);
      alert(`Error creando categoría: ${e.message ?? e}`);
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleActive = async (p) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);

    if (error) return alert(error.message);
    loadAll();
  };

  const remove = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return alert(error.message);
    loadAll();
  };

  const setVariantField = (productId, key, value) => {
    setVariantForms((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? { ...emptyVariant }),
        [key]: value,
      },
    }));
  };

  const saveVariant = async (product) => {
    const vf = variantForms[product.id] ?? { ...emptyVariant };

    if (!vf.size.trim() && !vf.color.trim()) {
      return alert("Debes ingresar al menos talla o color.");
    }

    if (!Number.isFinite(Number(vf.stock)) || Number(vf.stock) < 0) {
      return alert("Stock inválido.");
    }

    if (!Number.isFinite(Number(vf.price_override)) || Number(vf.price_override) < 0) {
      return alert("Precio variante inválido.");
    }

    setSavingVariantFor(product.id);
    try {
      const payload = {
        business_id: BUSINESS_ID,
        product_id: product.id,
        size: vf.size.trim() || null,
        color: vf.color.trim() || null,
        stock: Number(vf.stock),
        price_override: Number(vf.price_override) > 0 ? Number(vf.price_override) : null,
        is_active: !!vf.is_active,
      };

      const { error } = await supabase.from("product_variants").insert(payload);
      if (error) throw error;

      setVariantForms((prev) => ({
        ...prev,
        [product.id]: { ...emptyVariant },
      }));

      await loadAll();
      alert("Variante creada ✅");
    } catch (e) {
      console.error(e);
      alert(`Error creando variante: ${e.message ?? e}`);
    } finally {
      setSavingVariantFor(null);
    }
  };

  const toggleVariantActive = async (variant) => {
    const { error } = await supabase
      .from("product_variants")
      .update({ is_active: !variant.is_active })
      .eq("id", variant.id);

    if (error) return alert(error.message);
    loadAll();
  };

  const removeVariant = async (variant) => {
    if (!confirm("¿Eliminar esta variante?")) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", variant.id);
    if (error) return alert(error.message);
    loadAll();
  };

  const totalStock = (productId) =>
    (variantsByProduct[productId] ?? []).reduce((acc, v) => acc + Number(v.stock ?? 0), 0);

  return (
    <AdminLayout title="Productos" subtitle="Crear, editar y activar catálogo">
      {/* Product form */}
      <section className="rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-3 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            {form.id ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={reset}
            className="rounded-2xl border border-violet-500/15 px-4 py-2 text-sm text-zinc-200 hover:bg-violet-500/10 transition"
          >
            Limpiar
          </button>
        </div>

        <div className="mt-3 sm:mt-4 grid sm:grid-cols-2 gap-2 sm:gap-3">
          <label className="grid gap-2">
            <span className="text-xs text-zinc-400">Nombre</span>
            <input
              className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
              placeholder="Ej: Polerón Nike Tech Fleece"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs text-zinc-400">Precio base (CLP)</span>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                inputMode="numeric"
                className="w-full rounded-2xl border border-violet-500/15 bg-zinc-950/40 pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                placeholder="Ej: 49.990"
                value={formatCLP(form.price)}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    price: parseCLP(e.target.value),
                  }))
                }
              />
            </div>

            {Number(form.price) > 0 ? (
              <div className="text-[11px] text-emerald-400">
                Guardará: ${Number(form.price).toLocaleString("es-CL")}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500">Ingresa el precio en pesos chilenos.</div>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-xs text-zinc-400">Categoría</span>
            <select
              className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
              value={form.category_id || ""}
              onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 flex items-center justify-between gap-3">
            <span>Activo en catálogo</span>
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-950/20 p-3 sm:p-4">
            <div className="text-sm font-bold">Crear nueva categoría</div>
            <div className="mt-2 sm:mt-3 flex flex-col gap-2 sm:gap-3">
              <input
                className="flex-1 rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                placeholder="Ej: Zapatillas"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button
                disabled={savingCategory}
                onClick={createCategory}
                className="rounded-2xl btn-accent px-5 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {savingCategory ? "Creando..." : "Crear categoría"}
              </button>
            </div>
          </div>

          <textarea
            className="sm:col-span-2 rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
            rows={4}
            placeholder="Descripción (talla, material, fit, color, etc.)"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          />

          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-zinc-300"
            />

            <div className="ml-auto flex items-center gap-2">
              {form.image_path ? (
                <a
                  className="text-xs text-violet-300 underline"
                  href={imageUrl(form.image_path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver imagen actual
                </a>
              ) : (
                <span className="text-xs text-zinc-500">Sin imagen</span>
              )}

              <button
                disabled={saving}
                onClick={save}
                className="rounded-2xl btn-accent px-5 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 text-xs text-zinc-500">
            Tip: sube imágenes cuadradas (1080x1080) para que se vean premium.
          </div>
        </div>
      </section>

      {/* Product list */}
      <section className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight">Productos</h3>

          <input
            className="sm:ml-auto rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-2.5 sm:py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <label className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 flex items-center gap-2">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            Solo activos
          </label>
        </div>

        {loading ? (
          <Loading label="Cargando productos..." />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3">
            {filtered.map((p) => {
              const variants = variantsByProduct[p.id] ?? [];
              const vf = variantForms[p.id] ?? { ...emptyVariant };

              return (
                <div key={p.id} className="rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-950/30 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="w-full sm:w-24 sm:h-24 aspect-[4/3] sm:aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-white/5 shrink-0">
                      {p.image_path ? (
                        <img className="h-full w-full object-cover" src={imageUrl(p.image_path)} alt={p.name} />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-base sm:text-lg truncate">{p.name}</div>
                          <div className="text-xs text-zinc-400 mt-0.5 sm:mt-1 line-clamp-2">
                            {p.description || "Sin descripción"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-violet-500/15 px-3 py-1 text-zinc-300">
                              Precio base: ${moneyCLP(p.price)}
                            </span>
                            <span className="rounded-full border border-violet-500/15 px-3 py-1 text-zinc-300">
                              Stock total variantes: {totalStock(p.id)}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 ${
                                p.is_active
                                  ? "bg-emerald-500 text-zinc-950"
                                  : "border border-violet-500/15 text-zinc-300"
                              }`}
                            >
                              {p.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => edit(p)}
                            className="rounded-2xl border border-violet-500/15 px-3 py-2 text-sm text-zinc-200 hover:bg-violet-500/10 transition"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => toggleActive(p)}
                            className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                              p.is_active
                                ? "bg-emerald-500 text-zinc-950"
                                : "bg-white/10 text-zinc-200 border border-violet-500/15"
                            }`}
                          >
                            {p.is_active ? "Activo" : "Inactivo"}
                          </button>

                          <button
                            onClick={() => remove(p)}
                            className="rounded-2xl border border-rose-400/20 px-3 py-2 text-sm text-rose-300 hover:bg-rose-400/10 transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Variants section */}
                      <div className="mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-zinc-900/30 p-3 sm:p-4">
                        <div className="text-sm font-bold">Variantes</div>

                        {variants.length === 0 ? (
                          <div className="mt-3 text-sm text-zinc-400">Aún no hay variantes para este producto.</div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {variants.map((v) => (
                              <div
                                key={v.id}
                                className="rounded-xl sm:rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs sm:text-sm font-semibold text-zinc-200">
                                    {v.size ? `Talla: ${v.size}` : "Sin talla"}
                                    {" • "}
                                    {v.color ? `Color: ${v.color}` : "Sin color"}
                                  </div>
                                  <div className="text-xs text-zinc-400 mt-1">
                                    Stock: {v.stock}
                                    {" • "}
                                    Precio variante:{" "}
                                    {v.price_override ? `$${moneyCLP(v.price_override)}` : "usa precio base"}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => toggleVariantActive(v)}
                                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                                      v.is_active
                                        ? "bg-emerald-500 text-zinc-950"
                                        : "bg-white/10 text-zinc-200 border border-violet-500/15"
                                    }`}
                                  >
                                    {v.is_active ? "Activa" : "Inactiva"}
                                  </button>

                                  <button
                                    onClick={() => removeVariant(v)}
                                    className="rounded-2xl border border-rose-400/20 px-3 py-2 text-sm text-rose-300 hover:bg-rose-400/10 transition"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                          <input
                            className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                            placeholder="Talla (S, M, L, 42...)"
                            value={vf.size}
                            onChange={(e) => setVariantField(p.id, "size", e.target.value)}
                          />

                          <input
                            className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                            placeholder="Color"
                            value={vf.color}
                            onChange={(e) => setVariantField(p.id, "color", e.target.value)}
                          />

                          <input
                            inputMode="numeric"
                            className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                            placeholder="Stock"
                            value={vf.stock}
                            onChange={(e) => setVariantField(p.id, "stock", parseCLP(e.target.value))}
                          />

                          <input
                            inputMode="numeric"
                            className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                            placeholder="Precio variante (opcional)"
                            value={vf.price_override ? formatCLP(vf.price_override) : ""}
                            onChange={(e) => setVariantField(p.id, "price_override", parseCLP(e.target.value))}
                          />

                          <button
                            disabled={savingVariantFor === p.id}
                            onClick={() => saveVariant(p)}
                            className="col-span-2 sm:col-span-1 rounded-2xl btn-accent px-5 py-2.5 sm:py-3 text-sm hover:opacity-90 disabled:opacity-60"
                          >
                            {savingVariantFor === p.id ? "Guardando..." : "Agregar variante"}
                          </button>
                        </div>

                        <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={!!vf.is_active}
                            onChange={(e) => setVariantField(p.id, "is_active", e.target.checked)}
                          />
                          Variante activa
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 ? (
              <div className="text-sm text-zinc-400">No hay productos con ese filtro.</div>
            ) : null}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}