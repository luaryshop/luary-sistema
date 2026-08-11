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
 * Amazon Selling Partner API Adapter
 * Implements OAuth2 and API integration for Amazon
 */
export class AmazonAdapter extends BaseMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly authUrl = "https://sellercentral.amazon.com/apps/authorize/consent";
  private readonly tokenUrl = "https://api.amazon.com/auth/o2/token";
  private readonly apiUrl = "https://sellingpartnerapi-na.amazon.com";

  constructor(credentials: MarketplaceCredentials) {
    super(credentials, "https://sellingpartnerapi-na.amazon.com");
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
      const response = await axios.post(this.tokenUrl, {
        grant_type: "authorization_code",
        code,
        redirect_uri: this.credentials.redirectUri,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      });

      const expiresIn = response.data.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.exchangeCodeForTokens");
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens> {
    try {
      const response = await axios.post(this.tokenUrl, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      });

      const expiresIn = response.data.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.refreshAccessToken");
    }
  }

  /**
   * Validate tokens and get seller info
   */
  async validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get("/sellers/v1/account/marketplaceParticipations");

      const participation = response.data.payload[0];
      return {
        sellerId: participation.merchant.merchant_id,
        sellerName: participation.merchant.merchant_name,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.validateAndGetSellerInfo");
    }
  }

  /**
   * Publish a product to Amazon
   */
  async publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse> {
    try {
      this.setAuthHeader(accessToken);

      // Prepare item payload for Amazon
      const itemPayload = {
        sku: payload.sku,
        product_type: "PRODUCT",
        attributes: {
          title: [{ value: payload.title }],
          brand: [{ value: payload.brand || "" }],
          description: [{ value: payload.description }],
          bullet_point: [{ value: payload.description }],
          standard_price: [{ currency: "BRL", value: (payload.price / 100).toString() }],
          quantity: [{ value: payload.stock.toString() }],
          main_image_url: [{ value: payload.images[0] || "" }],
          other_image_url: payload.images.slice(1).map((url) => ({ value: url })),
        },
      };

      const response = await this.httpClient.post(`/feeds/2021-06-30/feeds`, {
        feedType: "POST_PRODUCT_DATA",
        marketplaceIds: ["A1ZZFT5FULY4LN"],
        inputFeedDocumentId: payload.sku,
        feedDocument: itemPayload,
      });

      return {
        listingId: payload.sku,
        listingUrl: `https://www.amazon.com.br/s?k=${payload.sku}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.publishProduct");
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      const updateData: Record<string, unknown> = {};

      if (payload.title) updateData.title = [{ value: payload.title }];
      if (payload.description) updateData.description = [{ value: payload.description }];
      if (payload.price) updateData.standard_price = [{ currency: "BRL", value: (payload.price / 100).toString() }];
      if (payload.stock !== undefined) updateData.quantity = [{ value: payload.stock.toString() }];

      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, updateData);

      return {
        success: true,
        message: `Product ${payload.listingId} updated successfully`,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateProduct");
    }
  }

  /**
   * Update product price
   */
  async updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, {
        standard_price: [{ currency: "BRL", value: (payload.price / 100).toString() }],
      });

      return {
        success: true,
        message: `Price updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updatePrice");
    }
  }

  /**
   * Update product stock
   */
  async updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult> {
    try {
      this.setAuthHeader(accessToken);

      await this.httpClient.put(`/catalog/2022-04-01/items/${payload.listingId}`, {
        quantity: [{ value: payload.stock.toString() }],
      });

      return {
        success: true,
        message: `Stock updated for listing ${payload.listingId}`,
      };
    } catch (error) {
      this.handleApiError(error, "Amazon.updateStock");
    }
  }

  /**
   * Get orders from Amazon
   */
  async getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]> {
    try {
      this.setAuthHeader(accessToken);

      const params: Record<string, unknown> = {
        MarketplaceIds: ["A1ZZFT5FULY4LN"],
        MaxResultsPerPage: 50,
      };

      if (filters?.since) {
        params.CreatedAfter = filters.since.toISOString();
      }

      const response = await this.httpClient.get(`/orders/v0/orders`, { params });

      return response.data.Orders.map((order: any) => this.parseAmazonOrder(order));
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrders");
    }
  }

  /**
   * Get a specific order
   */
  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      this.setAuthHeader(accessToken);
      const response = await this.httpClient.get(`/orders/v0/orders/${orderId}`);
      return this.parseAmazonOrder(response.data.Orders[0]);
    } catch (error) {
      this.handleApiError(error, "Amazon.getOrder");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    return hash === signature;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null {
    if (typeof payload !== "object" || payload === null) return null;

    const data = payload as Record<string, unknown>;

    if (data.EventType === "ORDER_STATUS_CHANGE") {
      return { type: "order_update", data: payload };
    }
    if (data.EventType === "INVENTORY_QUANTITY_CHANGE") {
      return { type: "stock_update", data: payload };
    }

    return null;
  }

  /**
   * Helper: Parse Amazon order response
   */
  private parseAmazonOrder(amazonOrder: any): Order {
    return {
      orderId: amazonOrder.AmazonOrderId,
      buyerName: amazonOrder.BuyerName,
      buyerEmail: amazonOrder.BuyerEmail,
      totalAmount: Math.round(amazonOrder.OrderTotal.Amount * 100),
      status: amazonOrder.OrderStatus,
      orderDate: new Date(amazonOrder.PurchaseDate),
      items: amazonOrder.OrderItems.map((item: any) => ({
        itemId: item.OrderItemId,
        title: item.Title,
        sku: item.SellerSKU,
        quantity: item.QuantityOrdered,
        unitPrice: Math.round(item.ItemPrice.Amount * 100),
        totalPrice: Math.round(item.ItemPrice.Amount * item.QuantityOrdered * 100),
      })),
      shippingAddress: amazonOrder.ShippingAddress
        ? {
            name: amazonOrder.ShippingAddress.Name,
            street: amazonOrder.ShippingAddress.AddressLine1,
            number: amazonOrder.ShippingAddress.AddressLine2 || "",
            city: amazonOrder.ShippingAddress.City,
            state: amazonOrder.ShippingAddress.StateOrRegion,
            zipCode: amazonOrder.ShippingAddress.PostalCode,
            country: amazonOrder.ShippingAddress.CountryCode,
          }
        : undefined,
    };
  }
}
