import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async () => {
    if (pass.length < 6) return alert("Mínimo 6 caracteres.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) return alert(error.message);
    alert("Contraseña actualizada. Inicia sesión.");
    nav("/admin/login");
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/30 p-6">
        <h2 className="text-2xl font-extrabold tracking-tight">Nueva contraseña</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Ingresa tu nueva contraseña para StiloBkno.
        </p>

        <div className="mt-5 grid gap-3">
          <input
            className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            type="password"
            placeholder="Nueva contraseña"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button
            disabled={busy}
            onClick={update}
            className="rounded-2xl bg-white text-zinc-950 font-extrabold py-3 hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
