/*
  Warnings:

  - You are about to drop the `_organizationtouser` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organization_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_organizationtouser` DROP FOREIGN KEY `_OrganizationToUser_A_fkey`;

-- DropForeignKey
ALTER TABLE `_organizationtouser` DROP FOREIGN KEY `_OrganizationToUser_B_fkey`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `organization_id` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `_organizationtouser`;

-- CreateIndex
CREATE INDEX `users_organization_id_idx` ON `users`(`organization_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
