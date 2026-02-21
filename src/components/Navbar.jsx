import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../store/cart";
import { moneyCLP } from "../utils/format";
import { supabase } from "../lib/supabase";

export default function Navbar({ subtitle = "Drop premium | Streetwear | Tendencia" }) {
  const { count, total } = useCart();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data?.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const navClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm border transition ${
      isActive
        ? "bg-white text-zinc-950 border-white"
        : "border-white/10 text-zinc-200 hover:bg-white/5"
    }`;

  const logout = async () => {
    await supabase.auth.signOut();
    location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/75 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-2xl bg-white text-zinc-950 grid place-items-center font-black tracking-tight">
            SB
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-lg leading-none">
              StiloBkno
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-zinc-200">
                PRO
              </span>
            </div>
            <div className="text-xs text-zinc-400">{subtitle}</div>
          </div>
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>

          <NavLink to="/catalog" className={navClass}>
            Catálogo
          </NavLink>

          <Link
            to="/checkout"
            className="px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-200 hover:bg-white/5 flex items-center gap-2 transition"
          >
            <span className="inline-flex h-6 w-6 rounded-lg bg-white/10 items-center justify-center">
              🛒
            </span>
            <span className="hidden sm:inline">Carrito</span>
            <span className="ml-1 text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
              {count} · ${moneyCLP(total)}
            </span>
          </Link>

          {hasSession ? (
            <>
              <NavLink to="/my-orders" className={navClass}>
                Mis pedidos
              </NavLink>

              <NavLink to="/profile" className={navClass}>
                Perfil
              </NavLink>

              <button
                onClick={logout}
                className="hidden md:inline px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-200 hover:bg-white/5 transition"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-200 hover:bg-white/5 transition"
            >
              Entrar
            </Link>
          )}

          <Link
            to="/admin/login"
            className="hidden lg:inline px-3 py-2 rounded-xl text-sm border border-white/10 text-zinc-200 hover:bg-white/5 transition"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
