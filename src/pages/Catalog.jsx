import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";

const BRAND_CHIPS = ["Nike", "Jordan", "Hugo Boss", "Calvin Klein", "Coach", "New Era", "Puma", "Adidas"];

export default function Catalog() {


    const [params] = useSearchParams();
    useEffect(() => {
  const urlCat = params.get("cat");
  if (urlCat) setCat(urlCat);
    }, [params]);
    
  const { add } = useCart();
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const [quick, setQuick] = useState(null);

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

      const { data: prods, error } = await supabase
        .from("products")
        .select("id,name,description,price,category_id,image_path,created_at")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setProducts(prods ?? []);

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
              Viste tendencia. <span className="text-zinc-300">Compra rápido. Envia por WhatsApp.</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Catálogo premium con estilo street & luxe. Agrega al carrito y manda tu pedido con notas de talla/color.
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
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                imageUrl={imageUrl}
                onAdd={() => add(p)}
                onQuickView={() => setQuick(p)}
              />
            ))}
          </div>
        )}
      </section>

      <ProductModal
        open={!!quick}
        product={quick}
        imageUrl={imageUrl}
        onAdd={() => {
          add(quick);
          setQuick(null);
        }}
        onClose={() => setQuick(null)}
      />
    </div>
  );
}
