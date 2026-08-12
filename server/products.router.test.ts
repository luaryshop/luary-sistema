import { beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  rows: [] as Array<Record<string, any>>,
  nextId: 1,
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: "eq", column, value }),
    and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
  };
});

import { appRouter } from "./routers";

function fieldName(column: unknown) {
  if (column === products.id) return "id";
  if (column === products.userId) return "userId";
  if (column === products.sku) return "sku";
  return undefined;
}

function matches(row: Record<string, any>, condition: any): boolean {
  if (!condition) return true;
  if (condition.kind === "and") return condition.conditions.every((item: any) => matches(row, item));
  if (condition.kind === "eq") {
    const key = fieldName(condition.column);
    return key ? row[key] === condition.value : false;
  }
  return false;
}

function createMemoryDb() {
  const project = {
    select(selection?: Record<string, unknown>) {
      return {
        from() {
          const run = (condition?: unknown) => {
            const selected = mocks.rows.filter((row) => matches(row, condition));
            if (!selection) return selected;
            return selected.map((row) => Object.fromEntries(Object.entries(selection).map(([key]) => [key, row[key]])));
          };
          const query = {
            where(condition?: unknown) {
              const thenable = {
                then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
                  return Promise.resolve(run(condition)).then(resolve, reject);
                },
                limit: async () => run(condition),
              };
              return thenable;
            },
          };
          return query;
        },
      };
    },
    insert() {
      return {
        values: async (value: Record<string, any>) => {
          const id = mocks.nextId++;
          mocks.rows.push({ ...value, id, status: "active" });
          return [{ insertId: id }];
        },
      };
    },
    update() {
      return {
        set(values: Record<string, any>) {
          return {
            async where(condition: unknown) {
              mocks.rows.forEach((row) => {
                if (matches(row, condition)) Object.assign(row, values);
              });
              return [{ affectedRows: mocks.rows.filter((row) => matches(row, condition)).length }];
            },
          };
        },
      };
    },
    delete() {
      return {
        async where(condition: unknown) {
          const before = mocks.rows.length;
          mocks.rows = mocks.rows.filter((row) => !matches(row, condition));
          return [{ affectedRows: before - mocks.rows.length }];
        },
      };
    },
  };
  return project;
}

function createAuthContext(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: `user-${userId}`, name: `User ${userId}`, email: `user${userId}@example.com`, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => {
  mocks.rows = [];
  mocks.nextId = 1;
  mocks.getDb.mockResolvedValue(createMemoryDb());
});

describe("products router", () => {
  it("creates, updates and removes a product for its owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const created = await caller.products.create({ sku: "SKU-001", name: "Brinco", costBase: 1250, stock: 3, minStock: 1 });
    expect(created).toMatchObject({ id: 1, success: true });
    expect((await caller.products.list())).toHaveLength(1);

    await caller.products.update({ id: created.id, name: "Brinco atualizado", stock: 4 });
    expect((await caller.products.get({ id: created.id })).name).toBe("Brinco atualizado");

    await caller.products.remove({ id: created.id });
    expect(await caller.products.list()).toHaveLength(0);
  });

  it("rejects duplicate SKU for one user but allows it for another", async () => {
    const owner = appRouter.createCaller(createAuthContext(1));
    const otherUser = appRouter.createCaller(createAuthContext(2));
    await owner.products.create({ sku: "SKU-SHARED", name: "Produto do dono" });
    await expect(owner.products.create({ sku: "SKU-SHARED", name: "Duplicado" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(otherUser.products.create({ sku: "SKU-SHARED", name: "Produto de outro usuário" })).resolves.toMatchObject({ success: true });
  });

  it("does not allow another user to read, update or remove the owner product", async () => {
    const owner = appRouter.createCaller(createAuthContext(1));
    const otherUser = appRouter.createCaller(createAuthContext(2));
    const created = await owner.products.create({ sku: "SKU-PRIVATE", name: "Produto privado" });

    await expect(otherUser.products.list()).resolves.toHaveLength(0);
    await expect(otherUser.products.get({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherUser.products.update({ id: created.id, name: "Tentativa" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherUser.products.remove({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
