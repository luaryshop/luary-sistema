import crypto from "crypto";
import { BaseMarketplaceAdapter } from "./BaseAdapter";
import {
  IMarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceTokens,
  PublishProductPayload,
  PublishProductResponse,
  UpdateProductPayload,
  UpdatePricePayload,
  UpdateStockPayload,
  Order,
  SyncResult,
} from "./types";

/**
 * Mercado Livre Marketplace Adapter
 * Implements OAuth2 and API integration for Mercado Livre
 */
export class MercadoLivreAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://auth.mercadolibre.com.br";
  private readonly apiUrl = "https://api.mercadolibre.com";

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://api.mercadolibre.com");
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      state,
    });

    return `${this.authUrl}/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(`${this.authUrl}/oauth/token`, {
        grant_type: "authorization_code",
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        redirect_uri: this.credentials.redirectUri,
      });

      const expiresIn = response.data.expires_in || 21600; // 6 hours default
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(`${this.authUrl}/oauth/token`, {
        grant_type: "refresh_token",
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: refreshToken,
      });

      const expiresIn = response.data.expires_in || 21600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/users/me");

      return {
        sellerId: response.data.id.toString(),
        sellerName: response.data.nickname || response.data.first_name,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.validateAndGetSellerInfo");
    }
  }

  /**
   * Publish a product to Mercado Livre
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAuthHeader(accessToken);

      // Get seller ID first
      const sellerInfo = await this.validateAndGetSellerInfo(accessToken);

      // Prepare item payload for Mercado Livre
      const itemPayload = {
        title: payload.title,
        category_id: "MLB123456", // TODO: map category to ML category ID
        price: payload.price / 100, // Convert cents to currency
        currency_id: "BRL",
        available_quantity: payload.stock,
        buying_mode: "buy_it_now",
        condition: "new",
        description: {
          plain_text: payload.description,
        },
        pictures: payload.images.map((url) => ({ source: url })),
        attributes: this.mapAttributesToML(payload.attributes || {}),
      };

      const response = await this.httpClient.post(`/items`, itemPayload);

      return {
        listingId: response.data.id,
        listingUrl: response.data.permalink,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.publishProduct");
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      const updateData: Record<string, unknown> = {};

      if (payload.title) updateData.title = payload.title;
      if (payload.description) updateData.description = { plain_text: payload.description };
      if (payload.price) updateData.price = payload.price / 100;
      if (payload.stock !== undefined) updateData.available_quantity = payload.stock;
      if (payload.images) updateData.pictures = payload.images.map((url) => ({ source: url }));

      await this.httpClient.put(`/items/${payload.listingId}`, updateData);

      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/items/${payload.listingId}`, {
        price: payload.price / 100,
      });

      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/items/${payload.listingId}`, {
        available_quantity: payload.stock,
      });

      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.updateStock");
    }
  }

  /**
   * Get orders from Mercado Livre
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAuthHeader(accessToken);

      const params = new URLSearchParams({
        sort: "date_desc",
        limit: "50",
      });

      if (filters?.since) {
        params.append("created_after", filters.since.toISOString());
      }

      const response = await this.httpClient.get(`/orders/search?${params.toString()}`);

      return response.data.orders.map((order: any) => this.parseMLOrder(order));
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/orders/${orderId}`);
      return this.parseMLOrder(response.data);
    } catch (error) {
      this.handleApiError(error, "MercadoLivre.getOrder");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return hash === signature;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null {
    if (typeof payload !== "object" || payload === null) return null;

    const data = payload as Record<string, unknown>;
    const resource = data.resource as string;

    if (resource?.includes("order")) {
      return { type: "order_update", data: payload };
    }
    if (resource?.includes("item")) {
      return { type: "item_update", data: payload };
    }

    return null;
  }

  /**
   * Helper: Map generic attributes to Mercado Livre attributes
   */
  private mapAttributesToML(attributes: Record<string, string>): any[] {
    // TODO: Implement proper attribute mapping
    return [];
  }

  /**
   * Helper: Parse Mercado Livre order response
   */
  private parseMLOrder(mlOrder: any): Order {
    return {
      orderId: mlOrder.id.toString(),
      buyerName: mlOrder.buyer?.nickname || "Unknown",
      buyerEmail: mlOrder.buyer?.email,
      totalAmount: Math.round(mlOrder.total_amount * 100), // Convert to cents
      status: mlOrder.status,
      orderDate: new Date(mlOrder.date_created),
      items: mlOrder.order_items.map((item: any) => ({
        itemId: item.item.id,
        title: item.item.title,
        sku: item.item.seller_sku,
        quantity: item.quantity,
        unitPrice: Math.round(item.unit_price * 100),
        totalPrice: Math.round(item.unit_price * item.quantity * 100),
      })),
      shippingAddress: mlOrder.shipping ? this.parseMLShippingAddress(mlOrder.shipping) : undefined,
    };
  }

  /**
   * Helper: Parse Mercado Livre shipping address
   */
  private parseMLShippingAddress(shipping: any) {
    const receiver = shipping.receiver_address;
    return {
      name: receiver.receiver_name,
      street: receiver.street_name,
      number: receiver.street_number,
      complement: receiver.apartment_number,
      city: receiver.city?.name,
      state: receiver.state?.name,
      zipCode: receiver.zip_code,
      country: "BR",
    };
  }
}

// Import axios for the adapter
import axios from "axios";
