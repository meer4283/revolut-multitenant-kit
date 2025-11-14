/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `Tenant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_tenant_id_fkey`;

-- DropIndex
DROP INDEX `orders_tenant_id_created_at_idx` ON `orders`;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `tenant_id`;

-- DropTable
DROP TABLE `Tenant`;
