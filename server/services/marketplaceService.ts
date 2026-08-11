import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { marketplaceConnections, InsertMarketplaceConnection, MarketplaceConnection } from "../../drizzle/schema";
import { encryptData, decryptData } from "./encryption";
import { AdapterFactory, SupportedMarketplace } from "../adapters/AdapterFactory";
import { IMarketplaceAdapter, MarketplaceCredentials } from "../adapters/types";

/**
 * Marketplace Service
 * Handles marketplace connection management, token refresh, and adapter creation
 */

export class MarketplaceService {
  /**
   * Create or update a marketplace connection
   */
  static async upsertConnection(
    userId: number,
    marketplaceType: SupportedMarketplace,
    data: Partial<InsertMarketplaceConnection>
  ): Promise<MarketplaceConnection> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Encrypt sensitive fields
    const encryptedData = { ...data };
    if (data.accessToken) encryptedData.accessToken = encryptData(data.accessToken);
    if (data.refreshToken) encryptedData.refreshToken = encryptData(data.refreshToken);
    if (data.clientSecret) encryptedData.clientSecret = encryptData(data.clientSecret);
    if (data.webhookSecret) encryptedData.webhookSecret = encryptData(data.webhookSecret);

    const existing = await db
      .select()
      .from(marketplaceConnections)
      .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.marketplaceType, marketplaceType)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const result = await db
        .update(marketplaceConnections)
        .set({
          ...encryptedData,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceConnections.id, existing[0].id));

      return (await db.select().from(marketplaceConnections).where(eq(marketplaceConnections.id, existing[0].id)).limit(1))[0];
    } else {
      // Insert new
      const result = await db.insert(marketplaceConnections).values({
        userId,
        marketplaceType,
        ...encryptedData,
      });

      return (
        await db
          .select()
          .from(marketplaceConnections)
          .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.marketplaceType, marketplaceType)))
          .limit(1)
      )[0];
    }
  }

  /**
   * Get a marketplace connection
   */
  static async getConnection(userId: number, marketplaceType: SupportedMarketplace): Promise<MarketplaceConnection | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(marketplaceConnections)
      .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.marketplaceType, marketplaceType)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get all marketplace connections for a user
   */
  static async getUserConnections(userId: number): Promise<MarketplaceConnection[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select().from(marketplaceConnections).where(eq(marketplaceConnections.userId, userId));
  }

  /**
   * Decrypt sensitive fields from a connection
   */
  static decryptConnection(connection: MarketplaceConnection): MarketplaceConnection {
    return {
      ...connection,
      accessToken: connection.accessToken ? decryptData(connection.accessToken) : null,
      refreshToken: connection.refreshToken ? decryptData(connection.refreshToken) : null,
      clientSecret: connection.clientSecret ? decryptData(connection.clientSecret) : null,
      webhookSecret: connection.webhookSecret ? decryptData(connection.webhookSecret) : null,
    } as MarketplaceConnection;
  }

  /**
   * Get adapter for a marketplace connection
   */
  static async getAdapter(connection: MarketplaceConnection): Promise<IMarketplaceAdapter> {
    if (!AdapterFactory.isSupported(connection.marketplaceType)) {
      throw new Error(`Unsupported marketplace: ${connection.marketplaceType}`);
    }

    const decrypted = this.decryptConnection(connection);
    const credentials: MarketplaceCredentials = {
      clientId: decrypted.clientId || "",
      clientSecret: decrypted.clientSecret || "",
      redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback",
    };

    return AdapterFactory.createAdapter(connection.marketplaceType as SupportedMarketplace, credentials);
  }

  /**
   * Refresh access token if expired
   */
  static async refreshTokenIfNeeded(connection: MarketplaceConnection): Promise<string> {
    const now = new Date();

    // If token expires within 5 minutes, refresh it
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      if (!connection.refreshToken) {
        throw new Error("No refresh token available");
      }

      const adapter = await this.getAdapter(connection);
      const decrypted = this.decryptConnection(connection);
      const newTokens = await adapter.refreshAccessToken(decrypted.refreshToken || "");

      // Update connection with new tokens
      await this.upsertConnection(connection.userId, connection.marketplaceType as SupportedMarketplace, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenExpiresAt: newTokens.expiresAt,
      });

      return newTokens.accessToken;
    }

    return decryptData(connection.accessToken || "");
  }

  /**
   * Update sync status and error information
   */
  static async updateSyncStatus(
    connectionId: number,
    status: "idle" | "syncing" | "error",
    errorMessage?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const updateData: Record<string, unknown> = {
      syncStatus: status,
      lastSyncAt: new Date(),
    };

    if (status === "error" && errorMessage) {
      updateData.lastErrorAt = new Date();
      updateData.lastErrorMessage = errorMessage;
    }

    await db.update(marketplaceConnections).set(updateData).where(eq(marketplaceConnections.id, connectionId));
  }

  /**
   * Disconnect a marketplace
   */
  static async disconnect(userId: number, marketplaceType: SupportedMarketplace): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(marketplaceConnections)
      .set({
        isConnected: 0,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.marketplaceType, marketplaceType)));
  }
}
