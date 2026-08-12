import axios, { AxiosInstance } from "axios";
import { IMarketplaceAdapter, MarketplaceCredentials, MarketplaceTokens } from "./types";

/**
 * Base class for all marketplace adapters
 * Provides common functionality and enforces interface contract
 */
export abstract class BaseMarketplaceAdapter implements IMarketplaceAdapter {
  protected credentials: MarketplaceCredentials;
  protected httpClient: AxiosInstance;
  protected baseUrl: string;

  constructor(credentials: MarketplaceCredentials, baseUrl: string) {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Set authorization header for API requests
   */
  protected setAuthHeader(accessToken: string): void {
    this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  }

  /**
   * Clear authorization header
   */
  protected clearAuthHeader(): void {
    delete this.httpClient.defaults.headers.common["Authorization"];
  }

  /**
   * Handle API errors consistently
   */
  protected handleApiError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      throw new Error(`[${context}] ${status}: ${message}`);
    }
    throw new Error(`[${context}] ${error instanceof Error ? error.message : String(error)}`);
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<MarketplaceTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens>;
  abstract validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }>;
  abstract publishProduct(accessToken: string, payload: any): Promise<any>;
  abstract updateProduct(accessToken: string, payload: any): Promise<any>;
  abstract updatePrice(accessToken: string, payload: any): Promise<any>;
  abstract updateStock(accessToken: string, payload: any): Promise<any>;
  abstract getOrders(accessToken: string, filters?: any): Promise<any>;
  abstract getOrder(accessToken: string, orderId: string): Promise<any>;
  abstract verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  abstract parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null;
  async pauseListing(_accessToken: string, _payload: any): Promise<any> {
    throw new Error("This marketplace adapter does not implement listing pause yet");
  }

  async getListingStatus(_accessToken: string, _listingId: string): Promise<any> {
    throw new Error("This marketplace adapter does not implement listing status lookup yet");
  }
}
