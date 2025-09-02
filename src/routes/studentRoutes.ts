import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Student routes
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
