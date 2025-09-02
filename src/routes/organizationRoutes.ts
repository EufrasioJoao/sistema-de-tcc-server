import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  activateOrganization,
  createOrganization,
  deactivateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getDashboardDataByOrganizationID,
  getOrganizationById,
  getOrganizationStorage,
  updateOrganization,
} from "../controllers/OrganizationController";

const router = express.Router();

router.get(
  "/get-dashboard-data-by-organization-id",
  authMiddleware,
  getDashboardDataByOrganizationID
);

router.post("/create", authMiddleware, createOrganization);

router.get("/", authMiddleware, getAllOrganizations);

router.get("/:id", authMiddleware, getOrganizationById);

router.put("/:id", authMiddleware, updateOrganization);

router.delete("/:id", authMiddleware, deleteOrganization);

router.put("/:organizationId/activate", authMiddleware, activateOrganization);

router.put(
  "/:organizationId/deactivate",
  authMiddleware,
  deactivateOrganization
);

router.get("/:id/storage", authMiddleware, getOrganizationStorage);

export default router;
