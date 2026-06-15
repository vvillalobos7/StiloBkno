import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

export default function Auth() {
  const nav = useNavigate();
  const { success, error: showError } = useToast();

  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) nav("/profile", { replace: true });
    });
  }, [nav]);

  const login = async () => {
    if (!email.trim() || !password) return showError("Completa email y contraseña.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      success("¡Bienvenido de vuelta! 👋");
      nav("/profile", { replace: true });
    } catch (e) {
      showError(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!firstName.trim()) return showError("Ingresa tu nombre.");
    if (!lastName.trim()) return showError("Ingresa tu apellido.");
    if (!email.trim()) return showError("Ingresa tu email.");
    if (!phone.trim()) return showError("Ingresa tu teléfono.");
    if (!password || password.length < 6) return showError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirmPassword) return showError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone.trim(),
          },
        },
      });
      if (error) throw error;

      // If user is created and we have a session, save profile data
      if (data?.user) {
        // Try upsert first, fallback to insert if it fails
        const profilePayload = {
          id: data.user.id,
          full_name: fullName,
          phone: phone.trim(),
        };

        const { error: profileErr } = await supabase
          .from("profiles")
          .upsert(profilePayload);

        if (profileErr) {
          console.warn("Upsert falló, intentando insert:", profileErr.message);
          const { error: insertErr } = await supabase
            .from("profiles")
            .insert(profilePayload);
          if (insertErr) console.error("Error guardando perfil:", insertErr);
        }
      }

      // If email confirmation is required
      if (!data?.session) {
        success("Cuenta creada ✅ Revisa tu correo para confirmar la cuenta.");
        setMode("login");
        return;
      }

      success("¡Cuenta creada! Bienvenido 🎉");
      nav("/profile", { replace: true });
    } catch (e) {
      showError(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) return showError("Escribe tu email primero.");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;

      success("Te envié un correo para recuperar la contraseña ✅");
    } catch (e) {
      showError(e.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (mode === "login") login();
      else register();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar subtitle="Acceso • Registro" />

      <main className="mx-auto max-w-md w-full px-4 py-8 sm:py-10 flex-1">
        <div className="rounded-3xl border border-violet-500/15 bg-zinc-900/40 p-5 sm:p-6">
          {/* Tab toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition ${
                mode === "login"
                  ? "bg-white text-zinc-950 border-white"
                  : "border-white/12 text-zinc-300 hover:bg-white/5"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition ${
                mode === "register"
                  ? "bg-white text-zinc-950 border-white"
                  : "border-white/12 text-zinc-300 hover:bg-white/5"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="mt-5 grid gap-3" onKeyDown={handleKeyDown}>
            {mode === "register" && (
              <>
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Nombre *</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ej: Vicente"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs text-zinc-400">Apellido *</span>
                    <input
                      className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej: Alonso"
                    />
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="text-xs text-zinc-400">Teléfono *</span>
                  <input
                    className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                  <span className="text-[11px] text-zinc-500">
                    Se usará para coordinar pedidos por WhatsApp.
                  </span>
                </label>
              </>
            )}

            <label className="grid gap-1.5">
              <span className="text-xs text-zinc-400">Email *</span>
              <input
                type="email"
                className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@gmail.com"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs text-zinc-400">Contraseña *</span>
              <input
                type="password"
                className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {mode === "register" && (
                <span className="text-[11px] text-zinc-500">Mínimo 6 caracteres.</span>
              )}
            </label>

            {mode === "register" && (
              <label className="grid gap-1.5">
                <span className="text-xs text-zinc-400">Repetir contraseña *</span>
                <input
                  type="password"
                  className="rounded-2xl border border-violet-500/15 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-[11px] text-rose-400">Las contraseñas no coinciden.</span>
                )}
                {confirmPassword && password === confirmPassword && confirmPassword.length >= 6 && (
                  <span className="text-[11px] text-emerald-400">✓ Contraseñas coinciden.</span>
                )}
              </label>
            )}

            {mode === "login" ? (
              <>
                <button
                  disabled={loading}
                  onClick={login}
                  className="rounded-xl btn-accent px-5 py-2.5 disabled:opacity-60 transition"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  disabled={loading}
                  onClick={forgotPassword}
                  className="rounded-xl btn-ghost px-5 py-2.5 text-sm disabled:opacity-60"
                >
                  Olvidé mi contraseña
                </button>
              </>
            ) : (
              <button
                disabled={loading}
                onClick={register}
                className="rounded-xl btn-accent px-5 py-2.5 disabled:opacity-60 transition"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            )}

            <div className="text-xs text-zinc-500 mt-1">
              {mode === "register" ? (
                <>
                  Al crear tu cuenta, tus datos se usarán para coordinar pedidos y notificarte sobre el estado de tus compras.
                </>
              ) : (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    onClick={() => setMode("register")}
                    className="underline text-zinc-200"
                  >
                    Regístrate aquí
                  </button>
                </>
              )}
            </div>

            <div className="text-xs text-zinc-500">
              Volver al{" "}
              <Link className="underline text-zinc-200" to="/catalog">
                catálogo
              </Link>
              .
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
