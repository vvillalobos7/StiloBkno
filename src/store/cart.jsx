import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);

const LS_KEY = "stilobkno_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  const add = (p) => {
    setItems((prev) => {
      const found = prev.find((x) => x.id === p.id);
      if (found) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          price: p.price,
          qty: 1,
          image_path: p.image_path ?? null,
        },
      ];
    });
  };

  const inc = (id) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)));

  const dec = (id) =>
    setItems((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );

  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((acc, x) => acc + x.price * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((acc, x) => acc + x.qty, 0), [items]);

  const value = { items, add, inc, dec, remove, clear, total, count };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
