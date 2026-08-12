/**
 * Marketplace Adapter Interface
 * Defines the contract that all marketplace adapters must implement
 */

export interface MarketplaceCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MarketplaceTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
}

export interface PublishProductPayload {
  title: string;
  description: string;
  price: number; // in cents
  stock: number;
  sku: string;
  images: string[];
  category?: string;
  brand?: string;
  attributes?: Record<string, string>;
}

export interface UpdateProductPayload {
  listingId: string;
  title?: string;
  description?: string;
  price?: number;
  stock?: number;
  images?: string[];
}

export interface UpdatePricePayload {
  listingId: string;
  price: number; // in cents
}

export interface UpdateStockPayload {
  listingId: string;
  stock: number;
}

export interface PauseListingPayload {
  listingId: string;
  paused: boolean; // true = pause, false = activate
}

export interface ListingStatusResponse {
  listingId: string;
  status: 'active' | 'paused' | 'inactive';
  updatedAt: Date;
}

export interface PublishProductResponse {
  listingId: string;
  listingUrl: string;
  publishedAt: Date;
}

export interface Order {
  orderId: string;
  buyerName: string;
  buyerEmail?: string;
  totalAmount: number; // in cents
  status: string;
  orderDate: Date;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
}

export interface OrderItem {
  itemId: string;
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents
}

export interface ShippingAddress {
  name: string;
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Base interface for all marketplace adapters
 */
export interface IMarketplaceAdapter {
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(code: string): Promise<MarketplaceTokens>;

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<MarketplaceTokens>;

  /**
   * Validate tokens and get seller info
   */
  validateAndGetSellerInfo(accessToken: string): Promise<{ sellerId: string; sellerName: string }>;

  /**
   * Publish a product to the marketplace
   */
  publishProduct(accessToken: string, payload: PublishProductPayload): Promise<PublishProductResponse>;

  /**
   * Update an existing product
   */
  updateProduct(accessToken: string, payload: UpdateProductPayload): Promise<SyncResult>;

  /**
   * Update product price
   */
  updatePrice(accessToken: string, payload: UpdatePricePayload): Promise<SyncResult>;

  /**
   * Update product stock
   */
  updateStock(accessToken: string, payload: UpdateStockPayload): Promise<SyncResult>;

  /**
   * Pause or activate a listing
   */
  pauseListing(accessToken: string, payload: PauseListingPayload): Promise<ListingStatusResponse>;

  /**
   * Get orders from the marketplace
   */
  getOrders(accessToken: string, filters?: { since?: Date; status?: string }): Promise<Order[]>;

  /**
   * Get a specific order
   */
  getOrder(accessToken: string, orderId: string): Promise<Order>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: unknown): { type: string; data: unknown } | null;

  /**
   * Get listing status
   */
  getListingStatus(accessToken: string, listingId: string): Promise<ListingStatusResponse>;
}
