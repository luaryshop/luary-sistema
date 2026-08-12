import { describe, expect, it } from "vitest";
import { isProductOwnedByUser, productInput } from "./routers/products";

describe("product validation and ownership", () => {
  it("accepts a valid product payload and rejects blank identifiers", () => {
    expect(productInput.safeParse({ sku: "SKU-001", name: "Brinco", costBase: 1250, stock: 3, minStock: 1 }).success).toBe(true);
    expect(productInput.safeParse({ sku: "   ", name: "Brinco" }).success).toBe(false);
    expect(productInput.safeParse({ sku: "SKU-001", name: "A" }).success).toBe(false);
    expect(productInput.safeParse({ sku: "SKU-001", name: "Brinco", stock: -1 }).success).toBe(false);
  });

  it("allows access only to the owning user", () => {
    expect(isProductOwnedByUser(7, 7)).toBe(true);
    expect(isProductOwnedByUser(7, 8)).toBe(false);
  });
});
