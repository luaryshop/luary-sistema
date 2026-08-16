import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { orders, orderItems, syncLogs, marketplaceConnections } from "../../drizzle/schema";
import { MarketplaceService } from "./marketplaceService";
import { SupportedMarketplace } from "../adapters/AdapterFactory";

/**
 * Order Sync Service
 * Handles importing orders from marketplaces and syncing stock
 */

export class OrderSyncService {
  /**
   * Import orders from a specific marketplace
   */
  static async importOrdersFromMarketplace(
    userId: number,
    marketplaceType: SupportedMarketplace,
    since?: Date
  ): Promise<{ imported: number; failed: number; error?: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startTime = new Date();
    let imported = 0;
    let failed = 0;

    try {
      // Get marketplace connection
      const connection = await MarketplaceService.getConnection(userId, marketplaceType);
      if (!connection || !connection.isConnected) {
        throw new Error(`Marketplace ${marketplaceType} not connected`);
      }

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Get orders from marketplace
      const marketplaceOrders = await adapter.getOrders(accessToken, { since });

      // Import each order
      for (const order of marketplaceOrders) {
        try {
          // Check if order already exists
          const existing = await db
            .select()
            .from(orders)
            .where(eq(orders.marketplaceOrderId, order.orderId))
            .limit(1);

          if (existing.length > 0) {
            // Update existing order
            await db
              .update(orders)
              .set({
                status: order.status,
                updatedAt: new Date(),
              })
              .where(eq(orders.id, existing[0].id));
          } else {
            // Insert new order and capture its generated ID
            const result = await db.insert(orders).values({
              userId,
              marketplaceConnectionId: connection.id,
              marketplaceOrderId: order.orderId,
              buyerName: order.buyerName,
              buyerEmail: order.buyerEmail,
              totalAmount: order.totalAmount,
              status: order.status,
              orderDate: order.orderDate,
              shippingAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress) : null,
            });
            const newOrderId = Number((result as any)[0]?.insertId ?? 0);

            if (newOrderId && order.items?.length) {
              await db.insert(orderItems).values(
                order.items.map((item) => ({
                  orderId: newOrderId,
                  marketplaceItemId: item.itemId,
                  title: item.title,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                }))
              );
            }
          }

          imported++;
        } catch (error) {
          failed++;
          console.error("Error importing order:", error);
        }
      }

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId: connection.id,
        syncType: "order_import",
        status: "success",
        metadata: JSON.stringify({ imported, failed }),
      });

      return { imported, failed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        syncType: "order_import",
        status: "failed",
        errorMessage,
      });

      return { imported, failed, error: errorMessage };
    }
  }

  /**
   * Import orders from all connected marketplaces
   */
  static async importOrdersFromAllMarketplaces(
    userId: number,
    since?: Date
  ): Promise<{ totalImported: number; totalFailed: number; byMarketplace: Record<string, { imported: number; failed: number }> }> {
    const connections = await MarketplaceService.getUserConnections(userId);
    let totalImported = 0;
    let totalFailed = 0;
    const byMarketplace: Record<string, { imported: number; failed: number }> = {};

    for (const connection of connections) {
      if (connection.isConnected === 1) {
        const result = await this.importOrdersFromMarketplace(
          userId,
          connection.marketplaceType as SupportedMarketplace,
          since
        );

        byMarketplace[connection.marketplaceType] = {
          imported: result.imported,
          failed: result.failed,
        };

        totalImported += result.imported;
        totalFailed += result.failed;
      }
    }

    return { totalImported, totalFailed, byMarketplace };
  }

  /**
   * Get orders for the current user
   */
  static async getUserOrders(userId: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .limit(limit)
      .orderBy((t) => t.orderDate);
  }

  /**
   * Get order items for an order
   */
  static async getOrderItems(orderId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(userId: number, orderId: number, newStatus: string): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db
        .update(orders)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      return false;
    }
  }
}
