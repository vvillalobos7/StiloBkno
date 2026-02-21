import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";

const BRAND_CHIPS = ["Nike", "Jordan", "Hugo Boss", "Calvin Klein", "Coach", "New Era", "Street Luxe"];

export default function Home() {
  const { add } = useCart();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  const [quick, setQuick] = useState(null);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

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

      // destacados: últimos productos activos
      const { data: prods, error: prodsErr } = await supabase
        .from("products")
        .select("id,name,description,price,category_id,image_path,created_at")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (prodsErr) console.error(prodsErr);
      setFeatured(prods ?? []);

      setLoading(false);
    })();
  }, []);

  const catGrid = useMemo(() => categories.slice(0, 6), [categories]);

  return (
    <div className="min-h-screen">
      <Navbar subtitle="Streetwear premium • Drops tendencia" />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/50 px-3 py-1 text-xs text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Drop activo • StiloBkno Curated
            </div>

            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Tu estilo, <span className="text-zinc-300">tu drop.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm md:text-base text-zinc-300 leading-relaxed">
              Streetwear + luxe con vibra premium. Agrega al carrito y coordina por WhatsApp.
              Drops seleccionados con estilo de marca.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {BRAND_CHIPS.map((b) => (
                <span
                  key={b}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-zinc-950/60 border border-white/10 text-zinc-200"
                >
                  {b}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                to="/catalog"
                className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90"
              >
                Ver catálogo
              </Link>

              <Link
                to="/checkout"
                className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-200 hover:bg-white/5"
              >
                Ir al carrito
              </Link>

              <a
                href="#como-comprar"
                className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-200 hover:bg-white/5"
              >
                Cómo comprar
              </a>
            </div>

            <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat title="Entrega" value="Coordina" sub="por WhatsApp" />
              <MiniStat title="Drops" value="Premium" sub="curados" />
              <MiniStat title="Pagos" value="Flexible" sub="según acuerdo" />
              <MiniStat title="Soporte" value="24/7" sub="DM + WhatsApp" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400">Explora</div>
            <h2 className="text-2xl font-extrabold tracking-tight">Categorías</h2>
          </div>
          <Link to="/catalog" className="text-sm text-zinc-200 underline hover:text-white">
            Ver todo
          </Link>
        </div>

        {loading ? (
          <Loading label="Cargando categorías..." />
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {catGrid.map((c) => (
              <Link
                key={c.id}
                to={`/catalog?cat=${c.id}`}
                className="group rounded-3xl border border-white/10 bg-zinc-900/30 p-5 hover:bg-zinc-900/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold tracking-tight text-lg">{c.name}</div>
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 grid place-items-center group-hover:bg-white/15">
                    →
                  </div>
                </div>
                <div className="mt-2 text-sm text-zinc-400">
                  Selección premium en {c.name.toLowerCase()}.
                </div>
              </Link>
            ))}
            {catGrid.length === 0 ? (
              <div className="text-sm text-zinc-400">Aún no hay categorías.</div>
            ) : null}
          </div>
        )}
      </section>

      {/* DESTACADOS */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400">Últimos</div>
            <h2 className="text-2xl font-extrabold tracking-tight">Drops destacados</h2>
          </div>
          <Link to="/catalog" className="text-sm text-zinc-200 underline hover:text-white">
            Ver catálogo
          </Link>
        </div>

        {loading ? (
          <Loading label="Cargando destacados..." />
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                imageUrl={imageUrl}
                onAdd={() => add(p)}
                onQuickView={() => setQuick(p)}
              />
            ))}
            {featured.length === 0 ? (
              <div className="text-sm text-zinc-400">Aún no hay productos activos.</div>
            ) : null}
          </div>
        )}
      </section>

      {/* COMO COMPRAR */}
      <section id="como-comprar" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-[2.25rem] border border-white/10 bg-zinc-900/30 p-7 md:p-10">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div>
              <div className="text-xs text-zinc-400">Proceso simple</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Cómo comprar en StiloBkno</h2>
              <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                Elegimos drops con estilo. Tú solo agregas, dejas notas (talla/color) y coordinamos por WhatsApp.
              </p>

              <div className="mt-5 space-y-3">
                <Step n="1" title="Elige tu drop" desc="Explora categorías y productos premium." />
                <Step n="2" title="Agrega al carrito" desc="En 1 click, queda listo el pedido." />
                <Step n="3" title="Escribe tus notas" desc="Talla, color, entrega, comuna, etc." />
                <Step n="4" title="Envía por WhatsApp" desc="Coordinamos y listo." />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90"
                >
                  Ir al catálogo
                </Link>
                <Link
                  to="/checkout"
                  className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-200 hover:bg-white/5"
                >
                  Checkout
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6">
              <div className="text-xs text-zinc-300">Garantía StiloBkno</div>
              <h3 className="mt-2 text-xl font-extrabold tracking-tight">Compra con confianza</h3>

              <div className="mt-4 grid gap-3">
                <Benefit title="Atención rápida" desc="Coordinación directa por WhatsApp." />
                <Benefit title="Selección curada" desc="Drops premium con estilo tendencia." />
                <Benefit title="Transparencia" desc="Estado del pedido controlado por admin." />
                <Benefit title="Experiencia premium" desc="Diseño y navegación rápidos." />
              </div>

              <div className="mt-6 text-xs text-zinc-500">
                Consejo: agrega en notas la talla y color exactos para cerrar la compra en minutos.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div>
            <div className="font-extrabold tracking-tight text-lg">StiloBkno</div>
            <div className="text-xs text-zinc-500">Streetwear premium • Drops curados</div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/catalog" className="text-zinc-200 hover:text-white">
              Catálogo
            </Link>
            <Link to="/checkout" className="text-zinc-200 hover:text-white">
              Carrito
            </Link>
            <a href="#como-comprar" className="text-zinc-200 hover:text-white">
              Cómo comprar
            </a>
            <a href="/admin/login" className="text-zinc-200 hover:text-white">
              Admin
            </a>
          </div>
        </div>
      </footer>

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

function MiniStat({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
      <div className="text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-2xl bg-white text-zinc-950 grid place-items-center font-extrabold">
        {n}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-400">{desc}</div>
      </div>
    </div>
  );
}

function Benefit({ title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-zinc-400 mt-1">{desc}</div>
    </div>
  );
}
