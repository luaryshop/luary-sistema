import { describe, expect, it } from "vitest";
import { calculateKitTotals, kitInput, kitItemInput } from "./routers/catalog";

describe("kit composition logic", () => {
  it("calculates total cost and limiting stock from components", () => {
    expect(calculateKitTotals([
      { unitCost: 250, availableStock: 10, quantity: 2 },
      { unitCost: 400, availableStock: 5, quantity: 1 },
    ])).toEqual({ costBase: 900, stock: 5 });
  });

  it("returns zero values for an empty composition", () => {
    expect(calculateKitTotals([])).toEqual({ costBase: 0, stock: 0 });
  });

  it("rejects a kit component without exactly one reference", () => {
    expect(kitItemInput.safeParse({ quantity: 1 }).success).toBe(false);
    expect(kitItemInput.safeParse({ productId: 1, insumoId: 2, quantity: 1 }).success).toBe(false);
  });

  it("rejects invalid kit registration fields", () => {
    expect(kitInput.safeParse({ sku: "", name: "A", items: [] }).success).toBe(false);
    expect(kitInput.safeParse({ sku: "KIT-01", name: "Kit válido", items: [{ productId: 1, quantity: 0 }] }).success).toBe(false);
  });
});
