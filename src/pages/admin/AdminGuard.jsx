import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOk(!!data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setOk(!!sess);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center text-zinc-300">Cargando...</div>;

  return <ProtectedRoute ok={ok}>{children}</ProtectedRoute>;
}
