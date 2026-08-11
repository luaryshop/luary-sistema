import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { OrderSyncService } from "../services/orderSyncService";
import { TRPCError } from "@trpc/server";

export const ordersRouter = router({
  /**
   * Import orders from a specific marketplace
   */
  importFromMarketplace: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
        since: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await OrderSyncService.importOrdersFromMarketplace(
          ctx.user.id,
          input.marketplaceType,
          input.since
        );

        if (result.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error,
          });
        }

        return {
          imported: result.imported,
          failed: result.failed,
          message: `Imported ${result.imported} order(s)`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import orders",
        });
      }
    }),

  /**
   * Import orders from all connected marketplaces
   */
  importFromAllMarketplaces: protectedProcedure
    .input(z.object({ since: z.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await OrderSyncService.importOrdersFromAllMarketplaces(ctx.user.id, input.since);

        return {
          totalImported: result.totalImported,
          totalFailed: result.totalFailed,
          byMarketplace: result.byMarketplace,
          message: `Imported ${result.totalImported} order(s) from all marketplaces`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import orders",
        });
      }
    }),

  /**
   * Get orders for the current user
   */
  list: protectedProcedure.input(z.object({ limit: z.number().default(50) })).query(async ({ ctx, input }) => {
    try {
      const orders = await OrderSyncService.getUserOrders(ctx.user.id, input.limit);
      return orders;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch orders",
      });
    }
  }),

  /**
   * Get order items for a specific order
   */
  getItems: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ ctx, input }) => {
    try {
      const items = await OrderSyncService.getOrderItems(input.orderId);
      return items;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch order items",
      });
    }
  }),

  /**
   * Update order status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        newStatus: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const success = await OrderSyncService.updateOrderStatus(ctx.user.id, input.orderId, input.newStatus);

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update order status",
          });
        }

        return { success: true, message: "Order status updated" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update order status",
        });
      }
    }),
});
