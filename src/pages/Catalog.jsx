import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";

const BRAND_CHIPS = ["Nike", "Jordan", "Hugo Boss", "Calvin Klein", "Coach", "New Era", "Puma", "Adidas"];

function variantLabel(v) {
  const parts = [];
  if (v.size) parts.push(`Talla ${v.size}`);
  if (v.color) parts.push(v.color);
  return parts.length ? parts.join(" • ") : "Variante";
}

export default function Catalog() {
  const [params] = useSearchParams();
  const { add } = useCart();

  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variantsByProduct, setVariantsByProduct] = useState({});

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const [quick, setQuick] = useState(null);

  // selector de variante
  const [pickerProduct, setPickerProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    const urlCat = params.get("cat");
    if (urlCat) setCat(urlCat);
  }, [params]);

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
    return products.filter((p) => {
      const okTerm =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);

      const okCat = cat === "all" || p.category_id === cat;
      return okTerm && okCat;
    });
  }, [products, q, cat]);

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

  return (
    <div className="min-h-screen">
      <Navbar subtitle="Streetwear premium • Drops tendencia" />

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-5">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="text-xs text-zinc-300">StiloBkno • Curated Drops</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
              Viste tendencia. <span className="text-zinc-300">Compra rápido. Envía por WhatsApp.</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Catálogo premium con estilo street & luxe. Ahora con variantes por talla y color.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {BRAND_CHIPS.map((b) => (
                <span
                  key={b}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-zinc-950/60 border border-white/10 text-zinc-200"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            className="w-full md:w-[420px] rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Buscar (ej: polerón negro, jordan, coach...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="ml-auto text-xs text-zinc-400">
            Mostrando <span className="text-zinc-200 font-semibold">{filtered.length}</span> productos
          </div>
        </div>

        {loading ? (
          <Loading label="Cargando catálogo..." />
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 text-zinc-100 p-5">
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
                Cerrar
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