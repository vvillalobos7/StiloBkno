import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ ok, to = "/admin/login", children }) {
  if (!ok) return <Navigate to={to} replace />;
  return children;
}
