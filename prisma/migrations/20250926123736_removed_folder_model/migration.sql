/*
  Warnings:

  - You are about to drop the column `folder_id` on the `access_history` table. All the data in the column will be lost.
  - The values [VIEW_FOLDER,EDIT_FOLDER,MOVE_FOLDER,CREATE_FOLDER] on the enum `access_history_action_performed` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `folder_id` on the `files` table. All the data in the column will be lost.
  - You are about to drop the `folder_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `folders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `access_history` DROP FOREIGN KEY `access_history_folder_id_fkey`;

-- DropForeignKey
ALTER TABLE `files` DROP FOREIGN KEY `files_folder_id_fkey`;

-- DropForeignKey
ALTER TABLE `folder_permissions` DROP FOREIGN KEY `folder_permissions_folderId_fkey`;

-- DropForeignKey
ALTER TABLE `folder_permissions` DROP FOREIGN KEY `folder_permissions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `folders` DROP FOREIGN KEY `folders_organization_id_fkey`;

-- DropForeignKey
ALTER TABLE `folders` DROP FOREIGN KEY `folders_parent_folder_id_fkey`;

-- DropIndex
DROP INDEX `access_history_folder_id_fkey` ON `access_history`;

-- DropIndex
DROP INDEX `files_folder_id_fkey` ON `files`;

-- AlterTable
ALTER TABLE `access_history` DROP COLUMN `folder_id`,
    MODIFY `action_performed` ENUM('VIEW_FILE', 'DOWNLOAD_FILE', 'EDIT_FILE', 'MOVE_FILE', 'UPLOAD_FILE') NOT NULL;

-- AlterTable
ALTER TABLE `files` DROP COLUMN `folder_id`;

-- DropTable
DROP TABLE `folder_permissions`;

-- DropTable
DROP TABLE `folders`;

-- CreateTable
CREATE TABLE `file_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `accessLevel` ENUM('VIEW_ONLY', 'DOWNLOAD', 'VIEW_AND_DOWNLOAD', 'UPLOAD', 'MANAGE', 'NO_ACCESS') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `file_permissions_fileId_idx`(`fileId`),
    INDEX `file_permissions_userId_idx`(`userId`),
    UNIQUE INDEX `file_permissions_fileId_userId_key`(`fileId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `file_permissions` ADD CONSTRAINT `file_permissions_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_permissions` ADD CONSTRAINT `file_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
