import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    // En la mayoría de casos, Supabase ya setea la sesión con el token del link.
    // Esto asegura navegación post-confirmación.
    supabase.auth.getSession().then(() => {
      nav("/admin/products", { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen grid place-items-center text-zinc-200">
      Confirmando cuenta...
    </div>
  );
}
