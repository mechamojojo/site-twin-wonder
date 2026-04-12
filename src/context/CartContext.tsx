import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ProductCategory } from "@/lib/shipping";
import { MAX_LINE_QUANTITY } from "@/lib/quantityLimits";

const CART_STORAGE_KEY = "compraschina-cart";

function clampCartQuantity(n: unknown): number {
  const q = Math.floor(Number(n));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(MAX_LINE_QUANTITY, q);
}

export type CartItem = {
  id: string;
  url: string;
  quantity: number;
  color?: string;
  size?: string;
  variation?: string;
  notes?: string | null;
  title?: string | null;
  titlePt?: string | null;
  priceCny?: number | null;
  priceBrl?: number | null;
  image?: string | null;
  /** Estimated weight per unit in grams (used for freight calculation) */
  weightG?: number | null;
  /** Product category for weight defaults and keepBox detection */
  category?: ProductCategory;
  /** Whether the user wants to keep the original box (affects volumetric weight) */
  keepBox?: boolean;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateKeepBox: (id: string, keepBox: boolean) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: CartItem) => ({
      ...row,
      quantity: clampCartQuantity(row?.quantity),
    }));
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = crypto.randomUUID?.() ?? `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const quantity = clampCartQuantity(item.quantity);
    setItems((prev) => [...prev, { ...item, id, quantity }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const qty = clampCartQuantity(quantity);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  }, []);

  const updateKeepBox = useCallback((id: string, keepBox: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, keepBox } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, totalItems, addItem, removeItem, updateQuantity, updateKeepBox, clearCart }),
    [items, totalItems, addItem, removeItem, updateQuantity, updateKeepBox, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
