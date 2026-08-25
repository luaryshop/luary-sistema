import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { salesChannels, products } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

const channelFields = {
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  marketplaceType: z.string().trim().max(50).optional(),
  commissionBp: z.number().int().min(0).max(10000).default(0), // 0 a 100,00%
  fixedFeeCents: z.number().int().min(0).default(0),
  shippingCostCents: z.number().int().min(0).default(0),
  taxBp: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
};

/**
 * Calcula o preço de venda sugerido para bater a margem desejada, e/ou a
 * margem líquida real de um preço já definido, descontando comissão, taxa
 * fixa, frete médio e imposto do canal.
 *
 * Fórmulas (P = preço de venda, C = custo, em centavos; comm/tax em fração 0-1):
 *   modo "percent" (margem como % do preço de venda):
 *     P = (C + fee + ship) / (1 - comm - tax - margemAlvo)
 *   modo "fixed" (margem como valor fixo em R$):
 *     P = (C + fee + ship + margemAlvoCents) / (1 - comm - tax)
 */
function calcularPrecoSugerido(params: {
  costCents: number;
  commissionBp: number;
  fixedFeeCents: number;
  shippingCostCents: number;
  taxBp: number;
  marginMode: "percent" | "fixed";
  marginValue: number; // percent: pontos-base (1500 = 15%); fixed: centavos
}) {
  const comm = params.commissionBp / 10000;
  const tax = params.taxBp / 10000;
  const baseCosts = params.costCents + params.fixedFeeCents + params.shippingCostCents;

  let suggestedPrice: number | null = null;

  if (params.marginMode === "percent") {
    const margin = params.marginValue / 10000;
    const denom = 1 - comm - tax - margin;
    if (denom > 0) {
      suggestedPrice = Math.ceil(baseCosts / denom);
    }
  } else {
    const denom = 1 - comm - tax;
    if (denom > 0) {
      suggestedPrice = Math.ceil((baseCosts + params.marginValue) / denom);
    }
  }

  return suggestedPrice;
}

function calcularMargemReal(params: {
  price: number;
  costCents: number;
  commissionBp: number;
  fixedFeeCents: number;
  shippingCostCents: number;
  taxBp: number;
}) {
  const comm = params.commissionBp / 10000;
  const tax = params.taxBp / 10000;
  const commissionValue = Math.round(params.price * comm);
  const taxValue = Math.round(params.price * tax);
  const netRevenue = params.price - commissionValue - taxValue - params.fixedFeeCents - params.shippingCostCents;
  const profitCents = netRevenue - params.costCents;
  const marginPercentOfPrice = params.price > 0 ? Math.round((profitCents / params.price) * 10000) : 0;
  const markupPercentOfCost = params.costCents > 0 ? Math.round((profitCents / params.costCents) * 10000) : 0;

  return {
    profitCents,
    marginPercentOfPrice, // pontos-base sobre o preço de venda
    markupPercentOfCost, // pontos-base sobre o custo (markup)
    commissionValue,
    taxValue,
  };
}

export const pricingRouter = router({
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
    }),

    create: protectedProcedure.input(z.object(channelFields)).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const result = await db.insert(salesChannels).values({
        userId: ctx.user.id,
        name: input.name,
        marketplaceType: input.marketplaceType,
        commissionBp: input.commissionBp,
        fixedFeeCents: input.fixedFeeCents,
        shippingCostCents: input.shippingCostCents,
        taxBp: input.taxBp,
        isActive: input.isActive ? 1 : 0,
      });
      const insertId = Number((result as any)[0]?.insertId ?? 0);
      return { id: insertId };
    }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int(), ...channelFields }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        const { id, ...rest } = input;
        await db
          .update(salesChannels)
          .set({
            name: rest.name,
            marketplaceType: rest.marketplaceType,
            commissionBp: rest.commissionBp,
            fixedFeeCents: rest.fixedFeeCents,
            shippingCostCents: rest.shippingCostCents,
            taxBp: rest.taxBp,
            isActive: rest.isActive ? 1 : 0,
          })
          .where(and(eq(salesChannels.id, id), eq(salesChannels.userId, ctx.user.id)));
        return { success: true } as const;
      }),

    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(salesChannels).where(and(eq(salesChannels.id, input.id), eq(salesChannels.userId, ctx.user.id)));
      return { success: true } as const;
    }),
  }),

  /**
   * Calcula, para cada canal ativo do usuário (ou os IDs informados), o preço
   * sugerido para bater a margem desejada e a margem real resultante.
   */
  calculate: protectedProcedure
    .input(
      z.object({
        productId: z.number().int().optional(),
        costCents: z.number().int().min(0).optional(),
        marginMode: z.enum(["percent", "fixed"]).default("percent"),
        marginValue: z.number().int().min(0), // percent: pontos-base; fixed: centavos
        channelIds: z.array(z.number().int()).optional(),
        roundPsychological: z.boolean().default(false), // arredonda pra terminar em ,90
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      let costCents = input.costCents ?? 0;
      if (input.productId) {
        const rows = await db
          .select()
          .from(products)
          .where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)))
          .limit(1);
        if (rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        }
        costCents = rows[0].costBase ?? 0;
      }

      const allChannels = await db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
      const channels = allChannels.filter((c) => {
        if (input.channelIds && input.channelIds.length > 0) return input.channelIds.includes(c.id);
        return c.isActive === 1;
      });

      const results = channels.map((channel) => {
        let suggestedPrice = calcularPrecoSugerido({
          costCents,
          commissionBp: channel.commissionBp,
          fixedFeeCents: channel.fixedFeeCents,
          shippingCostCents: channel.shippingCostCents,
          taxBp: channel.taxBp,
          marginMode: input.marginMode,
          marginValue: input.marginValue,
        });

        if (suggestedPrice !== null && input.roundPsychological) {
          // Arredonda pra cima até o próximo valor terminando em ,90 (ex: 4567 -> 4790... normalizado pra 4990? )
          const reais = Math.ceil(suggestedPrice / 100);
          suggestedPrice = reais * 100 - 10; // termina em ,90
          if (suggestedPrice < costCents) suggestedPrice = Math.ceil(costCents / 100) * 100 - 10;
        }

        const real = suggestedPrice !== null
          ? calcularMargemReal({
              price: suggestedPrice,
              costCents,
              commissionBp: channel.commissionBp,
              fixedFeeCents: channel.fixedFeeCents,
              shippingCostCents: channel.shippingCostCents,
              taxBp: channel.taxBp,
            })
          : null;

        return {
          channelId: channel.id,
          channelName: channel.name,
          costCents,
          suggestedPriceCents: suggestedPrice,
          impossivel: suggestedPrice === null,
          ...real,
        };
      });

      return results;
    }),

  /**
   * Dado um preço já definido, calcula a margem líquida real por canal
   * (útil pra conferir preços já praticados, não só sugerir novos).
   */
  evaluate: protectedProcedure
    .input(
      z.object({
        priceCents: z.number().int().min(0),
        costCents: z.number().int().min(0),
        channelIds: z.array(z.number().int()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const allChannels = await db.select().from(salesChannels).where(eq(salesChannels.userId, ctx.user.id));
      const channels = allChannels.filter((c) =>
        input.channelIds && input.channelIds.length > 0 ? input.channelIds.includes(c.id) : c.isActive === 1
      );

      return channels.map((channel) => {
        const real = calcularMargemReal({
          price: input.priceCents,
          costCents: input.costCents,
          commissionBp: channel.commissionBp,
          fixedFeeCents: channel.fixedFeeCents,
          shippingCostCents: channel.shippingCostCents,
          taxBp: channel.taxBp,
        });
        return {
          channelId: channel.id,
          channelName: channel.name,
          priceCents: input.priceCents,
          costCents: input.costCents,
          ...real,
        };
      });
    }),
});
