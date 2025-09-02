-- AlterTable
ALTER TABLE `file_access_history` MODIFY `action_performed` ENUM('VIEW', 'DOWNLOAD', 'EDIT', 'MOVE', 'UPLOAD') NOT NULL;
