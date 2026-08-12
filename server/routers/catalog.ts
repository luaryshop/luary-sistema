import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { banhos, financeiro, insumos, kitItems, kits, liveStreams, products, seoSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const positiveInt = z.number().int().min(0);
const moneyInCents = z.number().int().min(0);

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  }
  return db;
}

const insumosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)).orderBy(desc(insumos.updatedAt));
  }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      internalCode: z.string().trim().max(100).optional(),
      cost: moneyInCents.default(0),
      weight: positiveInt.default(0),
      stock: positiveInt.default(0),
      minStock: positiveInt.default(0),
      idealStock: positiveInt.default(0),
      addToPlating: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const result = await db.insert(insumos).values({
        userId: ctx.user.id,
        name: input.name,
        internalCode: input.internalCode || null,
        cost: input.cost,
        weight: input.weight,
        stock: input.stock,
        minStock: input.minStock,
        idealStock: input.idealStock,
        addToPlating: input.addToPlating ? 1 : 0,
      });
      return { id: Number((result as any)[0]?.insertId ?? 0), success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(255).optional(),
      internalCode: z.string().trim().max(100).nullable().optional(),
      cost: moneyInCents.optional(),
      weight: positiveInt.optional(),
      stock: positiveInt.optional(),
      minStock: positiveInt.optional(),
      idealStock: positiveInt.optional(),
      addToPlating: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = { ...fields };
      if (fields.addToPlating !== undefined) updateData.addToPlating = fields.addToPlating ? 1 : 0;
      await db.update(insumos).set(updateData).where(and(eq(insumos.id, id), eq(insumos.userId, ctx.user.id)));
      return { success: true };
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await db.delete(insumos).where(and(eq(insumos.id, input.id), eq(insumos.userId, ctx.user.id)));
      return { success: true };
    }),
});

const banhosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(banhos).where(eq(banhos.userId, ctx.user.id)).orderBy(desc(banhos.updatedAt));
  }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      metal: z.string().trim().max(100).optional(),
      color: z.string().trim().max(100).optional(),
      milesimos: positiveInt.default(0),
      quotation: moneyInCents.default(0),
      operationalTax: positiveInt.default(0),
      labor: moneyInCents.default(0),
      technicalLoss: positiveInt.default(0),
      technicalMargin: positiveInt.default(0),
      pricePerGram: moneyInCents.default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const result = await db.insert(banhos).values({ userId: ctx.user.id, ...input });
      return { id: Number((result as any)[0]?.insertId ?? 0), success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(255).optional(),
      metal: z.string().trim().max(100).nullable().optional(),
      color: z.string().trim().max(100).nullable().optional(),
      milesimos: positiveInt.optional(),
      quotation: moneyInCents.optional(),
      operationalTax: positiveInt.optional(),
      labor: moneyInCents.optional(),
      technicalLoss: positiveInt.optional(),
      technicalMargin: positiveInt.optional(),
      pricePerGram: moneyInCents.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const { id, ...fields } = input;
      await db.update(banhos).set(fields).where(and(eq(banhos.id, id), eq(banhos.userId, ctx.user.id)));
      return { success: true };
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await db.delete(banhos).where(and(eq(banhos.id, input.id), eq(banhos.userId, ctx.user.id)));
      return { success: true };
    }),
});

export const kitItemInput = z.object({
  productId: z.number().int().positive().nullable().optional(),
  insumoId: z.number().int().positive().nullable().optional(),
  quantity: positiveInt.min(1),
  unitCost: moneyInCents.default(0),
}).superRefine((item, issue) => {
  if (!item.productId && !item.insumoId) {
    issue.addIssue({ code: z.ZodIssueCode.custom, path: ["productId"], message: "Informe um produto ou insumo" });
  }
  if (item.productId && item.insumoId) {
    issue.addIssue({ code: z.ZodIssueCode.custom, path: ["productId"], message: "Escolha produto ou insumo, não os dois" });
  }
});

export const kitInput = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().max(10000).optional(),
  costBase: moneyInCents.default(0),
  weightBase: positiveInt.default(0),
  marginTarget: positiveInt.default(0),
  marginType: z.enum(["perc", "fixed"]).default("perc"),
  stock: positiveInt.default(0),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  items: z.array(kitItemInput).default([]),
});

async function verifyKitOwner(db: any, kitId: number, userId: number) {
  const rows = await db.select({ id: kits.id }).from(kits).where(and(eq(kits.id, kitId), eq(kits.userId, userId))).limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Kit não encontrado" });
}

export function calculateKitTotals(items: Array<{ unitCost: number; availableStock: number; quantity: number }>) {
  if (!items.length) return { costBase: 0, stock: 0 };
  const costBase = items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
  const stock = Math.min(...items.map((item) => Math.floor(item.availableStock / item.quantity)));
  return { costBase, stock: Number.isFinite(stock) ? stock : 0 };
}

async function calculateKitComposition(db: any, userId: number, items: Array<z.infer<typeof kitItemInput>>) {
  if (!items.length) return { items: [], costBase: 0, stock: 0 };

  const productIds = items.flatMap((item) => item.productId ? [item.productId] : []);
  const insumoIds = items.flatMap((item) => item.insumoId ? [item.insumoId] : []);
  const [productRows, insumoRows] = await Promise.all([
    productIds.length ? db.select().from(products).where(and(eq(products.userId, userId), inArray(products.id, productIds))) : [],
    insumoIds.length ? db.select().from(insumos).where(and(eq(insumos.userId, userId), inArray(insumos.id, insumoIds))) : [],
  ]);
  const productMap = new Map(productRows.map((row: any) => [row.id, row]));
  const insumoMap = new Map(insumoRows.map((row: any) => [row.id, row]));
  const normalizedItems = items.map((item) => {
    const component: any = item.productId ? productMap.get(item.productId) : insumoMap.get(item.insumoId);
    if (!component) throw new TRPCError({ code: "BAD_REQUEST", message: "Um dos componentes não pertence ao usuário ou não existe" });
    const unitCost = item.productId ? Number(component.costBase ?? 0) : Number(component.cost ?? 0);
    return { ...item, unitCost, availableStock: Number(component.stock ?? 0) };
  });
  const totals = calculateKitTotals(normalizedItems);

  return { items: normalizedItems.map(({ availableStock: _availableStock, ...item }) => item), ...totals };
}

const kitsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(kits).where(eq(kits.userId, ctx.user.id)).orderBy(desc(kits.updatedAt));
  }),
  getItems: protectedProcedure
    .input(z.object({ kitId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await verifyKitOwner(db, input.kitId, ctx.user.id);
      return db.select().from(kitItems).where(eq(kitItems.kitId, input.kitId)).orderBy(kitItems.id);
    }),
  create: protectedProcedure.input(kitInput).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { items, ...kitData } = input;
    const composition = await calculateKitComposition(db, ctx.user.id, items);
    const result = await db.insert(kits).values({
      userId: ctx.user.id,
      ...kitData,
      costBase: items.length ? composition.costBase : kitData.costBase,
      stock: items.length ? composition.stock : kitData.stock,
    });
    const kitId = Number((result as any)[0]?.insertId ?? 0);
    if (kitId && composition.items.length) {
      await db.insert(kitItems).values(composition.items.map((item) => ({ kitId, ...item })));
    }
    return { id: kitId, success: true, calculatedCostBase: items.length ? composition.costBase : kitData.costBase, calculatedStock: items.length ? composition.stock : kitData.stock };
  }),
  update: protectedProcedure
    .input(kitInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await verifyKitOwner(db, input.id, ctx.user.id);
      const { id, items, ...fields } = input;
      const updateData: Record<string, unknown> = { ...fields };
      let calculated: { costBase?: number; stock?: number } = {};
      if (items) {
        const composition = await calculateKitComposition(db, ctx.user.id, items);
        calculated = { costBase: composition.costBase, stock: composition.stock };
        updateData.costBase = composition.costBase;
        updateData.stock = composition.stock;
        await db.delete(kitItems).where(eq(kitItems.kitId, id));
        if (composition.items.length) await db.insert(kitItems).values(composition.items.map((item) => ({ kitId: id, ...item })));
      }
      if (Object.keys(updateData).length) await db.update(kits).set(updateData).where(eq(kits.id, id));
      return { success: true, ...calculated };
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await verifyKitOwner(db, input.id, ctx.user.id);
      await db.delete(kits).where(eq(kits.id, input.id));
      return { success: true };
    }),
});

const financeiroRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(financeiro).where(eq(financeiro.userId, ctx.user.id)).orderBy(desc(financeiro.date));
  }),
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    const rows = await db.select({ type: financeiro.type, total: sql<number>`COALESCE(SUM(${financeiro.amount}), 0)` }).from(financeiro).where(eq(financeiro.userId, ctx.user.id)).groupBy(financeiro.type);
    const income = Number(rows.find((row) => row.type === "income")?.total ?? 0);
    const expense = Number(rows.find((row) => row.type === "expense")?.total ?? 0);
    return { income, expense, balance: income - expense };
  }),
  create: protectedProcedure
    .input(z.object({
      description: z.string().trim().min(2).max(255),
      type: z.enum(["income", "expense"]),
      amount: moneyInCents.min(1),
      date: z.coerce.date().optional(),
      category: z.string().trim().max(100).optional(),
      notes: z.string().trim().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const result = await db.insert(financeiro).values({ userId: ctx.user.id, ...input });
      return { id: Number((result as any)[0]?.insertId ?? 0), success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      description: z.string().trim().min(2).max(255).optional(),
      type: z.enum(["income", "expense"]).optional(),
      amount: moneyInCents.min(1).optional(),
      date: z.coerce.date().optional(),
      category: z.string().trim().max(100).nullable().optional(),
      notes: z.string().trim().max(5000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const { id, ...fields } = input;
      await db.update(financeiro).set(fields).where(and(eq(financeiro.id, id), eq(financeiro.userId, ctx.user.id)));
      return { success: true };
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      await db.delete(financeiro).where(and(eq(financeiro.id, input.id), eq(financeiro.userId, ctx.user.id)));
      return { success: true };
    }),
});

const seoRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(seoSettings).where(eq(seoSettings.userId, ctx.user.id)).orderBy(seoSettings.pageKey);
  }),
  upsert: protectedProcedure
    .input(z.object({
      pageKey: z.string().trim().min(1).max(100),
      title: z.string().trim().min(1).max(255),
      description: z.string().trim().max(5000).optional(),
      keywords: z.string().trim().max(500).optional(),
      canonicalUrl: z.string().trim().url().or(z.literal("")).optional(),
      ogImageUrl: z.string().trim().url().or(z.literal("")).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      const existing = await db.select({ id: seoSettings.id }).from(seoSettings).where(and(eq(seoSettings.userId, ctx.user.id), eq(seoSettings.pageKey, input.pageKey))).limit(1);
      if (existing[0]) {
        await db.update(seoSettings).set(input).where(eq(seoSettings.id, existing[0].id));
        return { id: existing[0].id, success: true };
      }
      const result = await db.insert(seoSettings).values({ userId: ctx.user.id, ...input });
      return { id: Number((result as any)[0]?.insertId ?? 0), success: true };
    }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(seoSettings).where(and(eq(seoSettings.id, input.id), eq(seoSettings.userId, ctx.user.id)));
    return { success: true };
  }),
});

const liveRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    return db.select().from(liveStreams).where(eq(liveStreams.userId, ctx.user.id)).orderBy(desc(liveStreams.scheduledAt));
  }),
  create: protectedProcedure.input(z.object({
    title: z.string().trim().min(2).max(255),
    platform: z.string().trim().min(2).max(100),
    scheduledAt: z.coerce.date().optional(),
    status: z.enum(["planned", "scheduled", "live", "finished", "cancelled"]).default("planned"),
    link: z.string().trim().url().or(z.literal("")).optional(),
    notes: z.string().trim().max(5000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const result = await db.insert(liveStreams).values({ userId: ctx.user.id, ...input });
    return { id: Number((result as any)[0]?.insertId ?? 0), success: true };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    title: z.string().trim().min(2).max(255).optional(),
    platform: z.string().trim().min(2).max(100).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    status: z.enum(["planned", "scheduled", "live", "finished", "cancelled"]).optional(),
    link: z.string().trim().url().or(z.literal("")).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    const { id, ...fields } = input;
    await db.update(liveStreams).set(fields).where(and(eq(liveStreams.id, id), eq(liveStreams.userId, ctx.user.id)));
    return { success: true };
  }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = requireDatabase(await getDb());
    await db.delete(liveStreams).where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, ctx.user.id)));
    return { success: true };
  }),
});

const inventoryRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDatabase(await getDb());
    const [productRows, insumoRows, kitRows] = await Promise.all([
      db.select().from(products).where(eq(products.userId, ctx.user.id)),
      db.select().from(insumos).where(eq(insumos.userId, ctx.user.id)),
      db.select().from(kits).where(eq(kits.userId, ctx.user.id)),
    ]);
    return {
      products: productRows,
      insumos: insumoRows,
      kits: kitRows,
      lowStockProducts: productRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0)),
      lowStockInsumos: insumoRows.filter((item) => (item.stock ?? 0) <= (item.minStock ?? 0)),
    };
  }),
});

export const catalogRouter = router({
  insumos: insumosRouter,
  banhos: banhosRouter,
  kits: kitsRouter,
  financeiro: financeiroRouter,
  seo: seoRouter,
  live: liveRouter,
  inventory: inventoryRouter,
});
