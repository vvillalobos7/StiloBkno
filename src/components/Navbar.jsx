import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";
import { supabase } from "../lib/supabase";
import useAdmin from "../hooks/useAdmin";

export default function Navbar({ subtitle = "Drop premium | Streetwear | Tendencia" }) {
  const { count, total } = useCart();
  const [hasSession, setHasSession] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAdmin();

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

  const logout = async () => {
    await supabase.auth.signOut();
    location.href = "/";
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-violet-500/10 glass">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center font-black tracking-tight text-sm shadow-lg shadow-violet-500/20">
              SB
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold tracking-tight text-lg leading-none">
                StiloBkno
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-200">
                  PRO
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate max-w-[200px]">{subtitle}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-auto hidden lg:flex items-center gap-2">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/catalog" className={navClass}>
              Catálogo
            </NavLink>

            <Link
              to="/checkout"
              className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-violet-500/30 flex items-center gap-2 transition"
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

                {/* Admin Panel button — only visible for admins */}
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-2 rounded-xl text-sm border border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400/60 flex items-center gap-2 transition shadow-sm shadow-amber-500/10"
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
              <div className="font-extrabold tracking-tight text-gradient">StiloBkno</div>
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

            <nav className="p-4 space-y-1" onClick={() => setOpen(false)}>
              <NavLink to="/" className={mobileNavClass} end>
                🏠 Home
              </NavLink>
              <NavLink to="/catalog" className={mobileNavClass}>
                🛍️ Catálogo
              </NavLink>
              <NavLink to="/checkout" className={mobileNavClass}>
                🛒 Checkout
              </NavLink>

              <div className="my-3 border-t border-violet-500/10" />

              {hasSession ? (
                <>
                  <NavLink to="/my-orders" className={mobileNavClass}>
                    📦 Mis pedidos
                  </NavLink>
                  <NavLink to="/addresses" className={mobileNavClass}>
                    📍 Mis direcciones
                  </NavLink>
                  <NavLink to="/profile" className={mobileNavClass}>
                    👤 Mi perfil
                  </NavLink>

                  {/* Admin Panel link — mobile — only for admins */}
                  {isAdmin && (
                    <>
                      <div className="my-3 border-t border-amber-500/20" />
                      <NavLink
                        to="/admin/dashboard"
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
                <NavLink to="/auth" className={mobileNavClass}>
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
