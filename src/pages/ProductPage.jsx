import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import SR from "../components/ScrollReveal";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [related, setRelated] = useState([]);
  const [categoryName, setCategoryName] = useState("");

  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    (async () => {
      setLoading(true);
      setSelectedSize(null);
      setActiveImg(0);
      setAdded(false);

      // Fetch product
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select("id,name,description,price,category_id,image_path,is_active,stock,sizes,created_at")
        .eq("id", id)
        .eq("business_id", BUSINESS_ID)
        .single();

      if (prodErr || !prod) {
        console.error(prodErr);
        setLoading(false);
        return;
      }

      setProduct(prod);

      // Fetch extra images
      const { data: imgs } = await supabase
        .from("product_images")
        .select("id,image_path,sort_order")
        .eq("product_id", id)
        .eq("business_id", BUSINESS_ID)
        .order("sort_order")
        .order("created_at");

      setExtraImages(imgs ?? []);

      // Fetch category name
      if (prod.category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("name")
          .eq("id", prod.category_id)
          .single();
        setCategoryName(cat?.name ?? "");
      }

      // Fetch related products
      if (prod.category_id) {
        const { data: rel } = await supabase
          .from("products")
          .select("id,name,description,price,image_path,stock,sizes")
          .eq("business_id", BUSINESS_ID)
          .eq("is_active", true)
          .eq("category_id", prod.category_id)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(4);

        setRelated(rel ?? []);
      } else {
        setRelated([]);
      }

      setLoading(false);
    })();
  }, [id]);

  const allImages = useMemo(() => {
    const imgs = [];
    if (product?.image_path) imgs.push(product.image_path);
    for (const ei of extraImages) imgs.push(ei.image_path);
    return imgs;
  }, [product, extraImages]);

  const sizes = useMemo(() => {
    if (!product?.sizes) return [];
    if (Array.isArray(product.sizes)) return product.sizes;
    return [];
  }, [product]);

  const handleAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      return alert("Selecciona una talla antes de agregar al carrito.");
    }

    add({
      id: product.id,
      name: product.name,
      price: Number(product.price ?? 0),
      image_path: product.image_path ?? null,
      size: selectedSize ?? null,
      stock: Number(product.stock ?? 0),
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar subtitle="Streetwear premium • Drops tendencia" />
        <div className="flex-1 grid place-items-center">
          <Loading label="Cargando producto..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar subtitle="Streetwear premium • Drops tendencia" />
        <div className="flex-1 grid place-items-center p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-extrabold">Producto no encontrado</h2>
            <p className="text-zinc-400 mt-2 text-sm">El producto que buscas no existe o fue removido.</p>
            <Link
              to="/catalog"
              className="inline-block mt-6 rounded-xl btn-accent px-5 py-2.5 text-sm"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stock = Number(product.stock ?? 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar subtitle="Streetwear premium • Drops tendencia" />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-6xl w-full px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400 flex-wrap">
          <Link to="/" className="hover:text-violet-300 transition">Inicio</Link>
          <span className="text-zinc-600">›</span>
          <Link to="/catalog" className="hover:text-violet-300 transition">Catálogo</Link>
          {categoryName && (
            <>
              <span className="text-zinc-600">›</span>
              <Link
                to={`/catalog?cat=${product.category_id}`}
                className="hover:text-violet-300 transition"
              >
                {categoryName}
              </Link>
            </>
          )}
          <span className="text-zinc-600">›</span>
          <span className="text-zinc-200 truncate max-w-[200px]">{product.name}</span>
        </div>
      </nav>

      {/* Product Content */}
      <section className="mx-auto max-w-6xl w-full px-4 pb-10 flex-1">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">

          {/* ── LEFT: Image Gallery ── */}
          <div className="animate-fade-in">
            {/* Main Image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-violet-500/15 bg-zinc-900/30">
              {allImages.length > 0 ? (
                <img
                  key={activeImg}
                  src={imageUrl(allImages[activeImg])}
                  alt={product.name}
                  className="h-full w-full object-cover animate-fade-in"
                />
              ) : (
                <div className="h-full grid place-items-center text-zinc-600 text-sm">
                  Sin imagen
                </div>
              )}

              {/* Image counter badge */}
              {allImages.length > 1 && (
                <div className="absolute bottom-3 right-3 text-xs px-3 py-1.5 rounded-full bg-zinc-950/70 border border-white/10 text-zinc-200 backdrop-blur-sm">
                  {activeImg + 1} / {allImages.length}
                </div>
              )}

              {/* Arrow navigation */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i === 0 ? allImages.length - 1 : i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-zinc-950/60 border border-white/10 grid place-items-center text-white hover:bg-zinc-950/80 backdrop-blur-sm transition"
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i === allImages.length - 1 ? 0 : i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-zinc-950/60 border border-white/10 grid place-items-center text-white hover:bg-zinc-950/80 backdrop-blur-sm transition"
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      activeImg === i
                        ? "border-violet-500 shadow-lg shadow-violet-500/20 scale-105"
                        : "border-white/10 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <img
                      src={imageUrl(img)}
                      alt={`${product.name} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="animate-slide-up">
            {/* Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-violet-400">StiloBkno • Premium Drop</span>
              {categoryName && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-200">
                  {categoryName}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-center gap-4">
              <div className="text-3xl font-extrabold text-gradient">${moneyCLP(product.price)}</div>
              <span
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  stock > 0
                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/15 border-rose-500/20 text-rose-300"
                }`}
              >
                {stock > 0 ? `${stock} disponible${stock > 1 ? "s" : ""}` : "Stock por encargo"}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-5 rounded-2xl border border-white/5 bg-zinc-900/30 p-4">
                <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Descripción</div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-zinc-200 mb-3">
                  Talla {selectedSize && <span className="text-violet-400 ml-1">— {selectedSize}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`min-w-[2.75rem] px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                        selectedSize === size
                          ? "bg-violet-600 border-violet-500 text-white"
                          : "border-white/12 text-zinc-200 hover:border-violet-500/40 hover:bg-violet-500/8"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <div className="mt-7 space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={added}
                className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 ${
                  added
                    ? "bg-emerald-500 text-white"
                    : "btn-accent"
                }`}
              >
                {added ? "✓ Agregado al carrito" : "Agregar al carrito"}
              </button>

              <Link
                to="/checkout"
                className="block w-full text-center rounded-xl btn-secondary py-3 text-sm"
              >
                Ir al carrito
              </Link>
            </div>

            {/* Extra info chips */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-center">
                <div className="text-sm">📱</div>
                <div className="text-xs text-zinc-400 mt-1">Coordina por WhatsApp</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-center">
                <div className="text-sm">💎</div>
                <div className="text-xs text-zinc-400 mt-1">Premium seleccionado</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-center">
                <div className="text-sm">🔒</div>
                <div className="text-xs text-zinc-400 mt-1">Compra segura</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-center">
                <div className="text-sm">⚡</div>
                <div className="text-xs text-zinc-400 mt-1">Entrega coordinada</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div className="mt-14">
            <SR>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-fuchsia-400 font-semibold uppercase tracking-wider">Explora más</div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                    También te puede gustar
                  </h2>
                </div>
                <Link to="/catalog" className="text-sm text-violet-300 hover:text-violet-200 underline transition">
                  Ver todo →
                </Link>
              </div>
            </SR>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((p, i) => (
                <SR key={p.id} delay={i + 1} variant="scale">
                  <ProductCard
                    product={p}
                    imageUrl={imageUrl}
                    onAdd={() => {
                      add({
                        id: p.id,
                        name: p.name,
                        price: Number(p.price ?? 0),
                        image_path: p.image_path ?? null,
                        stock: Number(p.stock ?? 0),
                      });
                    }}
                  />
                </SR>
              ))}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
