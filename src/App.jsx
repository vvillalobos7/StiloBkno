import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./store/cart";

import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Checkout from "./pages/Checkout";

import AuthCallback from "./pages/Auth/AuthCallback";
import ResetPassword from "./pages/Auth/ResetPassword";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminGuard from "./pages/admin/AdminGuard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Auth */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/products"
            element={
              <AdminGuard>
                <AdminProducts />
              </AdminGuard>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <AdminGuard>
                <AdminOrders />
              </AdminGuard>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
