import express from "express";
import {
  createFolder,
  deleteFolder,
  moveFolder,
  updateFolder,
  searchForFolderContent,
  getFolderById,
  getorganizationFolders,
  getFolderContent,
} from "../controllers/FolderController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/create", authMiddleware, createFolder);
router.get(
  "/organization/:organizationId/folder/:folderId/search/:searchTerm",
  authMiddleware,
  searchForFolderContent
);
router.get("/:id", authMiddleware, getFolderById);
router.get(
  "/organization/:organizationId",
  authMiddleware,
  getorganizationFolders
);
router.get("/folder-content/:id", authMiddleware, getFolderContent);
router.put("/:id", authMiddleware, updateFolder);

router.put("/move/:id", authMiddleware, moveFolder);
router.delete("/:id", authMiddleware, deleteFolder);

export default router;
