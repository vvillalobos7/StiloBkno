import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-xl text-sm border transition ${
    isActive
      ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
      : "border-violet-500/15 text-zinc-300 hover:bg-violet-500/10 hover:border-violet-500/30"
  }`;

export default function AdminLayout({ title, subtitle, children, rightSlot }) {
  const nav = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Admin header — matching store design */}
      <header className="sticky top-0 z-40 border-b border-violet-500/10 glass">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          {/* Logo → Home */}
          <Link to="/" className="flex items-center group shrink-0 select-none" title="Volver a la tienda">
            <div>
              <div className="font-extrabold tracking-tight text-lg sm:text-xl leading-none text-zinc-100 group-hover:text-violet-300 transition-colors flex items-center gap-1.5">
                Stilo<span className="text-gradient">Bkno</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold uppercase tracking-normal align-middle">
                  ADMIN
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate max-w-[200px] mt-1.5 sm:mt-1">
                {title ?? "Panel de administración"}
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-auto hidden lg:flex items-center gap-2">
            <NavLink to="/admin/dashboard" className={linkClass}>
              📊 Dashboard
            </NavLink>
            <NavLink to="/admin/products" className={linkClass}>
              🛍️ Productos
            </NavLink>
            <NavLink to="/admin/orders" className={linkClass}>
              📦 Pedidos
            </NavLink>
            <NavLink to="/admin/banners" className={linkClass}>
              🖼️ Banners
            </NavLink>

            <div className="w-px h-6 bg-violet-500/15 mx-1" />

            {/* Right slot (realtime indicator, refresh btn, etc.) */}
            {rightSlot}

            <Link
              to="/"
              className="px-3 py-2 rounded-xl text-sm border border-emerald-500/30 text-emerald-200 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-400/50 transition flex items-center gap-1.5"
            >
              🏠 <span>Tienda</span>
            </Link>

            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl text-sm border border-violet-500/15 text-zinc-400 hover:bg-violet-500/10 hover:text-zinc-200 transition"
            >
              Salir
            </button>
          </nav>

          {/* Mobile nav */}
          <MobileAdminNav logout={logout} title={title} />
        </div>
      </header>

      {/* Page header */}
      {(title || subtitle) && (
        <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 pb-1 sm:pb-2">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gradient">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12">
        {children}
      </main>
    </div>
  );
}

/* ── Mobile admin navigation ── */
function MobileAdminNav({ logout, title }) {
  return (
    <div className="ml-auto flex lg:hidden items-center gap-1.5">
      {/* Show current page name on mobile */}
      <span className="text-[11px] font-semibold text-zinc-400 mr-1 hidden min-[400px]:inline">
        {title}
      </span>
      <MobileAdminMenu logout={logout} />
    </div>
  );
}

function MobileAdminMenu({ logout }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-xl border border-violet-500/15 text-zinc-300 hover:bg-violet-500/10 transition grid place-items-center"
        aria-label="Abrir menú admin"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />

          <div className="absolute top-0 right-0 h-full w-[280px] max-w-[85vw] bg-zinc-950 border-l border-violet-500/15 animate-slide-in-right overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
                <div className="font-extrabold tracking-tight text-zinc-100 text-sm">
                  Stilo<span className="text-gradient">Bkno</span>
                </div>
                <div className="mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold uppercase tracking-normal">
                    ADMIN
                  </span>
                </div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border border-violet-500/15 grid place-items-center text-zinc-300 hover:bg-violet-500/10 transition"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <nav className="p-3 space-y-1" onClick={() => setOpen(false)}>
              <MobileNavItem to="/admin/dashboard" icon="📊" label="Dashboard" />
              <MobileNavItem to="/admin/products" icon="🛍️" label="Productos" />
              <MobileNavItem to="/admin/orders" icon="📦" label="Pedidos" />
              <MobileNavItem to="/admin/banners" icon="🖼️" label="Banners" />

              <div className="my-3 border-t border-violet-500/10" />

              <Link
                to="/"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-emerald-200 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 transition"
              >
                <span className="text-base">🏠</span>
                <span>Volver a la tienda</span>
              </Link>

              <div className="my-3 border-t border-violet-500/10" />

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-rose-300 hover:bg-rose-400/10 transition"
              >
                <span className="text-base">🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
          isActive
            ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
            : "text-zinc-200 hover:bg-violet-500/10"
        }`
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
