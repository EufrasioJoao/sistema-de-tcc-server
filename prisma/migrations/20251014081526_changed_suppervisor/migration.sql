/*
  Warnings:

  - You are about to drop the column `supervisorId` on the `tccs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `tccs` DROP FOREIGN KEY `tccs_supervisorId_fkey`;

-- DropIndex
DROP INDEX `tccs_supervisorId_idx` ON `tccs`;

-- AlterTable
ALTER TABLE `tccs` DROP COLUMN `supervisorId`,
    ADD COLUMN `supervisor` VARCHAR(191) NULL;
