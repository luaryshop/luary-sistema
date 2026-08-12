CREATE TABLE `kit_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kit_id` int NOT NULL,
	`product_id` int,
	`insumo_id` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_cost` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kit_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`platform` varchar(100) NOT NULL,
	`scheduled_at` timestamp,
	`status` varchar(50) NOT NULL DEFAULT 'planned',
	`link` varchar(500),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`page_key` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`keywords` varchar(500),
	`canonical_url` varchar(500),
	`og_image_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_kit_id_kits_id_fk` FOREIGN KEY (`kit_id`) REFERENCES `kits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_insumo_id_insumos_id_fk` FOREIGN KEY (`insumo_id`) REFERENCES `insumos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_streams` ADD CONSTRAINT `live_streams_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seo_settings` ADD CONSTRAINT `seo_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;