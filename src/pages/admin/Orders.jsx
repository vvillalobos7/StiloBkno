import AdminOrders from "./pages/admin/AdminOrders"; // <-- agrega

// ... dentro de <Routes> agrega:
<Route
  path="/admin/orders"
  element={
    <AdminGuard>
      <AdminOrders />
    </AdminGuard>
  }
/>
