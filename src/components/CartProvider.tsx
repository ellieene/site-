"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  productId: number;
  title: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  items: CartLine[];
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  total: number;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "furshet-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = (item: Omit<CartLine, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.productId ? { ...p, qty: p.qty + qty } : p
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const setQty = (productId: number, qty: number) => {
    setItems((prev) =>
      prev
        .map((p) => (p.productId === productId ? { ...p, qty } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const remove = (productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  };

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, setQty, remove, clear, total, count, open, setOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside provider");
  return ctx;
}
