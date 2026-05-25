import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import SR from "../components/ScrollReveal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";

function variantLabel(v) {
  const parts = [];
  if (v.size) parts.push(`Talla ${v.size}`);
  if (v.color) parts.push(v.color);
  return parts.length ? parts.join(" • ") : "Variante";
}

const SORT_OPTIONS = [
  { value: "newest", label: "Más nuevo" },
  { value: "oldest", label: "Más antiguo" },
  { value: "price_asc", label: "Precio ↑" },
  { value: "price_desc", label: "Precio ↓" },
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const { add } = useCart();

  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variantsByProduct, setVariantsByProduct] = useState({});

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [gender, setGender] = useState("all");
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [showFilters, setShowFilters] = useState(false);

  const [quick, setQuick] = useState(null);

  // selector de variante
  const [pickerProduct, setPickerProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(params);
    if (!value || value === "all") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setParams(newParams, { replace: true });
  };

  useEffect(() => {
    const urlCat = params.get("cat");
    setCat(urlCat || "all");

    const urlGender = params.get("gender");
    setGender(urlGender || "all");

    const urlBrand = params.get("brand");
    setBrand(urlBrand || "all");

    const urlQ = params.get("q");
    setQ(urlQ || "");

    const urlProduct = params.get("product");
    if (urlProduct && products.length > 0) {
      const found = products.find((p) => p.id === urlProduct);
      if (found) setQuick(found);
    }
  }, [params, products]);

  useEffect(() => {
    (async () => {
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
        .select("id,name,description,price,category_id,image_path,created_at,is_active")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (prodsErr) console.error(prodsErr);
      const prodsList = prods ?? [];
      setProducts(prodsList);

      const { data: vars, error: varsErr } = await supabase
        .from("product_variants")
        .select("id,product_id,size,color,stock,price_override,is_active")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (varsErr) console.error(varsErr);

      const grouped = {};
      for (const v of vars ?? []) {
        if (!grouped[v.product_id]) grouped[v.product_id] = [];
        grouped[v.product_id].push(v);
      }
      setVariantsByProduct(grouped);

      setLoading(false);
    })();
  }, []);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pMin = priceMin ? Number(priceMin) : 0;
    const pMax = priceMax ? Number(priceMax) : Infinity;

    let result = products.filter((p) => {
      const okTerm =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);

      const okCat = cat === "all" || p.category_id === cat;
      const price = Number(p.price ?? 0);
      const okPrice = price >= pMin && price <= pMax;

      const categoryName = categories.find((c) => c.id === p.category_id)?.name || "";
      const okGender =
        gender === "all" ||
        p.name?.toLowerCase().includes(gender.toLowerCase()) ||
        p.description?.toLowerCase().includes(gender.toLowerCase()) ||
        categoryName.toLowerCase().includes(gender.toLowerCase());

      const okBrand =
        brand === "all" ||
        p.name?.toLowerCase().includes(brand.toLowerCase()) ||
        p.description?.toLowerCase().includes(brand.toLowerCase());

      return okTerm && okCat && okPrice && okGender && okBrand;
    });

    // Sort
    switch (sort) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "price_asc":
        result.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
        break;
      case "name_asc":
        result.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
      case "name_desc":
        result.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
        break;
    }

    return result;
  }, [products, q, cat, gender, brand, sort, priceMin, priceMax, categories]);

  const getVariants = (productId) => variantsByProduct[productId] ?? [];
  const getTotalStock = (productId) =>
    getVariants(productId).reduce((acc, v) => acc + Number(v.stock ?? 0), 0);

  const getEffectivePrice = (product, variant) => {
    if (variant?.price_override && Number(variant.price_override) > 0) {
      return Number(variant.price_override);
    }
    return Number(product?.price ?? 0);
  };

  const openVariantPicker = (product) => {
    const vars = getVariants(product.id).filter((v) => Number(v.stock ?? 0) > 0);
    setPickerProduct(product);
    setSelectedVariantId(vars[0]?.id ?? "");
  };

  const addSelectedVariantToCart = () => {
    if (!pickerProduct) return;

    const vars = getVariants(pickerProduct.id);
    const selected = vars.find((v) => v.id === selectedVariantId);

    if (!selected) return alert("Selecciona una variante.");
    if (Number(selected.stock ?? 0) <= 0) return alert("Esa variante no tiene stock.");

    add({
      id: pickerProduct.id,
      name: pickerProduct.name,
      price: getEffectivePrice(pickerProduct, selected),
      image_path: pickerProduct.image_path ?? null,
      variant_id: selected.id,
      variant_label: variantLabel(selected),
      size: selected.size ?? null,
      color: selected.color ?? null,
      stock: Number(selected.stock ?? 0),
    });

    setPickerProduct(null);
    setSelectedVariantId("");
  };

  // Active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (cat !== "all") {
      const catName = categories.find((c) => c.id === cat)?.name;
      if (catName) chips.push({ key: "cat", label: catName, clear: () => updateParam("cat", null) });
    }
    if (gender !== "all") {
      chips.push({ key: "gender", label: `Género: ${gender === "hombre" ? "Hombre" : "Mujer"}`, clear: () => updateParam("gender", null) });
    }
    if (brand !== "all") {
      chips.push({ key: "brand", label: `Marca: ${brand}`, clear: () => updateParam("brand", null) });
    }
    if (priceMin) chips.push({ key: "pmin", label: `Desde $${moneyCLP(priceMin)}`, clear: () => setPriceMin("") });
    if (priceMax) chips.push({ key: "pmax", label: `Hasta $${moneyCLP(priceMax)}`, clear: () => setPriceMax("") });
    if (q.trim()) chips.push({ key: "q", label: `"${q.trim()}"`, clear: () => { setQ(""); updateParam("q", null); } });
    return chips;
  }, [cat, gender, brand, priceMin, priceMax, q, categories, params]);

  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: true });
    setPriceMin("");
    setPriceMax("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar subtitle="Streetwear premium • Drops tendencia" />

      {/* Header */}
      <section className="mx-auto max-w-6xl w-full px-4 pt-6 sm:pt-8 pb-4">
        <div className="rounded-3xl border border-violet-500/15 bg-mesh p-5 sm:p-6 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-500/15 blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[80px]" />

          <div className="relative">
            <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider">StiloBkno • Curated Drops</div>
            <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Viste tendencia. <span className="text-gradient">Compra rápido.</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              Catálogo premium con estilo street & luxe. Filtra, busca y encuentra tu drop.
            </p>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="mx-auto max-w-6xl w-full px-4 pb-2">
        <div className="flex flex-col gap-3">
          {/* Main row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400 text-sm">🔍</span>
              <input
                className="w-full rounded-2xl border border-violet-500/15 bg-zinc-900/40 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                placeholder="Buscar producto..."
                value={q}
                onChange={(e) => {
                  const val = e.target.value;
                  setQ(val);
                  updateParam("q", val);
                }}
              />
            </div>

            {/* Category */}
            <select
              className="rounded-2xl border border-violet-500/15 bg-zinc-900/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
              value={cat}
              onChange={(e) => {
                const val = e.target.value;
                setCat(val);
                updateParam("cat", val);
              }}
            >
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              className="rounded-2xl border border-violet-500/15 bg-zinc-900/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Toggle filters */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`rounded-2xl border px-4 py-3 text-sm transition ${
                showFilters
                  ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
                  : "border-violet-500/15 text-violet-200 hover:bg-violet-500/10"
              }`}
            >
              ⚙️ Filtros
            </button>

            {/* View mode */}
            <div className="hidden sm:flex rounded-2xl border border-violet-500/15 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-3 text-sm transition ${
                  viewMode === "grid" ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-white/5"
                }`}
                title="Vista grilla"
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-3 text-sm transition ${
                  viewMode === "list" ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-white/5"
                }`}
                title="Vista lista"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Price filters (collapsible) */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 items-center animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Precio:</span>
                <input
                  type="number"
                  className="w-28 rounded-2xl border border-white/10 bg-zinc-900/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span className="text-zinc-500">—</span>
                <input
                  type="number"
                  className="w-28 rounded-2xl border border-white/10 bg-zinc-900/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>

              {activeFilters.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-rose-300 hover:text-rose-200 underline transition"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={f.clear}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-zinc-200 hover:bg-white/15 transition group"
                >
                  {f.label}
                  <span className="text-zinc-400 group-hover:text-rose-300 transition">✕</span>
                </button>
              ))}
            </div>
          )}

          {/* Results count */}
          <div className="text-xs text-zinc-400">
            Mostrando <span className="text-zinc-200 font-semibold">{filtered.length}</span>{" "}
            de <span className="text-zinc-200 font-semibold">{products.length}</span> productos
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-6xl w-full px-4 pb-10 flex-1">
        {loading ? (
          <Loading label="Cargando catálogo..." />
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/30 p-8 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-semibold">No encontramos productos</div>
            <div className="text-sm text-zinc-400 mt-1">Prueba con otros filtros o busca algo diferente.</div>
            {activeFilters.length > 0 && (
              <button
                onClick={clearAll}
                className="mt-4 rounded-2xl border border-white/10 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/5 transition"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* LIST VIEW */
          <div className="space-y-3">
            {filtered.map((p) => {
              const vars = getVariants(p.id);
              const stock = getTotalStock(p.id);

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4 flex gap-4 items-start hover:bg-zinc-900/50 transition"
                >
                  {/* Image */}
                  <button
                    onClick={() => setQuick(p)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-zinc-800 shrink-0"
                  >
                    {p.image_path ? (
                      <img
                        src={imageUrl(p.image_path)}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full grid place-items-center text-zinc-500 text-xs">Sin img</div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{p.description}</div>
                      </div>
                      <div className="font-extrabold whitespace-nowrap">${moneyCLP(p.price)}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-zinc-300">
                        {vars.length} variante(s)
                      </span>
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border ${
                          stock > 0
                            ? "border-emerald-400/20 text-emerald-300 bg-emerald-400/10"
                            : "border-rose-400/20 text-rose-300 bg-rose-400/10"
                        }`}
                      >
                        Stock: {stock}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openVariantPicker(p)}
                        className="rounded-xl bg-white text-zinc-950 font-semibold px-4 py-1.5 text-sm hover:opacity-90"
                      >
                        Agregar
                      </button>
                      <button
                        onClick={() => setQuick(p)}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
                      >
                        👁 Ver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const vars = getVariants(p.id);
              const stock = getTotalStock(p.id);

              const productForCard = {
                ...p,
                stock_total: stock,
                variants_count: vars.length,
              };

              return (
                <div key={p.id} className="relative">
                  <ProductCard
                    product={productForCard}
                    imageUrl={imageUrl}
                    onAdd={() => openVariantPicker(p)}
                    onQuickView={() => setQuick(p)}
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-zinc-300">
                      {vars.length} variante(s)
                    </span>
                    <span
                      className={`text-[11px] px-3 py-1 rounded-full border ${
                        stock > 0
                          ? "border-emerald-400/20 text-emerald-300 bg-emerald-400/10"
                          : "border-rose-400/20 text-rose-300 bg-rose-400/10"
                      }`}
                    >
                      Stock total: {stock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />

      <ProductModal
        open={!!quick}
        product={quick}
        imageUrl={imageUrl}
        onAdd={() => {
          if (!quick) return;
          openVariantPicker(quick);
          setQuick(null);
        }}
        onClose={() => setQuick(null)}
      />

      {/* Modal selector de variante */}
      {pickerProduct ? (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => { setPickerProduct(null); setSelectedVariantId(""); }} />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 text-zinc-100 p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-400">Selecciona variante</div>
                <h3 className="text-xl font-extrabold mt-1">{pickerProduct.name}</h3>
              </div>
              <button
                onClick={() => {
                  setPickerProduct(null);
                  setSelectedVariantId("");
                }}
                className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {(getVariants(pickerProduct.id) ?? []).length === 0 ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  Este producto no tiene variantes activas todavía.
                </div>
              ) : (
                getVariants(pickerProduct.id).map((v) => {
                  const checked = selectedVariantId === v.id;
                  const out = Number(v.stock ?? 0) <= 0;
                  const price = getEffectivePrice(pickerProduct, v);

                  return (
                    <label
                      key={v.id}
                      className={`block rounded-2xl border p-4 cursor-pointer transition ${
                        checked
                          ? "border-white bg-white/10"
                          : "border-white/10 bg-zinc-900/40 hover:bg-white/5"
                      } ${out ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="variant"
                          checked={checked}
                          disabled={out}
                          onChange={() => setSelectedVariantId(v.id)}
                          className="mt-1"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{variantLabel(v)}</div>
                          <div className="mt-1 text-xs text-zinc-400">
                            Stock: {v.stock}
                            {" • "}
                            Precio: ${moneyCLP(price)}
                          </div>
                        </div>

                        {out ? (
                          <span className="text-xs px-3 py-1 rounded-full bg-rose-400/10 text-rose-200 border border-rose-400/20">
                            Sin stock
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPickerProduct(null);
                  setSelectedVariantId("");
                }}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancelar
              </button>

              <button
                onClick={addSelectedVariantToCart}
                className="rounded-2xl bg-white text-zinc-950 font-extrabold px-5 py-3 hover:opacity-90"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}