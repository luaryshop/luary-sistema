import crypto from "crypto";
import axios from "axios";
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
 * Shopee Marketplace Adapter
 * Implements OAuth2 and API integration for Shopee
 */
export class ShopeeAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://partner.shopeemobile.com/api/v2/oauth/authorize";
  private readonly tokenUrl = "https://partner.shopeemobile.com/api/v2/oauth/token";
  private readonly apiUrl = "https://partner.shopeemobile.com/api/v2";

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://partner.shopeemobile.com/api/v2");
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(code, timestamp);

      const response = await axios.post(this.tokenUrl, {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.credentials.redirectUri,
      });

      const expiresIn = response.data.expires_in || 28800; // 8 hours default
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });

      const expiresIn = response.data.expires_in || 28800;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/shop/get_shop_info");

      return {
        sellerId: response.data.data.shop_id.toString(),
        sellerName: response.data.data.shop_name,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.validateAndGetSellerInfo");
    }
  }

  /**
   * Publish a product to Shopee
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAuthHeader(accessToken);

      // Prepare item payload for Shopee
      const itemPayload = {
        item: {
          name: payload.title,
          description: payload.description,
          price: payload.price,
          stock: payload.stock,
          category_id: 0, // TODO: map category to Shopee category ID
          images: payload.images.map((url) => ({ url })),
          attributes: this.mapAttributesToShopee(payload.attributes || {}),
        },
      };

      const response = await this.httpClient.post(`/product/add_item`, itemPayload);

      return {
        listingId: response.data.data.item_id.toString(),
        listingUrl: `https://shopee.com.br/-i.${response.data.data.item_id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.publishProduct");
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      const updateData: Record<string, unknown> = {
        item_id: parseInt(payload.listingId),
      };

      if (payload.title) updateData.name = payload.title;
      if (payload.description) updateData.description = payload.description;
      if (payload.price) updateData.price = payload.price;
      if (payload.stock !== undefined) updateData.stock = payload.stock;
      if (payload.images) updateData.images = payload.images.map((url) => ({ url }));

      await this.httpClient.post(`/product/update_item`, { item: updateData });

      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.post(`/product/update_price`, {
        item_id: parseInt(payload.listingId),
        price: payload.price,
      });

      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.post(`/product/update_stock`, {
        item_id: parseInt(payload.listingId),
        stock: payload.stock,
      });

      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "Shopee.updateStock");
    }
  }

  /**
   * Get orders from Shopee
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAuthHeader(accessToken);

      const params: Record<string, unknown> = {
        order_status: filters?.status || "ALL",
        page_size: 50,
      };

      if (filters?.since) {
        params.time_range_field = "create_time";
        params.time_from = Math.floor(filters.since.getTime() / 1000);
        params.time_to = Math.floor(Date.now() / 1000);
      }

      const response = await this.httpClient.get(`/order/orders_list`, { params });

      return response.data.data.orders.map((order: any) => this.parseShopeeOrder(order));
    } catch (error) {
      this.handleApiError(error, "Shopee.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/order/get_order_detail`, {
        params: { order_sn: orderId },
      });
      return this.parseShopeeOrder(response.data.data.order);
    } catch (error) {
      this.handleApiError(error, "Shopee.getOrder");
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

    if (data.type === "order_status_updated") {
      return { type: "order_update", data: payload };
    }
    if (data.type === "item_updated") {
      return { type: "item_update", data: payload };
    }

    return null;
  }

  /**
   * Helper: Generate signature for Shopee API
   */
  private generateSignature(code: string, timestamp: number): string {
    const message = `${this.credentials.clientId}${code}${timestamp}`;
    return crypto.createHmac("sha256", this.credentials.clientSecret).update(message).digest("hex");
  }

  /**
   * Helper: Map generic attributes to Shopee attributes
   */
  private mapAttributesToShopee(attributes: Record<string, string>): any[] {
    // TODO: Implement proper attribute mapping
    return [];
  }

  /**
   * Helper: Parse Shopee order response
   */
  private parseShopeeOrder(shopeeOrder: any): Order {
    return {
      orderId: shopeeOrder.order_sn,
      buyerName: shopeeOrder.buyer_user_id?.toString() || "Unknown",
      buyerEmail: shopeeOrder.buyer_email,
      totalAmount: shopeeOrder.total_amount,
      status: shopeeOrder.order_status,
      orderDate: new Date(shopeeOrder.create_time * 1000),
      items: shopeeOrder.order_items.map((item: any) => ({
        itemId: item.item_sku,
        title: item.item_name,
        sku: item.item_sku,
        quantity: item.model_quantity_purchased,
        unitPrice: item.model_original_price,
        totalPrice: item.model_original_price * item.model_quantity_purchased,
      })),
      shippingAddress: shopeeOrder.recipient_address
        ? {
            name: shopeeOrder.recipient_address.name,
            street: shopeeOrder.recipient_address.full_address,
            number: "",
            city: shopeeOrder.recipient_address.city,
            state: shopeeOrder.recipient_address.state,
            zipCode: shopeeOrder.recipient_address.zipcode,
            country: "BR",
          }
        : undefined,
    };
  }
}
