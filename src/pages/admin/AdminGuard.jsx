import { Navigate } from "react-router-dom";
import useAdmin from "../../hooks/useAdmin";

export default function AdminGuard({ children }) {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-300">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="h-10 w-10 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white font-black animate-pulse-glow">
            SB
          </div>
          <div className="text-sm text-zinc-400">Verificando permisos...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
