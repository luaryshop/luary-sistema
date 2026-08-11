import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ProductSyncService } from "../services/productSyncService";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const productsRouter = router({
  /**
   * Publish a product to a specific marketplace
   */
  publishToMarketplace: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.publishProductToMarketplace(
          ctx.user.id,
          input.productId,
          input.marketplaceType
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to publish product",
          });
        }

        return {
          success: true,
          listingId: result.listingId,
          message: `Product published to ${input.marketplaceType}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to publish product",
        });
      }
    }),

  /**
   * Publish a product to all connected marketplaces
   */
  publishToAllMarketplaces: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.publishProductToAllMarketplaces(
          ctx.user.id,
          input.productId
        );

        return {
          successful: result.successful,
          failed: result.failed,
          message: `Published to ${result.successful.length} marketplace(s)`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to publish product",
        });
      }
    }),

  /**
   * Update product price on a marketplace
   */
  updatePrice: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        marketplaceConnectionId: z.number(),
        newPrice: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.updatePriceOnMarketplace(
          ctx.user.id,
          input.listingId,
          input.marketplaceConnectionId,
          input.newPrice
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to update price",
          });
        }

        return { success: true, message: "Price updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update price",
        });
      }
    }),

  /**
   * Update product stock on a marketplace
   */
  updateStock: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        marketplaceConnectionId: z.number(),
        newStock: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ProductSyncService.updateStockOnMarketplace(
          ctx.user.id,
          input.listingId,
          input.marketplaceConnectionId,
          input.newStock
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to update stock",
          });
        }

        return { success: true, message: "Stock updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update stock",
        });
      }
    }),

  /**
   * Get sync history for a product
   */
  getSyncHistory: protectedProcedure
    .input(z.object({ productId: z.number().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      try {
        const history = await ProductSyncService.getSyncHistory(
          ctx.user.id,
          input.productId,
          input.limit
        );

        return history;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch sync history",
        });
      }
    }),

  /**
   * List products for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userProducts = await db.select().from(products).where(eq(products.userId, ctx.user.id));

      return userProducts;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch products",
      });
    }
  }),

  /**
   * Get a specific product
   */
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, input.id))
        .limit(1);

      if (product.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product[0];
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch product",
      });
    }
  }),

  /**
   * Create a new product
   */
  create: protectedProcedure
    .input(
      z.object({
        sku: z.string(),
        name: z.string(),
        category: z.string().optional(),
        brand: z.string().optional(),
        description: z.string().optional(),
        costBase: z.number().default(0),
        stock: z.number().default(0),
        minStock: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(products).values({
          userId: ctx.user.id,
          sku: input.sku,
          name: input.name,
          category: input.category,
          brand: input.brand,
          description: input.description,
          costBase: input.costBase,
          stock: input.stock,
          minStock: input.minStock,
        });

        return { success: true, message: "Product created successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create product",
        });
      }
    }),

  /**
   * Update a product
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        sku: z.string().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        description: z.string().optional(),
        costBase: z.number().optional(),
        stock: z.number().optional(),
        minStock: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, unknown> = {};
        if (input.sku !== undefined) updateData.sku = input.sku;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.brand !== undefined) updateData.brand = input.brand;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.costBase !== undefined) updateData.costBase = input.costBase;
        if (input.stock !== undefined) updateData.stock = input.stock;
        if (input.minStock !== undefined) updateData.minStock = input.minStock;

        await db.update(products).set(updateData).where(eq(products.id, input.id));

        return { success: true, message: "Product updated successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update product",
        });
      }
    }),
});
