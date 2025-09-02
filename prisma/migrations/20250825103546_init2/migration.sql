/*
  Warnings:

  - You are about to drop the `file_access_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `file_access_history` DROP FOREIGN KEY `file_access_history_accessed_by_fkey`;

-- DropForeignKey
ALTER TABLE `file_access_history` DROP FOREIGN KEY `file_access_history_file_id_fkey`;

-- DropTable
DROP TABLE `file_access_history`;

-- CreateTable
CREATE TABLE `access_history` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `accessed_by` VARCHAR(191) NOT NULL,
    `file_id` VARCHAR(191) NULL,
    `folder_id` VARCHAR(191) NULL,
    `accessed_at` DATETIME(3) NULL,
    `action_performed` ENUM('VIEW', 'DOWNLOAD', 'EDIT', 'MOVE', 'UPLOAD') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `access_history_accessed_by_fkey`(`accessed_by`),
    INDEX `access_history_file_id_fkey`(`file_id`),
    INDEX `access_history_folder_id_fkey`(`folder_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `access_history` ADD CONSTRAINT `access_history_accessed_by_fkey` FOREIGN KEY (`accessed_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_history` ADD CONSTRAINT `access_history_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_history` ADD CONSTRAINT `access_history_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
