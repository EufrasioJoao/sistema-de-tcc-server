import { Router } from "express";
import {
  getAuditLogs,
  getAuditStatistics,
  getUserAuditLogs,
  getFileAuditLogs,
} from "../controllers/auditController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get audit logs - Only ADMIN and SISTEM_MANAGER
router.get("/", getAuditLogs);

// Get audit statistics - Only ADMIN and SISTEM_MANAGER
router.get("/statistics", getAuditStatistics);

// Get audit logs for specific user - ADMIN, SISTEM_MANAGER, or own logs
router.get("/user/:userId", getUserAuditLogs);

// Get audit logs for specific file - Only ADMIN and SISTEM_MANAGER
router.get("/file/:fileId", getFileAuditLogs);

export default router;
