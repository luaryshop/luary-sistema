import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const expectUnauthorized = async (operation: Promise<unknown>) => {
  await expect(operation).rejects.toMatchObject({ code: "UNAUTHORIZED" });
};

describe("catalog access control", () => {
  it("rejects anonymous access to internal registration lists", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await Promise.all([
      expectUnauthorized(caller.catalog.insumos.list()),
      expectUnauthorized(caller.catalog.banhos.list()),
      expectUnauthorized(caller.catalog.kits.list()),
      expectUnauthorized(caller.catalog.financeiro.list()),
      expectUnauthorized(caller.catalog.seo.list()),
      expectUnauthorized(caller.catalog.live.list()),
      expectUnauthorized(caller.catalog.inventory.summary()),
    ]);
  });

  it("rejects anonymous create, update and remove operations", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await Promise.all([
      expectUnauthorized(caller.catalog.insumos.create({ name: "Metal", cost: 100, weight: 1, stock: 1, minStock: 0, idealStock: 1, addToPlating: false })),
      expectUnauthorized(caller.catalog.insumos.update({ id: 1, name: "Metal atualizado" })),
      expectUnauthorized(caller.catalog.insumos.remove({ id: 1 })),
      expectUnauthorized(caller.catalog.banhos.create({ name: "Dourado", milesimos: 1, quotation: 100, operationalTax: 0, labor: 100, technicalLoss: 0, technicalMargin: 0, pricePerGram: 100 })),
      expectUnauthorized(caller.catalog.banhos.update({ id: 1, name: "Dourado atualizado" })),
      expectUnauthorized(caller.catalog.banhos.remove({ id: 1 })),
      expectUnauthorized(caller.catalog.kits.create({ sku: "KIT-001", name: "Kit", costBase: 100, weightBase: 1, marginTarget: 10, marginType: "perc", stock: 1, status: "active", items: [] })),
      expectUnauthorized(caller.catalog.kits.update({ id: 1, name: "Kit atualizado" })),
      expectUnauthorized(caller.catalog.kits.remove({ id: 1 })),
      expectUnauthorized(caller.catalog.financeiro.create({ description: "Compra", type: "expense", amount: 100 })),
      expectUnauthorized(caller.catalog.financeiro.update({ id: 1, description: "Compra atualizada" })),
      expectUnauthorized(caller.catalog.financeiro.remove({ id: 1 })),
    ]);
  });
});
