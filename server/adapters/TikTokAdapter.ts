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
 * TikTok Shop Marketplace Adapter
 * Implements OAuth2 and API integration for TikTok Shop
 */
export class TikTokAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://auth.tiktok.com/oauth/authorize";
  private readonly tokenUrl = "https://auth.tiktok.com/oauth/token";
  private readonly apiUrl = "https://open-api.tiktokshop.com";

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://open-api.tiktokshop.com");
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: "code",
      scope: "shop.basic,product.read,product.write,order.read",
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_key: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.credentials.redirectUri,
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
      this.handleApiError(error, "TikTok.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_key: this.credentials.clientId,
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
      this.handleApiError(error, "TikTok.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/v1/shop/get_shop_info");

      return {
        sellerId: response.data.data.shop_id.toString(),
        sellerName: response.data.data.shop_name,
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.validateAndGetSellerInfo");
    }
  }

  /**
   * Publish a product to TikTok Shop
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAuthHeader(accessToken);

      // Prepare item payload for TikTok Shop
      const itemPayload = {
        product_name: payload.title,
        product_description: payload.description,
        category_id: 0,
        brand_id: 0,
        skus: [
          {
            sku_code: payload.sku,
            price: payload.price,
            stock: payload.stock,
            images: payload.images,
          },
        ],
      };

      const response = await this.httpClient.post(`/v1/product/create`, itemPayload);

      return {
        listingId: response.data.data.product_id.toString(),
        listingUrl: `https://tiktokshop.com/product/${response.data.data.product_id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.publishProduct");
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      const updateData: Record<string, unknown> = {
        product_id: payload.listingId,
      };

      if (payload.title) updateData.product_name = payload.title;
      if (payload.description) updateData.product_description = payload.description;
      if (payload.price || payload.stock !== undefined) {
        updateData.skus = [
          {
            sku_code: payload.listingId,
            ...(payload.price && { price: payload.price }),
            ...(payload.stock !== undefined && { stock: payload.stock }),
          },
        ];
      }

      await this.httpClient.post(`/v1/product/update`, updateData);

      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`,
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.post(`/v1/product/update`, {
        product_id: payload.listingId,
        skus: [
          {
            sku_code: payload.listingId,
            price: payload.price,
          },
        ],
      });

      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.post(`/v1/product/update`, {
        product_id: payload.listingId,
        skus: [
          {
            sku_code: payload.listingId,
            stock: payload.stock,
          },
        ],
      });

      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "TikTok.updateStock");
    }
  }

  /**
   * Get orders from TikTok Shop
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAuthHeader(accessToken);

      const params: Record<string, unknown> = {
        page_size: 50,
        page_number: 1,
      };

      if (filters?.status) {
        params.order_status = filters.status;
      }

      const response = await this.httpClient.get(`/v1/order/orders`, { params });

      return response.data.data.orders.map((order: any) => this.parseTikTokOrder(order));
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/v1/order/detail`, {
        params: { order_id: orderId },
      });
      return this.parseTikTokOrder(response.data.data);
    } catch (error) {
      this.handleApiError(error, "TikTok.getOrder");
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
    if (data.type === "product_updated") {
      return { type: "product_update", data: payload };
    }

    return null;
  }

  /**
   * Helper: Parse TikTok order response
   */
  private parseTikTokOrder(tiktokOrder: any): Order {
    return {
      orderId: tiktokOrder.order_id,
      buyerName: tiktokOrder.buyer_user_id?.toString() || "Unknown",
      buyerEmail: tiktokOrder.buyer_email,
      totalAmount: tiktokOrder.order_amount,
      status: tiktokOrder.order_status,
      orderDate: new Date(tiktokOrder.create_time * 1000),
      items: tiktokOrder.order_line_items.map((item: any) => ({
        itemId: item.line_item_id,
        title: item.product_name,
        sku: item.sku_code,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.unit_price * item.quantity,
      })),
      shippingAddress: tiktokOrder.recipient_address
        ? {
            name: tiktokOrder.recipient_address.name,
            street: tiktokOrder.recipient_address.street,
            number: tiktokOrder.recipient_address.number || "",
            city: tiktokOrder.recipient_address.city,
            state: tiktokOrder.recipient_address.state,
            zipCode: tiktokOrder.recipient_address.postal_code,
            country: "BR",
          }
        : undefined,
    };
  }
}
