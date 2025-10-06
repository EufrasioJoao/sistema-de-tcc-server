import { Router } from "express";
import {
  getBackupHistory,
  createBackup,
  downloadBackup,
} from "../controllers/backupController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// All backup routes require authentication and admin/system manager roles
router.use(authMiddleware);

// Get backup history
router.get("/history", getBackupHistory);

// Create new backup
router.post("/create", createBackup);

// Download backup file
router.get("/download/:id", downloadBackup);

export default router;
