import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import useAdmin from "../../hooks/useAdmin";

export default function AdminLogin() {
  const nav = useNavigate();
  const { isAdmin, loading: checkingAdmin } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // If already logged in as admin, redirect to dashboard
  if (!checkingAdmin && isAdmin) {
    nav("/admin/dashboard", { replace: true });
    return null;
  }

  const login = async () => {
    if (!email || !password) return setError("Completa email y password.");
    setError("");
    setBusy(true);

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      setBusy(false);
      return setError(authErr.message);
    }

    // Check if user has admin role
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setBusy(false);
      return setError("Error obteniendo usuario.");
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    setBusy(false);

    if (profileErr || profile?.role !== "admin") {
      await supabase.auth.signOut();
      return setError("No tienes permisos de administrador.");
    }

    nav("/admin/dashboard", { replace: true });
  };

  const forgot = async () => {
    if (!email) return setError("Escribe tu email primero.");
    setBusy(true);
    setError("");
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetErr) return setError(resetErr.message);
    setError("");
    alert("Listo: revisa tu correo para resetear contraseña.");
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-300">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="h-10 w-10 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white font-black animate-pulse-glow">
            SB
          </div>
          <div className="text-sm text-zinc-400">Verificando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md animate-slide-up">
        <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-6 shadow-xl shadow-violet-500/5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950 grid place-items-center font-black shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="text-xs text-amber-300/70 font-medium">Panel Admin</div>
              <h2 className="text-xl font-extrabold tracking-tight">StiloBkno</h2>
            </div>
          </div>

          <div className="mt-2 text-sm text-zinc-400">
            Accede al panel para gestionar productos, pedidos y métricas.
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 animate-slide-up-sm">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs text-zinc-400">Email</span>
              <input
                className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                placeholder="admin@stilobkno.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs text-zinc-400">Contraseña</span>
              <input
                className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 transition"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
            </label>

            <button
              disabled={busy}
              onClick={login}
              className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold py-3 hover:opacity-90 disabled:opacity-60 transition shadow-lg shadow-amber-500/20"
            >
              {busy ? "Verificando..." : "Acceder como Admin"}
            </button>

            <button
              disabled={busy}
              onClick={forgot}
              className="rounded-2xl border border-violet-500/15 py-3 text-sm text-zinc-200 hover:bg-violet-500/10 disabled:opacity-60 transition"
            >
              Olvidé mi contraseña
            </button>

            <a
              href="/"
              className="text-center text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              ← Volver a la tienda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}