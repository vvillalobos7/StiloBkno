import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import HeroBanner from "../components/HeroBanner";
import SR from "../components/ScrollReveal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";

const BRAND_CHIPS = ["Nike", "Jordan", "Hugo Boss", "Calvin Klein", "Coach", "New Era", "Street Luxe"];

export default function Home() {
  const { add } = useCart();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [banners, setBanners] = useState([]);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const bannerImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: bData } = await supabase
        .from("banners")
        .select("*")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });

      setBanners(
        (bData ?? []).map((b) => ({
          ...b,
          imageUrl: bannerImageUrl(b.image_path),
        }))
      );

      const { data: cats, error: catsErr } = await supabase
        .from("categories")
        .select("id,name")
        .eq("business_id", BUSINESS_ID)
        .order("name");
      if (catsErr) console.error(catsErr);
      setCategories(cats ?? []);

      const { data: prods, error: prodsErr } = await supabase
        .from("products")
        .select("id,name,description,price,category_id,image_path,created_at,stock,sizes")
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
    <div className="min-h-screen flex flex-col">
      <Navbar subtitle="Streetwear premium • Drops tendencia" />

      {/* HERO */}
      {banners.length > 0 ? (
        <HeroBanner banners={banners} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 pt-8">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-500/15 bg-mesh">
            {/* Decorative orbs */}
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/15 blur-[80px] animate-float" />
            <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-violet-400/8 blur-[60px]" />

            <div className="relative p-6 sm:p-7 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-zinc-950/50 px-3 py-1.5 text-xs text-violet-200 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Drop activo • StiloBkno Curated
                  </div>

                  <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                    Tu estilo,{" "}
                    <span className="text-gradient">tu drop.</span>
                  </h1>

                  <p className="mt-4 max-w-xl text-sm md:text-base text-zinc-400 leading-relaxed">
                    Streetwear + luxe con vibra premium. Agrega al carrito y coordina por WhatsApp.
                    Drops seleccionados con estilo de marca.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {BRAND_CHIPS.map((b) => (
                      <span
                        key={b}
                        className="text-[11px] px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-200/80 hover:bg-violet-500/20 hover:text-violet-100 transition cursor-default"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/catalog"
                      className="rounded-xl btn-accent px-6 py-3 text-center text-sm"
                    >
                      Ver catálogo →
                    </Link>
                    <Link
                      to="/checkout"
                      className="rounded-xl btn-secondary px-6 py-3 text-center text-sm"
                    >
                      Ir al carrito
                    </Link>
                    <a
                      href="#como-comprar"
                      className="rounded-xl btn-ghost px-6 py-3 text-center text-sm"
                    >
                      Cómo comprar
                    </a>
                  </div>
                </div>

                {/* Large floating coin logo */}
                <div className="shrink-0 relative hidden md:block">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-500/10 to-violet-500/10 blur-[30px]" />
                  <div className="relative h-44 w-44 rounded-full overflow-hidden border-3 border-amber-400/40 shadow-2xl shadow-amber-500/30 bg-zinc-950 animate-float">
                    <img src="/logo.jpg" alt="StiloBkno Medallion" className="h-full w-full object-cover" />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat title="Entrega" value="Coordina" sub="por WhatsApp" icon="📱" />
                <MiniStat title="Drops" value="Premium" sub="curados" icon="💎" />
                <MiniStat title="Pagos" value="Flexible" sub="según acuerdo" icon="💳" />
                <MiniStat title="Soporte" value="24/7" sub="DM + WhatsApp" icon="🔥" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CATEGORÍAS */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <SR>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Explora</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">Categorías</h2>
            </div>
            <Link to="/catalog" className="text-sm text-violet-300 hover:text-violet-200 underline transition">
              Ver todo →
            </Link>
          </div>
        </SR>

        {loading ? (
          <Loading label="Cargando categorías..." />
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {catGrid.map((c, i) => (
              <SR key={c.id} delay={i + 1} variant="scale">
                <Link
                  to={`/catalog?cat=${c.id}`}
                  className="group rounded-3xl border border-violet-500/10 bg-zinc-900/40 p-5 card-hover block"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold tracking-tight text-lg group-hover:text-violet-200 transition-colors">{c.name}</div>
                    <div className="h-10 w-10 rounded-2xl bg-violet-500/10 border border-violet-500/15 grid place-items-center group-hover:bg-violet-500/20 transition text-violet-300">
                      →
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-zinc-500">
                    Selección premium en {c.name.toLowerCase()}.
                  </div>
                </Link>
              </SR>
            ))}
            {catGrid.length === 0 && (
              <div className="text-sm text-zinc-500">Aún no hay categorías.</div>
            )}
          </div>
        )}
      </section>

      {/* DESTACADOS */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10">
        <SR>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider">Últimos</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">Drops destacados</h2>
            </div>
            <Link to="/catalog" className="text-sm text-violet-300 hover:text-violet-200 underline transition">
              Ver catálogo →
            </Link>
          </div>
        </SR>

        {loading ? (
          <Loading label="Cargando destacados..." />
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((p, i) => (
              <SR key={p.id} delay={i + 1} variant="scale">
                <ProductCard
                  product={p}
                  imageUrl={imageUrl}
                  onAdd={() => add({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price ?? 0),
                    image_path: p.image_path ?? null,
                    stock: Number(p.stock ?? 0),
                  })}
                />
              </SR>
            ))}
            {featured.length === 0 && (
              <div className="text-sm text-zinc-500">Aún no hay productos activos.</div>
            )}
          </div>
        )}
      </section>

      {/* COMO COMPRAR */}
      <section id="como-comprar" className="mx-auto max-w-6xl px-4 pb-12">
        <SR>
          <div className="rounded-[2.25rem] border border-violet-500/10 bg-mesh overflow-hidden">
            <div className="p-6 sm:p-7 md:p-10">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <div>
                  <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Proceso simple</div>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Cómo comprar en{" "}
                    <span className="text-gradient">StiloBkno</span>
                  </h2>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                    Elegimos drops con estilo. Tú solo agregas, dejas notas y coordinamos por WhatsApp.
                  </p>

                  <div className="mt-6 space-y-3">
                    <Step n="1" title="Elige tu drop" desc="Explora categorías y productos premium." />
                    <Step n="2" title="Agrega al carrito" desc="En 1 click, queda listo el pedido." />
                    <Step n="3" title="Escribe tus notas" desc="Talla, color, entrega, comuna, etc." />
                    <Step n="4" title="Envía por WhatsApp" desc="Coordinamos y listo." />
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link to="/catalog" className="rounded-xl btn-accent px-5 py-2.5 text-sm">
                      Ir al catálogo
                    </Link>
                    <Link
                      to="/checkout"
                      className="rounded-xl btn-secondary px-5 py-2.5 text-sm"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>

                <SR delay={2}>
                  <div className="rounded-3xl border border-violet-500/10 bg-zinc-950/50 p-6 glow-violet">
                    <div className="text-xs text-violet-300 font-semibold">Garantía StiloBkno</div>
                    <h3 className="mt-2 text-xl font-extrabold tracking-tight">Compra con confianza</h3>

                    <div className="mt-4 grid gap-3">
                      <Benefit icon="⚡" title="Atención rápida" desc="Coordinación directa por WhatsApp." />
                      <Benefit icon="💎" title="Selección curada" desc="Drops premium con estilo tendencia." />
                      <Benefit icon="🔍" title="Transparencia" desc="Estado del pedido controlado por admin." />
                      <Benefit icon="✨" title="Experiencia premium" desc="Diseño y navegación rápidos." />
                    </div>
                  </div>
                </SR>
              </div>
            </div>
          </div>
        </SR>
      </section>

      <Footer />
    </div>
  );
}

function MiniStat({ title, value, sub, icon }) {
  return (
    <div className="rounded-2xl border border-violet-500/10 bg-zinc-900/40 p-4 card-hover">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-zinc-500">{title}</span>
      </div>
      <div className="mt-1.5 text-lg font-extrabold text-gradient-subtle">{value}</div>
      <div className="text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="flex gap-3 group">
      <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center font-extrabold text-sm shrink-0 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
        {n}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-500">{desc}</div>
      </div>
    </div>
  );
}

function Benefit({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-violet-500/10 bg-zinc-900/30 p-4 hover:border-violet-500/25 transition">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <div className="text-sm text-zinc-500 mt-1">{desc}</div>
    </div>
  );
}
