import { IMarketplaceAdapter, MarketplaceCredentials } from "./types";
import { MercadoLivreAdapter } from "./MercadoLivreAdapter";
import { ShopeeAdapter } from "./ShopeeAdapter";
import { AmazonAdapter } from "./AmazonAdapter";
import { TikTokAdapter } from "./TikTokAdapter";

/**
 * Adapter Factory
 * Creates marketplace adapters based on marketplace type
 * Extensible design allows adding new marketplaces without modifying existing code
 */

export type SupportedMarketplace = "mercadolivre" | "shopee" | "amazon" | "tiktok";

export class AdapterFactory {
  private static adapters: Map<SupportedMarketplace, new (creds: MarketplaceCredentials) => IMarketplaceAdapter> =
    new Map<SupportedMarketplace, new (creds: MarketplaceCredentials) => IMarketplaceAdapter>([
      ["mercadolivre", MercadoLivreAdapter],
      ["shopee", ShopeeAdapter],
      ["amazon", AmazonAdapter],
      ["tiktok", TikTokAdapter],
    ]);

  /**
   * Create an adapter instance for a specific marketplace
   */
  static createAdapter(
    marketplaceType: SupportedMarketplace,
    credentials: MarketplaceCredentials
  ): IMarketplaceAdapter {
    const AdapterClass = this.adapters.get(marketplaceType);

    if (!AdapterClass) {
      throw new Error(`Unsupported marketplace: ${marketplaceType}`);
    }

    return new AdapterClass(credentials);
  }

  /**
   * Register a new marketplace adapter
   * Allows extending the system with new marketplaces at runtime
   */
  static registerAdapter(
    marketplaceType: SupportedMarketplace,
    AdapterClass: new (creds: MarketplaceCredentials) => IMarketplaceAdapter
  ): void {
    this.adapters.set(marketplaceType, AdapterClass);
  }

  /**
   * Get list of supported marketplaces
   */
  static getSupportedMarketplaces(): SupportedMarketplace[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a marketplace is supported
   */
  static isSupported(marketplaceType: string): marketplaceType is SupportedMarketplace {
    return this.adapters.has(marketplaceType as SupportedMarketplace);
  }
}
