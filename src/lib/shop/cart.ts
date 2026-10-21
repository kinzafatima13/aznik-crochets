import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BagLine } from "./types";

type CartState = {
  lines: BagLine[];
  add: (line: BagLine) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          if (line.input.kind === "ready") {
            const incoming = line.input;
            const match = state.lines.find(
              (item) =>
                item.input.kind === "ready" &&
                item.input.productId === incoming.productId &&
                item.input.color === incoming.color &&
                item.input.size === incoming.size,
            );
            if (match && match.input.kind === "ready") {
              const qty = Math.min(10, match.input.qty + incoming.qty);
              return {
                lines: state.lines.map((item) =>
                  item.key === match.key
                    ? { ...item, input: { ...match.input, qty } }
                    : item,
                ),
              };
            }
          }
          return { lines: [...state.lines, line] };
        }),
      remove: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
      setQty: (key, qty) =>
        set((state) => ({
          lines: state.lines.map((line) => {
            if (line.key !== key) return line;
            const cap = line.input.kind === "mystery" ? 3 : line.input.kind === "custom" ? 5 : 10;
            const next = Math.max(1, Math.min(cap, qty));
            if (line.input.kind === "custom") {
              return { ...line, input: { kind: "custom" as const, design: { ...line.input.design, qty: next } } };
            }
            if (line.input.kind === "ready") {
              return { ...line, input: { ...line.input, qty: next } };
            }
            return { ...line, input: { ...line.input, qty: next } };
          }),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "aznik-bag", skipHydration: true },
  ),
);

export function rehydrateCart() {
  void useCart.persist.rehydrate();
}
