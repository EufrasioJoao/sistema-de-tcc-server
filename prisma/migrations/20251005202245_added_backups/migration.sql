/*
  Warnings:

  - The values [MOVE_FILE] on the enum `access_history_action_performed` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `file_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `file_permissions` DROP FOREIGN KEY `file_permissions_fileId_fkey`;

-- DropForeignKey
ALTER TABLE `file_permissions` DROP FOREIGN KEY `file_permissions_userId_fkey`;

-- AlterTable
ALTER TABLE `access_history` MODIFY `action_performed` ENUM('VIEW_FILE', 'DOWNLOAD_FILE', 'EDIT_FILE', 'UPLOAD_FILE') NOT NULL;

-- DropTable
DROP TABLE `file_permissions`;

-- CreateTable
CREATE TABLE `backups` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `s3_key` VARCHAR(191) NOT NULL,
    `s3_url` VARCHAR(191) NULL,
    `file_size` BIGINT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `backups_s3_key_key`(`s3_key`),
    INDEX `backups_status_idx`(`status`),
    INDEX `backups_started_at_idx`(`started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
