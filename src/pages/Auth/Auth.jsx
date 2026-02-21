import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

export default function Auth() {
  const nav = useNavigate();

  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Si ya hay sesión, manda al perfil
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) nav("/profile", { replace: true });
    });
  }, [nav]);

  const login = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      nav("/profile", { replace: true });
    } catch (e) {
      alert(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // Si tu proyecto tiene confirmación por email activada:
      // el usuario deberá confirmar en el correo.
      if (!data?.session) {
        alert("Registro exitoso ✅ Revisa tu correo para confirmar la cuenta.");
        setMode("login");
        return;
      }

      // Si no requiere confirmación, entra al perfil directo
      nav("/profile", { replace: true });
    } catch (e) {
      alert(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) return alert("Escribe tu email primero.");
    setLoading(true);
    try {
      // Debe apuntar a tu ruta /reset-password (ya la tienes)
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;

      alert("Listo ✅ Te envié un correo para recuperar la contraseña.");
    } catch (e) {
      alert(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Acceso • Registro • Recuperación" />

      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold border ${
                mode === "login"
                  ? "bg-white text-zinc-950 border-white"
                  : "border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold border ${
                mode === "register"
                  ? "bg-white text-zinc-950 border-white"
                  : "border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs text-zinc-400">Email</span>
              <input
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@gmail.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs text-zinc-400">Contraseña</span>
              <input
                type="password"
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {mode === "login" ? (
              <>
                <button
                  disabled={loading}
                  onClick={login}
                  className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  disabled={loading}
                  onClick={forgotPassword}
                  className="rounded-2xl border border-white/10 px-6 py-3 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-60"
                >
                  Olvidé mi contraseña
                </button>
              </>
            ) : (
              <button
                disabled={loading}
                onClick={register}
                className="rounded-2xl bg-white text-zinc-950 font-extrabold px-6 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </button>
            )}

            <div className="text-xs text-zinc-500 mt-2">
              Volver al{" "}
              <Link className="underline text-zinc-200" to="/catalog">
                catálogo
              </Link>
              .
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
