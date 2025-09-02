import { Router } from "express";

import organizationRoutes from "./organizationRoutes";
import userRoutes from "./userRoutes";
import folderRoutes from "./folderRoutes";
import fileRoutes from "./fileRoutes";
import courseRoutes from "./courseRoutes";
import studentRoutes from "./studentRoutes";

const router = Router();

router.use("/api/organizations", organizationRoutes);
router.use("/api/users", userRoutes);
router.use("/api/courses", courseRoutes);
router.use("/api/students", studentRoutes);
router.use("/api/folders", folderRoutes);
router.use("/api/files", fileRoutes);

export default router;
