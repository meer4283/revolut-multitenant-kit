-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `revolut_secret_key_sandbox` VARCHAR(255) NULL,
    `revolut_secret_key_live` VARCHAR(255) NULL,
    `revolut_webhook_id_sandbox` VARCHAR(128) NULL,
    `revolut_webhook_secret_sandbox` VARCHAR(255) NULL,
    `revolut_webhook_id_live` VARCHAR(128) NULL,
    `revolut_webhook_secret_live` VARCHAR(255) NULL,
    `webhook_base_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `order_number` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `total_amount_minor` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `capture_mode` ENUM('AUTOMATIC', 'MANUAL') NOT NULL DEFAULT 'AUTOMATIC',
    `state` ENUM('CREATED', 'AUTHORISED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'CREATED',
    `revolut_order_id` VARCHAR(191) NOT NULL,
    `revolut_public_token` VARCHAR(191) NOT NULL,
    `selected_method` ENUM('CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'REVOLUT_PAY', 'PAY_BY_BANK') NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    UNIQUE INDEX `orders_revolut_order_id_key`(`revolut_order_id`),
    UNIQUE INDEX `orders_revolut_public_token_key`(`revolut_public_token`),
    INDEX `orders_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `orders_state_created_at_idx`(`state`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `item_type` ENUM('PHYSICAL', 'SERVICE') NOT NULL DEFAULT 'PHYSICAL',
    `quantity` INTEGER NOT NULL,
    `unit_price_minor` INTEGER NOT NULL,
    `total_amount_minor` INTEGER NOT NULL,
    `image_url` VARCHAR(2048) NULL,

    INDEX `order_items_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `method` ENUM('CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'REVOLUT_PAY', 'PAY_BY_BANK') NOT NULL,
    `status` ENUM('INITIATED', 'AUTHORISED', 'CAPTURED', 'PARTIALLY_CAPTURED', 'CANCELLED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `amount_minor` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `provider_payment_id` VARCHAR(191) NULL,
    `provider_order_id` VARCHAR(191) NULL,
    `authorised_at` DATETIME(3) NULL,
    `captured_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `raw_payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_provider_payment_id_key`(`provider_payment_id`),
    INDEX `payments_order_id_idx`(`order_id`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `amount_minor` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `status` ENUM('SUBMITTED', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'SUBMITTED',
    `reason` VARCHAR(255) NULL,
    `provider_refund_id` VARCHAR(191) NULL,
    `provider_order_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refunds_provider_refund_id_key`(`provider_refund_id`),
    INDEX `refunds_order_id_created_at_idx`(`order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `event_type` VARCHAR(64) NOT NULL,
    `provider_order_id` VARCHAR(191) NULL,
    `signature_valid` BOOLEAN NOT NULL DEFAULT false,
    `payload_json` JSON NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `order_id` VARCHAR(191) NULL,

    INDEX `webhook_events_provider_order_id_received_at_idx`(`provider_order_id`, `received_at`),
    INDEX `webhook_events_event_type_received_at_idx`(`event_type`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
