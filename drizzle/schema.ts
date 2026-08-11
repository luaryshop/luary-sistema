import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Marketplace configurations and credentials
 */
export const marketplaceConnections = mysqlTable(
  "marketplace_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceType: varchar("marketplace_type", { length: 50 }).notNull(), // 'mercadolivre', 'shopee', 'amazon', 'tiktok', etc
    isConnected: int("is_connected").default(0).notNull(), // 0 = false, 1 = true
    accessToken: text("access_token"), // encrypted
    refreshToken: text("refresh_token"), // encrypted
    tokenExpiresAt: timestamp("token_expires_at"),
    sellerId: varchar("seller_id", { length: 255 }), // marketplace-specific seller ID
    sellerName: varchar("seller_name", { length: 255 }),
    clientId: varchar("client_id", { length: 255 }), // stored for reference
    clientSecret: text("client_secret"), // encrypted
    webhookUrl: varchar("webhook_url", { length: 500 }),
    webhookSecret: text("webhook_secret"), // encrypted
    lastSyncAt: timestamp("last_sync_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    syncStatus: varchar("sync_status", { length: 50 }).default("idle"), // 'idle', 'syncing', 'error'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userMarketplaceIdx: `UNIQUE KEY user_mkt_idx (user_id, marketplace_type)`,
  })
);

export type MarketplaceConnection = typeof marketplaceConnections.$inferSelect;
export type InsertMarketplaceConnection = typeof marketplaceConnections.$inferInsert;

/**
 * Products in the ERP system
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  color: varchar("color", { length: 100 }),
  material: varchar("material", { length: 100 }),
  description: text("description"),
  costBase: int("cost_base").default(0), // in cents
  weightBase: int("weight_base").default(0), // in grams
  marginTarget: int("margin_target").default(0), // percentage or fixed value in cents
  marginType: varchar("margin_type", { length: 20 }).default("perc"), // 'perc' or 'fixed'
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  photoUrl: varchar("photo_url", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'inactive', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Marketplace listings (published products)
 */
export const marketplaceListings = mysqlTable(
  "marketplace_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    marketplaceConnectionId: int("marketplace_connection_id")
      .notNull()
      .references(() => marketplaceConnections.id, { onDelete: "cascade" }),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    marketplaceListingId: varchar("marketplace_listing_id", { length: 255 }).notNull(), // external ID from marketplace
    title: varchar("title", { length: 500 }),
    description: text("description"),
    price: int("price").default(0), // in cents
    stock: int("stock").default(0),
    status: varchar("status", { length: 50 }).default("active"), // 'active', 'inactive', 'paused', 'sold_out'
    listingUrl: varchar("listing_url", { length: 500 }),
    lastPublishedAt: timestamp("last_published_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    marketplaceListingIdx: `UNIQUE KEY mkt_listing_idx (marketplace_connection_id, marketplace_listing_id)`,
    productIdx: `KEY product_idx (product_id)`,
  })
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

/**
 * Orders from marketplaces
 */
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id")
      .notNull()
      .references(() => marketplaceConnections.id, { onDelete: "cascade" }),
    marketplaceOrderId: varchar("marketplace_order_id", { length: 255 }).notNull(),
    buyerName: varchar("buyer_name", { length: 255 }),
    buyerEmail: varchar("buyer_email", { length: 320 }),
    totalAmount: int("total_amount").default(0), // in cents
    status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    orderDate: timestamp("order_date"),
    shippingAddress: text("shipping_address"), // JSON
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    marketplaceOrderIdx: `UNIQUE KEY mkt_order_idx (marketplace_connection_id, marketplace_order_id)`,
    userIdx: `KEY user_idx (user_id)`,
  })
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items (products in an order)
 */
export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    marketplaceItemId: varchar("marketplace_item_id", { length: 255 }),
    title: varchar("title", { length: 255 }),
    quantity: int("quantity").default(1),
    unitPrice: int("unit_price").default(0), // in cents
    totalPrice: int("total_price").default(0), // in cents
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: `KEY order_idx (order_id)`,
  })
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Synchronization history and logs
 */
export const syncLogs = mysqlTable(
  "sync_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    marketplaceConnectionId: int("marketplace_connection_id").references(() => marketplaceConnections.id, { onDelete: "set null" }),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    orderId: int("order_id").references(() => orders.id, { onDelete: "set null" }),
    syncType: varchar("sync_type", { length: 50 }).notNull(), // 'product_publish', 'product_update', 'stock_sync', 'price_update', 'order_import'
    status: varchar("status", { length: 50 }).notNull(), // 'success', 'failed', 'pending', 'retrying'
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    retryCount: int("retry_count").default(0),
    maxRetries: int("max_retries").default(3),
    metadata: text("metadata"), // JSON with additional context
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: `KEY user_idx (user_id)`,
    marketplaceIdx: `KEY marketplace_idx (marketplace_connection_id)`,
    productIdx: `KEY product_idx (product_id)`,
    syncTypeIdx: `KEY sync_type_idx (sync_type, status)`,
  })
);

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

/**
 * Insumos (supplies/components)
 */
export const insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  internalCode: varchar("internal_code", { length: 100 }),
  cost: int("cost").default(0), // in cents
  weight: int("weight").default(0), // in grams
  stock: int("stock").default(0),
  minStock: int("min_stock").default(0),
  idealStock: int("ideal_stock").default(0),
  addToPlating: int("add_to_plating").default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Insumo = typeof insumos.$inferSelect;
export type InsertInsumo = typeof insumos.$inferInsert;

/**
 * Banhos (plating/finishing treatments)
 */
export const banhos = mysqlTable("banhos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  metal: varchar("metal", { length: 100 }),
  color: varchar("color", { length: 100 }),
  milesimos: int("milesimos").default(0), // thousandths
  quotation: int("quotation").default(0), // in cents
  operationalTax: int("operational_tax").default(0), // percentage
  labor: int("labor").default(0), // in cents
  technicalLoss: int("technical_loss").default(0), // percentage
  technicalMargin: int("technical_margin").default(0), // percentage
  pricePerGram: int("price_per_gram").default(0), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Banho = typeof banhos.$inferSelect;
export type InsertBanho = typeof banhos.$inferInsert;

/**
 * Kits (product bundles)
 */
export const kits = mysqlTable("kits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  costBase: int("cost_base").default(0), // in cents
  weightBase: int("weight_base").default(0), // in grams
  marginTarget: int("margin_target").default(0),
  marginType: varchar("margin_type", { length: 20 }).default("perc"),
  stock: int("stock").default(0),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

/**
 * Financial transactions
 */
export const financeiro = mysqlTable("financeiro", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'income', 'expense'
  amount: int("amount").default(0), // in cents
  date: timestamp("date").defaultNow(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Financeiro = typeof financeiro.$inferSelect;
export type InsertFinanceiro = typeof financeiro.$inferInsert;