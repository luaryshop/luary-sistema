import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { products, marketplaceListings, syncLogs, marketplaceConnections } from "../../drizzle/schema";
import { MarketplaceService } from "./marketplaceService";
import { PublishProductPayload, UpdatePricePayload, UpdateStockPayload } from "../adapters/types";
import { SupportedMarketplace } from "../adapters/AdapterFactory";

/**
 * Product Sync Service
 * Handles publishing, updating, and syncing products across marketplaces
 */

export class ProductSyncService {
  /**
   * Publish a product to a specific marketplace
   */
  static async publishProductToMarketplace(
    userId: number,
    productId: number,
    marketplaceType: SupportedMarketplace
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startTime = new Date();

    try {
      // Get product
      const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (product.length === 0) {
        throw new Error("Product not found");
      }

      const prod = product[0];

      // Get marketplace connection
      const connection = await MarketplaceService.getConnection(userId, marketplaceType);
      if (!connection || !connection.isConnected) {
        throw new Error(`Marketplace ${marketplaceType} not connected`);
      }

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Prepare payload
      const payload: PublishProductPayload = {
        title: prod.name,
        description: prod.description || "",
        price: prod.costBase || 0,
        stock: prod.stock || 0,
        sku: prod.sku,
        images: [],
        brand: prod.brand || undefined,
        category: prod.category || undefined,
      };

      // Publish product
      const result = await adapter.publishProduct(accessToken, payload);

      // Save listing to database
      await db.insert(marketplaceListings).values({
        marketplaceConnectionId: connection.id,
        productId,
        marketplaceListingId: result.listingId,
        title: prod.name,
        description: prod.description || undefined,
        price: prod.costBase || 0,
        stock: prod.stock || 0,
        status: "active",
        listingUrl: result.listingUrl,
        lastPublishedAt: result.publishedAt,
      });

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId: connection.id,
        productId,
        syncType: "product_publish",
        status: "success",
        metadata: JSON.stringify({ listingId: result.listingId }),
      });

      return { success: true, listingId: result.listingId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        productId,
        syncType: "product_publish",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update product price on a marketplace
   */
  static async updatePriceOnMarketplace(
    userId: number,
    listingId: string,
    marketplaceConnectionId: number,
    newPrice: number
  ): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get marketplace connection
      const connections = await db
        .select()
        .from(marketplaceConnections)
        .where(eq(marketplaceConnections.id, marketplaceConnectionId))
        .limit(1);

      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }

      const connection = connections[0];

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Update price
      const payload: UpdatePricePayload = {
        listingId,
        price: newPrice,
      };

      await adapter.updatePrice(accessToken, payload);

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "success",
        metadata: JSON.stringify({ listingId, newPrice }),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "price_update",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update product stock on a marketplace
   */
  static async updateStockOnMarketplace(
    userId: number,
    listingId: string,
    marketplaceConnectionId: number,
    newStock: number
  ): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get marketplace connection
      const connections = await db
        .select()
        .from(marketplaceConnections)
        .where(eq(marketplaceConnections.id, marketplaceConnectionId))
        .limit(1);

      if (connections.length === 0) {
        throw new Error("Marketplace connection not found");
      }

      const connection = connections[0];

      // Refresh token if needed
      const accessToken = await MarketplaceService.refreshTokenIfNeeded(connection);

      // Get adapter
      const adapter = await MarketplaceService.getAdapter(connection);

      // Update stock
      const payload: UpdateStockPayload = {
        listingId,
        stock: newStock,
      };

      await adapter.updateStock(accessToken, payload);

      // Log sync
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "success",
        metadata: JSON.stringify({ listingId, newStock }),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await db.insert(syncLogs).values({
        userId,
        marketplaceConnectionId,
        syncType: "stock_sync",
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Publish product to all connected marketplaces
   */
  static async publishProductToAllMarketplaces(
    userId: number,
    productId: number
  ): Promise<{ successful: string[]; failed: { marketplace: string; error: string }[] }> {
    const connections = await MarketplaceService.getUserConnections(userId);
    const successful: string[] = [];
    const failed: { marketplace: string; error: string }[] = [];

    for (const connection of connections) {
      if (connection.isConnected === 1) {
        const result = await this.publishProductToMarketplace(
          userId,
          productId,
          connection.marketplaceType as SupportedMarketplace
        );

        if (result.success) {
          successful.push(connection.marketplaceType);
        } else {
          failed.push({
            marketplace: connection.marketplaceType,
            error: result.error || "Unknown error",
          });
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Get sync history for a product
   */
  static async getSyncHistory(userId: number, productId?: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let query = db.select().from(syncLogs).where(eq(syncLogs.userId, userId)) as any;

    if (productId) {
      query = query.where(eq(syncLogs.productId, productId));
    }

    return query.limit(limit);
  }
}
