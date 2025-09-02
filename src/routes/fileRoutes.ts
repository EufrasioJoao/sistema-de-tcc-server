import express from "express";
import {
  deleteFile,
  downloadFile,
  getAllFiles,
  getFileById,
  uploadFiles,
  moveFile,
} from "../controllers/FileContoller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/upload/:folder_id", authMiddleware, uploadFiles);

router.get("/:id", authMiddleware, getFileById);

router.get("/", authMiddleware, getAllFiles);

router.delete("/:id", authMiddleware, deleteFile);

router.put("/move/:id", authMiddleware, moveFile);

router.get("/download/:id", authMiddleware, downloadFile);

export default router;
