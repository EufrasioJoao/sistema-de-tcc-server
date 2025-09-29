import { Router } from "express";
import {
  getAllTCCs,
  getTCCStatistics,
  getTCCCardsStatistics,
  getTCCChartsStatistics,
  getTCCById,
  updateTCC,
  deleteTCC,
  downloadTCCFile,
  intelligentTCCSearch,
  getSearchHistory,
  clearSearchHistory,
} from "../controllers/tccController";
import {
  createTCCWithUpload,
  updateTCCDefenseRecord,
} from "../controllers/tccUploadController";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  requireRole,
  requireTCCAccess,
  requireTCCModifyAccess,
  requireTCCDeleteAccess,
} from "../middlewares/roleMiddleware";
import { UserRoles } from "@prisma/client";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all TCCs - All authenticated users can view
router.get("/", getAllTCCs);

// Get TCC statistics - All authenticated users can view
router.get("/statistics/cards", getTCCCardsStatistics);
router.get("/statistics/charts", getTCCChartsStatistics);
router.get("/statistics", getTCCStatistics);

// Intelligent search endpoints - All authenticated users can search
router.post("/search/intelligent", intelligentTCCSearch);
router.get("/search/history", getSearchHistory);
router.delete("/search/history", clearSearchHistory);

// Get TCC by ID - Check specific TCC access
router.get("/:id", requireTCCAccess, getTCCById);

// Download TCC file - Check file access permissions (handled in controller)
router.get("/:id/download/:fileType", requireTCCAccess, downloadTCCFile);

// Create a new TCC - All authenticated users can create
router.post("/upload", createTCCWithUpload);

// Update TCC defense record file - Check modify permissions
router.put("/:id/defense-record", requireTCCModifyAccess, updateTCCDefenseRecord);

// Update a TCC - Check modify permissions
router.put("/:id", requireTCCModifyAccess, updateTCC);

// Delete a TCC - Only ADMIN and SISTEM_MANAGER can delete
router.delete("/:id", requireTCCDeleteAccess, deleteTCC);

export default router;
