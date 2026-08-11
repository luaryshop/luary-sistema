CREATE TABLE `banhos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`metal` varchar(100),
	`color` varchar(100),
	`milesimos` int DEFAULT 0,
	`quotation` int DEFAULT 0,
	`operational_tax` int DEFAULT 0,
	`labor` int DEFAULT 0,
	`technical_loss` int DEFAULT 0,
	`technical_margin` int DEFAULT 0,
	`price_per_gram` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banhos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeiro` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`amount` int DEFAULT 0,
	`date` timestamp DEFAULT (now()),
	`category` varchar(100),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financeiro_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`internal_code` varchar(100),
	`cost` int DEFAULT 0,
	`weight` int DEFAULT 0,
	`stock` int DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`ideal_stock` int DEFAULT 0,
	`add_to_plating` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insumos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cost_base` int DEFAULT 0,
	`weight_base` int DEFAULT 0,
	`margin_target` int DEFAULT 0,
	`margin_type` varchar(20) DEFAULT 'perc',
	`stock` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_type` varchar(50) NOT NULL,
	`is_connected` int NOT NULL DEFAULT 0,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` timestamp,
	`seller_id` varchar(255),
	`seller_name` varchar(255),
	`client_id` varchar(255),
	`client_secret` text,
	`webhook_url` varchar(500),
	`webhook_secret` text,
	`last_sync_at` timestamp,
	`last_error_at` timestamp,
	`last_error_message` text,
	`sync_status` varchar(50) DEFAULT 'idle',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`product_id` int NOT NULL,
	`marketplace_listing_id` varchar(255) NOT NULL,
	`title` varchar(500),
	`description` text,
	`price` int DEFAULT 0,
	`stock` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`listing_url` varchar(500),
	`last_published_at` timestamp,
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`marketplace_item_id` varchar(255),
	`title` varchar(255),
	`quantity` int DEFAULT 1,
	`unit_price` int DEFAULT 0,
	`total_price` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int NOT NULL,
	`marketplace_order_id` varchar(255) NOT NULL,
	`buyer_name` varchar(255),
	`buyer_email` varchar(320),
	`total_amount` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'pending',
	`order_date` timestamp,
	`shipping_address` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`subcategory` varchar(100),
	`brand` varchar(100),
	`color` varchar(100),
	`material` varchar(100),
	`description` text,
	`cost_base` int DEFAULT 0,
	`weight_base` int DEFAULT 0,
	`margin_target` int DEFAULT 0,
	`margin_type` varchar(20) DEFAULT 'perc',
	`stock` int DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`photo_url` varchar(500),
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`marketplace_connection_id` int,
	`product_id` int,
	`order_id` int,
	`sync_type` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL,
	`error_message` text,
	`error_stack` text,
	`retry_count` int DEFAULT 0,
	`max_retries` int DEFAULT 3,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `banhos` ADD CONSTRAINT `banhos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financeiro` ADD CONSTRAINT `financeiro_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insumos` ADD CONSTRAINT `insumos_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kits` ADD CONSTRAINT `kits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_connections` ADD CONSTRAINT `marketplace_connections_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_marketplace_connection_id_marketplace_connections_id_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_marketplace_connection_id_marketplace_connections_id_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_marketplace_connection_id_marketplace_connections_id_fk` FOREIGN KEY (`marketplace_connection_id`) REFERENCES `marketplace_connections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;