import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { MarketplaceService } from "../services/marketplaceService";
import { AdapterFactory } from "../adapters/AdapterFactory";
import { TRPCError } from "@trpc/server";

// Guarda o "state" gerado em getAuthorizationUrl para validar no callback
// (proteção CSRF do fluxo OAuth). Em memória: suficiente para uma instância
// única do servidor (é o cenário normal de deploy deste ERP).
const pendingOAuthStates = new Map<string, { userId: number; createdAt: number }>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos para completar o login

function cleanupExpiredStates() {
  const now = Date.now();
  pendingOAuthStates.forEach((entry, state) => {
    if (now - entry.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthStates.delete(state);
    }
  });
}

export const marketplaceRouter = router({
  /**
   * Get all marketplace connections for the current user
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connections = await MarketplaceService.getUserConnections(ctx.user.id);

      // Don't return encrypted tokens to frontend
      return connections.map((conn) => ({
        id: conn.id,
        marketplaceType: conn.marketplaceType,
        isConnected: conn.isConnected === 1,
        sellerName: conn.sellerName,
        lastSyncAt: conn.lastSyncAt,
        lastErrorAt: conn.lastErrorAt,
        lastErrorMessage: conn.lastErrorMessage,
        syncStatus: conn.syncStatus,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch connections",
      });
    }
  }),

  /**
   * Get OAuth authorization URL for a marketplace
   */
  getAuthorizationUrl: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
      })
    )
    .query(({ input, ctx }) => {
      try {
        if (!AdapterFactory.isSupported(input.marketplaceType)) {
          throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
        }

        // Generate a random state for CSRF protection.
        // O tipo de marketplace vai embutido no próprio state (prefixo "tipo::"),
        // porque o marketplace só devolve os parâmetros "code" e "state" no
        // redirect — não devolve nenhum parâmetro extra que a gente mande.
        const state = `${input.marketplaceType}::${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;

        cleanupExpiredStates();
        pendingOAuthStates.set(state, { userId: ctx.user.id, createdAt: Date.now() });

        const credentials = {
          clientId: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_ID`] || "",
          clientSecret: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_SECRET`] || "",
          redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback",
        };

        const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);
        const authUrl = adapter.getAuthorizationUrl(state);

        return { authUrl, state };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate authorization URL",
        });
      }
    }),

  /**
   * Handle OAuth callback and save connection
   */
  handleOAuthCallback: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!AdapterFactory.isSupported(input.marketplaceType)) {
          throw new Error(`Unsupported marketplace: ${input.marketplaceType}`);
        }

        // Valida o "state" (proteção CSRF) antes de prosseguir
        const pending = pendingOAuthStates.get(input.state);
        if (!pending || pending.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "State inválido ou expirado. Tente conectar novamente.",
          });
        }
        pendingOAuthStates.delete(input.state); // uso único

        const credentials = {
          clientId: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_ID`] || "",
          clientSecret: process.env[`${input.marketplaceType.toUpperCase()}_CLIENT_SECRET`] || "",
          redirectUri: process.env.MARKETPLACE_REDIRECT_URI || "http://localhost:3000/api/marketplace/callback",
        };

        const adapter = AdapterFactory.createAdapter(input.marketplaceType, credentials);

        // Exchange code for tokens
        const tokens = await adapter.exchangeCodeForTokens(input.code);

        // Get seller info
        const sellerInfo = await adapter.validateAndGetSellerInfo(tokens.accessToken);

        // Save connection
        await MarketplaceService.upsertConnection(ctx.user.id, input.marketplaceType, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          sellerId: sellerInfo.sellerId,
          sellerName: sellerInfo.sellerName,
          isConnected: 1,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
        });

        return {
          success: true,
          message: `Connected to ${input.marketplaceType}`,
          sellerName: sellerInfo.sellerName,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to connect marketplace",
        });
      }
    }),

  /**
   * Disconnect a marketplace
   */
  disconnect: protectedProcedure
    .input(
      z.object({
        marketplaceType: z.enum(["mercadolivre", "shopee", "amazon", "tiktok"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await MarketplaceService.disconnect(ctx.user.id, input.marketplaceType);

        return {
          success: true,
          message: `Disconnected from ${input.marketplaceType}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to disconnect marketplace",
        });
      }
    }),

  /**
   * Get supported marketplaces
   */
  getSupportedMarketplaces: protectedProcedure.query(() => {
    return AdapterFactory.getSupportedMarketplaces().map((type) => ({
      type,
      name: {
        mercadolivre: "Mercado Livre",
        shopee: "Shopee",
        amazon: "Amazon",
        tiktok: "TikTok Shop",
      }[type],
    }));
  }),
});
