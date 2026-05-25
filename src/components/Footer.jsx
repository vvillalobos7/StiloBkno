import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-violet-500/10 bg-zinc-950 mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col md:flex-row gap-8 md:items-start md:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-full overflow-hidden border border-amber-500/30 shadow-md shadow-amber-500/10 shrink-0 bg-zinc-950">
                <img src="/logo.jpg" alt="StiloBkno Logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-extrabold tracking-tight text-lg leading-none text-zinc-100">
                  Stilo<span className="text-gradient">Bkno</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-1.5">Streetwear premium • Drops curados</div>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-sm text-zinc-500 leading-relaxed">
              Drops seleccionados con estilo de marca. Coordina tu compra rápido por WhatsApp.
            </p>
          </div>

          {/* Nav links */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
            <Link to="/" className="text-zinc-400 hover:text-violet-300 transition">
              Home
            </Link>
            <Link to="/catalog" className="text-zinc-400 hover:text-violet-300 transition">
              Catálogo
            </Link>
            <Link to="/checkout" className="text-zinc-400 hover:text-violet-300 transition">
              Carrito
            </Link>
            <Link to="/my-orders" className="text-zinc-400 hover:text-violet-300 transition">
              Mis pedidos
            </Link>
            <a href="#como-comprar" className="text-zinc-400 hover:text-violet-300 transition">
              Cómo comprar
            </a>
            <Link to="/profile" className="text-zinc-400 hover:text-violet-300 transition">
              Mi perfil
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-violet-500/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-700">
            © {new Date().getFullYear()} StiloBkno. Todos los derechos reservados.
          </div>
          <div className="flex gap-4 text-xs text-zinc-600">
            <span>Streetwear</span>
            <span className="text-violet-500/40">•</span>
            <span>Drops</span>
            <span className="text-fuchsia-500/40">•</span>
            <span>Premium</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
