import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);

const LS_KEY = "stilobkno_cart_v2";

function makeKey(item) {
  return item.variant_id ? `${item.id}::${item.variant_id}` : `${item.id}`;
}

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
    const key = makeKey(p);

    setItems((prev) => {
      const found = prev.find((x) => x.key === key);

      if (found) {
        const nextQty = found.qty + 1;
        if (p.stock && nextQty > p.stock) {
          alert("No hay más stock disponible para esa variante.");
          return prev;
        }

        return prev.map((x) =>
          x.key === key
            ? {
                ...x,
                qty: nextQty,
              }
            : x
        );
      }

      return [
        ...prev,
        {
          key,
          id: p.id,
          variant_id: p.variant_id ?? null,
          variant_label: p.variant_label ?? null,
          size: p.size ?? null,
          color: p.color ?? null,
          name: p.name,
          price: Number(p.price ?? 0),
          qty: 1,
          stock: Number(p.stock ?? 0),
          image_path: p.image_path ?? null,
        },
      ];
    });
  };

  const inc = (key) =>
    setItems((prev) =>
      prev.map((x) => {
        if (x.key !== key) return x;

        const nextQty = x.qty + 1;
        if (x.stock && nextQty > x.stock) {
          alert("No hay más stock disponible para esa variante.");
          return x;
        }

        return { ...x, qty: nextQty };
      })
    );

  const dec = (key) =>
    setItems((prev) =>
      prev
        .map((x) => (x.key === key ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );

  const remove = (key) => setItems((prev) => prev.filter((x) => x.key !== key));

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((acc, x) => acc + x.price * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((acc, x) => acc + x.qty, 0), [items]);

  const value = { items, add, inc, dec, remove, clear, total, count };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);