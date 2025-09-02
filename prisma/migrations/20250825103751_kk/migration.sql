/*
  Warnings:

  - The values [VIEW,DOWNLOAD,EDIT,MOVE,UPLOAD] on the enum `access_history_action_performed` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `access_history` MODIFY `action_performed` ENUM('VIEW_FILE', 'VIEW_FOLDER', 'DOWNLOAD_FILE', 'EDIT_FILE', 'EDIT_FOLDER', 'MOVE_FILE', 'MOVE_FOLDER', 'UPLOAD_FILE', 'CREATE_FOLDER') NOT NULL;
