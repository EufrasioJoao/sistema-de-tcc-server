import { Router } from "express";

import organizationRoutes from "./organizationRoutes";
import userRoutes from "./userRoutes";
import courseRoutes from "./courseRoutes";
import studentRoutes from "./studentRoutes";
import tccRoutes from "./tccRoutes";
import auditRoutes from "./auditRoutes";
import reportsRoutes from "./reportsRoutes";

const router = Router();

router.use("/api/organizations", organizationRoutes);
router.use("/api/users", userRoutes);
router.use("/api/courses", courseRoutes);
router.use("/api/students", studentRoutes);
router.use("/api/tccs", tccRoutes);
router.use("/api/audit", auditRoutes);
router.use("/api/reports", reportsRoutes);

export default router;
