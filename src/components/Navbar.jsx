import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";
import { supabase, BUSINESS_ID, STORAGE_BUCKET } from "../lib/supabase";
import useAdmin from "../hooks/useAdmin";

const BRAND_CARDS = [
  {
    name: "Nike",
    gradient: "from-zinc-900 to-black",
    textClass: "text-[10px] font-black italic uppercase tracking-wider text-zinc-300 group-hover:text-white transition-colors",
    logo: (
      <svg className="w-9 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M21 6.5c-2.3 1.8-5.3 4.2-7.5 7-3.8-1.5-7.8-1.2-10-.2-1.3.6-2 .9-2.3 1 .2-.9.9-2.8 2.8-5 1.4-1.6 2.3-2.5 3.2-3.8 2.2-2.3 4.8-4.2 8.3-4.5 1.5-.1 3.5.5 5.5 5.5z" />
      </svg>
    )
  },
  {
    name: "Jordan",
    gradient: "from-zinc-900 to-red-950/40",
    textClass: "text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors",
    logo: (
      <svg className="w-5 h-5 fill-current text-rose-500" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3a9 9 0 0 1 0 18" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M3 12a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M6 6c3 3 3 9 0 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M18 6c-3 3-3 9 0 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    )
  },
  {
    name: "Hugo Boss",
    gradient: "from-zinc-950 to-amber-950/20",
    textClass: "text-[10px] font-medium uppercase tracking-[0.25em] text-amber-200 group-hover:text-amber-100 transition-colors",
    logo: (
      <svg className="w-5 h-5 stroke-current text-amber-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
        <rect x="5" y="6" width="14" height="12" rx="2" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="13" y2="14" />
      </svg>
    )
  },
  {
    name: "Calvin Klein",
    gradient: "from-zinc-900 to-zinc-800/80",
    textClass: "text-[9px] font-light tracking-[0.3em] uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors",
    logo: (
      <span className="text-xs font-bold tracking-widest text-zinc-100">ck</span>
    )
  },
  {
    name: "Coach",
    gradient: "from-zinc-950 to-orange-950/20",
    textClass: "text-[10px] font-serif italic tracking-wider text-amber-100/80 group-hover:text-amber-100 transition-colors",
    logo: (
      <span className="text-xs font-serif tracking-widest text-amber-300">C</span>
    )
  },
  {
    name: "New Era",
    gradient: "from-zinc-900 to-blue-950/20",
    textClass: "text-[10px] font-black italic tracking-wider text-blue-200 group-hover:text-white transition-colors",
    logo: (
      <svg className="w-5 h-5 fill-current text-blue-400" viewBox="0 0 24 24">
        <path d="M12 4c-4.4 0-8 3.6-8 8v2c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4v-2c0-4.4-3.6-8-8-8zm-5 10c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm10 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
        <path d="M2 18h20v2H2z" />
      </svg>
    )
  },
  {
    name: "Street Luxe",
    gradient: "from-violet-950/30 to-fuchsia-950/30",
    textClass: "text-[9px] font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300",
    logo: (
      <svg className="w-5 h-5 fill-current text-fuchsia-400" viewBox="0 0 24 24">
        <path d="M12 2L2 9l3 11h14l3-11L12 2zm4.5 15.5h-9l-1.5-6 6 4 6-4-1.5 6z" />
      </svg>
    )
  }
];

export default function Navbar({ subtitle = "Drop premium | Streetwear | Tendencia" }) {
  const { count, total } = useCart();
  const [hasSession, setHasSession] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAdmin();

  // Dynamic content states
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data?.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, []);

  // Fetch categories and active products
  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name")
      .eq("business_id", BUSINESS_ID)
      .order("name")
      .then(({ data }) => {
        if (data) setCategories(data);
      });

    supabase
      .from("products")
      .select("id,name,description,price,image_path,is_active")
      .eq("business_id", BUSINESS_ID)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setAllProducts(data);
      });
  }, []);

  // Live search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const term = searchQuery.toLowerCase();
    const matches = allProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
    setSearchResults(matches.slice(0, 5));
  }, [searchQuery, allProducts]);

  const imageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    location.href = "/";
  };

  const navClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm border transition ${
      isActive
        ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
        : "border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30"
    }`;

  const mobileNavClass = ({ isActive }) =>
    `block px-4 py-3 rounded-2xl text-sm font-medium transition ${
      isActive
        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
        : "text-zinc-200 hover:bg-white/5"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-violet-500/10 glass">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-center group shrink-0 select-none">
            <div>
              <div className="font-extrabold tracking-tight text-lg sm:text-xl leading-none text-zinc-100 group-hover:text-violet-300 transition-colors">
                Stilo<span className="text-gradient">Bkno</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-200 font-semibold align-middle uppercase tracking-normal">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium tracking-wide mt-1.5">{subtitle}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-auto hidden lg:flex items-center gap-2">
            {/* Hombre */}
            <div className="relative group py-2">
              <button className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30 flex items-center gap-1 transition">
                <span>Hombre</span>
                <span className="text-[10px] opacity-60 group-hover:rotate-180 transition-transform duration-200">▼</span>
              </button>
              
              <div className="absolute top-full left-0 z-50 w-64 p-4 mt-1 rounded-2xl border border-violet-500/15 bg-zinc-950/95 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-2xl">
                <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-1.5">Colección Hombre</div>
                <p className="text-[11px] text-zinc-400 mb-3">Streetwear, calzado y accesorios seleccionados.</p>
                <div className="h-px bg-violet-500/10 mb-3" />
                <div className="space-y-1">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      to={`/catalog?cat=${c.id}&gender=hombre`}
                      className="block px-3 py-2 text-xs text-zinc-300 rounded-xl hover:bg-violet-500/10 hover:text-white transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-xs text-zinc-500 py-1">Cargando categorías...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Mujer */}
            <div className="relative group py-2">
              <button className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30 flex items-center gap-1 transition">
                <span>Mujer</span>
                <span className="text-[10px] opacity-60 group-hover:rotate-180 transition-transform duration-200">▼</span>
              </button>
              
              <div className="absolute top-full left-0 z-50 w-64 p-4 mt-1 rounded-2xl border border-violet-500/15 bg-zinc-950/95 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-2xl">
                <div className="text-[10px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-1.5">Colección Mujer</div>
                <p className="text-[11px] text-zinc-400 mb-3">Cortes premium, calzado y accesorios en tendencia.</p>
                <div className="h-px bg-fuchsia-500/10 mb-3" />
                <div className="space-y-1">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      to={`/catalog?cat=${c.id}&gender=mujer`}
                      className="block px-3 py-2 text-xs text-zinc-300 rounded-xl hover:bg-fuchsia-500/10 hover:text-white transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-xs text-zinc-500 py-1">Cargando categorías...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Marcas */}
            <div className="relative group py-2">
              <button className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30 flex items-center gap-1 transition">
                <span>Marcas</span>
                <span className="text-[10px] opacity-60 group-hover:rotate-180 transition-transform duration-200">▼</span>
              </button>
              
              <div className="absolute top-full right-0 lg:left-0 z-50 w-[420px] p-4 mt-1 rounded-2xl border border-violet-500/15 bg-zinc-950/95 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-2xl">
                <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1.5">Nuestras Marcas</div>
                <p className="text-[11px] text-zinc-400 mb-3">Drops oficiales y colecciones seleccionadas.</p>
                <div className="h-px bg-amber-500/10 mb-3" />
                
                <div className="grid grid-cols-2 gap-2">
                  {BRAND_CARDS.map((brand) => (
                    <Link
                      key={brand.name}
                      to={`/catalog?brand=${encodeURIComponent(brand.name)}`}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-gradient-to-br ${brand.gradient} hover:border-violet-500/40 hover:scale-[1.02] transition duration-200 text-center select-none h-[68px] relative group/card overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                      {brand.logo ? (
                        <div className="text-zinc-200 h-6 flex items-center justify-center mb-1 drop-shadow-md">
                          {brand.logo}
                        </div>
                      ) : null}
                      <span className={brand.textClass}>{brand.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative mx-3 flex-1 max-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full rounded-xl border border-white/10 bg-zinc-900/40 pl-8 pr-7 py-1.5 text-xs outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition text-zinc-200"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}

              {/* Live search dropdown popover */}
              {showSearchDropdown && searchQuery.trim() && (
                <div className="absolute top-full mt-2 right-0 z-50 rounded-2xl border border-violet-500/20 bg-zinc-950/95 backdrop-blur-xl p-2.5 shadow-2xl animate-slide-up-sm w-[300px]">
                  <div className="text-[10px] text-zinc-500 px-2 pb-1.5 border-b border-white/5 uppercase tracking-wider font-semibold">
                    Coincidencias
                  </div>
                  <div className="mt-1.5 space-y-1 max-h-[220px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((p) => (
                        <Link
                          key={p.id}
                          to={`/catalog?product=${p.id}`}
                          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition text-left"
                        >
                          <div className="h-9 w-9 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
                            {p.image_path ? (
                              <img
                                src={imageUrl(p.image_path)}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-[8px] text-zinc-600">No img</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-zinc-200 truncate">{p.name}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">${moneyCLP(p.price)}</div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-xs text-zinc-500 text-center py-4">No se encontraron productos</div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 text-center">
                    <Link
                      to={`/catalog?q=${encodeURIComponent(searchQuery)}`}
                      className="text-[10px] text-violet-300 hover:text-violet-200 font-semibold underline block"
                    >
                      Ver todos los resultados
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/checkout"
              className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30 flex items-center gap-2 transition flex-shrink-0"
            >
              <span className="inline-flex h-6 w-6 rounded-lg bg-violet-500/20 items-center justify-center text-xs">
                🛒
              </span>
              <span>Carrito</span>
              <span className="ml-1 text-xs px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-200">
                {count} · ${moneyCLP(total)}
              </span>
            </Link>

            {hasSession ? (
              <>
                <NavLink to="/my-orders" className={navClass}>
                  Pedidos
                </NavLink>
                <NavLink to="/profile" className={navClass}>
                  Perfil
                </NavLink>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-2 rounded-xl text-sm border border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400/60 flex items-center gap-2 transition shadow-sm shadow-amber-500/10 flex-shrink-0"
                  >
                    <span className="text-xs">⚡</span>
                    <span className="font-semibold">Admin</span>
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 transition"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-3 py-2 rounded-xl text-sm border border-violet-500/30 text-violet-200 hover:bg-violet-500/10 transition"
              >
                Entrar
              </Link>
            )}
          </nav>

          {/* Mobile: cart + hamburger */}
          <div className="ml-auto flex lg:hidden items-center gap-2">
            <Link
              to="/checkout"
              className="relative px-2.5 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 transition"
            >
              <span className="text-sm">🛒</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold grid place-items-center shadow-lg shadow-violet-500/30">
                  {count}
                </span>
              )}
            </Link>

            <button
              onClick={() => setOpen(true)}
              className="px-2.5 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 transition"
              aria-label="Abrir menú"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />

          <div className="absolute top-0 right-0 h-full w-[280px] max-w-[85vw] bg-zinc-950 border-l border-violet-500/15 animate-slide-in-right overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
              <div className="font-extrabold tracking-tight text-zinc-100 text-lg">Stilo<span className="text-gradient">Bkno</span></div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border border-white/10 grid place-items-center text-zinc-300 hover:bg-white/5 transition"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-3 border-b border-violet-500/10">
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3"
              >
                <span className="text-lg">🛒</span>
                <div>
                  <div className="text-sm font-semibold">{count} producto(s)</div>
                  <div className="text-xs text-zinc-400">${moneyCLP(total)}</div>
                </div>
              </Link>
            </div>

            {/* Mobile Search */}
            <div className="px-4 py-3 border-b border-violet-500/10">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/40 pl-9 pr-8 py-2 text-xs outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition text-zinc-200"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    ✕
                  </button>
                )}

                {/* Mobile search dropdown overlay */}
                {showSearchDropdown && searchQuery.trim() && (
                  <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border border-violet-500/20 bg-zinc-950/95 backdrop-blur-xl p-2 shadow-2xl animate-slide-up-sm">
                    <div className="text-[9px] text-zinc-500 px-2 pb-1.5 border-b border-white/5 uppercase tracking-wider font-semibold">
                      Coincidencias
                    </div>
                    <div className="mt-1 space-y-1 max-h-[180px] overflow-y-auto">
                      {searchResults.length > 0 ? (
                        searchResults.map((p) => (
                          <Link
                            key={p.id}
                            to={`/catalog?product=${p.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition text-left"
                          >
                            <div className="h-8 w-8 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
                              {p.image_path ? (
                                <img
                                  src={imageUrl(p.image_path)}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full grid place-items-center text-[7px] text-zinc-600">No img</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-zinc-200 truncate">{p.name}</div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">${moneyCLP(p.price)}</div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="text-[9px] text-zinc-500 text-center py-3">No se encontraron productos</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <nav className="p-4 space-y-2">
              <NavLink to="/" onClick={() => setOpen(false)} className={mobileNavClass} end>
                🏠 Home
              </NavLink>
              <NavLink to="/catalog" onClick={() => setOpen(false)} className={mobileNavClass}>
                🛍️ Catálogo
              </NavLink>

              {/* Accordion Hombre */}
              <div className="border border-white/5 rounded-2xl bg-zinc-900/20 overflow-hidden">
                <button
                  onClick={() => setActiveMobileMenu(activeMobileMenu === "hombre" ? null : "hombre")}
                  className="w-full text-left px-4 py-3 flex items-center justify-between text-zinc-200 hover:bg-white/5 transition"
                >
                  <span className="text-sm font-semibold">🧔 Hombre</span>
                  <span className={`text-xs transition-transform duration-200 ${activeMobileMenu === "hombre" ? "rotate-180" : ""}`}>▼</span>
                </button>
                {activeMobileMenu === "hombre" && (
                  <div className="px-3 pb-3 pt-1 space-y-1 bg-zinc-950/40 border-t border-white/5 animate-slide-up-sm">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        to={`/catalog?cat=${c.id}&gender=hombre`}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion Mujer */}
              <div className="border border-white/5 rounded-2xl bg-zinc-900/20 overflow-hidden">
                <button
                  onClick={() => setActiveMobileMenu(activeMobileMenu === "mujer" ? null : "mujer")}
                  className="w-full text-left px-4 py-3 flex items-center justify-between text-zinc-200 hover:bg-white/5 transition"
                >
                  <span className="text-sm font-semibold">👩 Mujer</span>
                  <span className={`text-xs transition-transform duration-200 ${activeMobileMenu === "mujer" ? "rotate-180" : ""}`}>▼</span>
                </button>
                {activeMobileMenu === "mujer" && (
                  <div className="px-3 pb-3 pt-1 space-y-1 bg-zinc-950/40 border-t border-white/5 animate-slide-up-sm">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        to={`/catalog?cat=${c.id}&gender=mujer`}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion Marcas */}
              <div className="border border-white/5 rounded-2xl bg-zinc-900/20 overflow-hidden">
                <button
                  onClick={() => setActiveMobileMenu(activeMobileMenu === "marcas" ? null : "marcas")}
                  className="w-full text-left px-4 py-3 flex items-center justify-between text-zinc-200 hover:bg-white/5 transition"
                >
                  <span className="text-sm font-semibold">🏷️ Marcas</span>
                  <span className={`text-xs transition-transform duration-200 ${activeMobileMenu === "marcas" ? "rotate-180" : ""}`}>▼</span>
                </button>
                {activeMobileMenu === "marcas" && (
                  <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5 bg-zinc-950/40 border-t border-white/5 animate-slide-up-sm">
                    {BRAND_CARDS.map((brand) => (
                      <Link
                        key={brand.name}
                        to={`/catalog?brand=${encodeURIComponent(brand.name)}`}
                        onClick={() => setOpen(false)}
                        className="block p-2 text-center text-[10px] text-zinc-300 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition"
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <NavLink to="/checkout" onClick={() => setOpen(false)} className={mobileNavClass}>
                🛒 Checkout
              </NavLink>

              <div className="my-3 border-t border-violet-500/10" />

              {hasSession ? (
                <>
                  <NavLink to="/my-orders" onClick={() => setOpen(false)} className={mobileNavClass}>
                    📦 Mis pedidos
                  </NavLink>
                  <NavLink to="/addresses" onClick={() => setOpen(false)} className={mobileNavClass}>
                    📍 Mis direcciones
                  </NavLink>
                  <NavLink to="/profile" onClick={() => setOpen(false)} className={mobileNavClass}>
                    👤 Mi perfil
                  </NavLink>

                  {isAdmin && (
                    <>
                      <div className="my-3 border-t border-amber-500/20" />
                      <NavLink
                        to="/admin/dashboard"
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-3 rounded-2xl text-sm font-semibold transition border ${
                            isActive
                              ? "bg-amber-500/20 text-amber-100 border-amber-500/40 shadow-lg shadow-amber-500/10"
                              : "text-amber-200 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15"
                          }`
                        }
                      >
                        ⚡ Panel Admin
                      </NavLink>
                    </>
                  )}

                  <div className="my-3 border-t border-violet-500/10" />

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 rounded-2xl text-sm text-rose-300 hover:bg-rose-400/10 transition"
                  >
                    🚪 Cerrar sesión
                  </button>
                </>
              ) : (
                <NavLink to="/auth" onClick={() => setOpen(false)} className={mobileNavClass}>
                  🔐 Entrar / Crear cuenta
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
