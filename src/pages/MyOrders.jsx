import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import { moneyCLP } from "../utils/Format";

export default function MyOrders() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user ?? null;
      setUser(u);

      if (!u) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, total, status, created_at, notes,
          order_items ( id, product_name_snapshot, qty, unit_price_snapshot, line_total )
        `
        )
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  const prettyDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("es-CL");
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Mis pedidos" />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
          <h1 className="text-2xl font-extrabold tracking-tight">Mis pedidos</h1>
          <p className="text-sm text-zinc-400 mt-1">Aquí verás el estado de tus compras.</p>

          {loading ? (
            <Loading label="Cargando pedidos..." />
          ) : !user ? (
            <div className="mt-6 text-sm text-zinc-300">
              Debes iniciar sesión.{" "}
              <a className="underline text-zinc-200" href="/auth">
                Ir a login
              </a>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 text-sm text-zinc-300">
              Aún no tienes pedidos.{" "}
              <a className="underline text-zinc-200" href="/catalog">
                Ir al catálogo
              </a>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-3xl border border-white/10 bg-zinc-950/30 p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-zinc-500">ID: {o.id}</div>
                      <div className="text-xs text-zinc-400 mt-1">{prettyDate(o.created_at)}</div>
                      {o.notes ? <div className="text-xs text-zinc-300 mt-2">📝 {o.notes}</div> : null}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Estado</div>
                      <div className="text-sm font-semibold">{o.status}</div>
                      <div className="text-xs text-zinc-400 mt-2">Total</div>
                      <div className="text-lg font-extrabold">${moneyCLP(o.total)}</div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
                    {(o.order_items ?? []).map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-sm">
                        <div className="text-zinc-200">
                          {it.product_name_snapshot}{" "}
                          <span className="text-zinc-500">x{it.qty}</span>
                        </div>
                        <div className="font-semibold text-zinc-200">${moneyCLP(it.line_total)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
