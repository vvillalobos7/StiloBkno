import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return alert(error.message);
    nav("/admin/products");
  };

  const forgot = async () => {
    if (!email) return alert("Escribe tu email primero.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return alert(error.message);
    alert("Listo: revisa tu correo para resetear contraseña.");
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
        <div className="text-xs text-zinc-400">Panel Admin</div>
        <h2 className="text-2xl font-extrabold tracking-tight">StiloBkno</h2>

        <div className="mt-6 grid gap-3">
          <input
            className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={busy}
            onClick={login}
            className="rounded-2xl bg-white text-zinc-950 font-extrabold py-3 hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>

          <button
            disabled={busy}
            onClick={forgot}
            className="rounded-2xl border border-white/10 py-3 text-sm text-zinc-200 hover:bg-white/5"
          >
            Olvidé mi contraseña
          </button>

          <button
            disabled={busy}
            onClick={async () => {
              await supabase.auth.signOut();
              alert("Sesión cerrada.");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            (Opcional) Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
