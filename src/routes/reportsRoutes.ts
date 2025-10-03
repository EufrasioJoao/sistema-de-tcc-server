import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
    getSystemStatistics,
    getTccReports,
    getUserActivityReports,
    getStorageReports,
    getCourseReports,
    getAuthorReports,
    getKeywordReports,
    getThemeReports,
} from "../controllers/reportsController";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// System statistics
router.get("/statistics", getSystemStatistics);

// TCC reports
router.get("/tccs", getTccReports);

// User activity reports
router.get("/activity", getUserActivityReports);

// Storage reports
router.get("/storage", getStorageReports);

// Course reports
router.get("/courses", getCourseReports);

// Author reports
router.get("/authors", getAuthorReports);

// Keyword reports
router.get("/keywords", getKeywordReports);

// Theme reports
router.get("/themes", getThemeReports);



export default router;