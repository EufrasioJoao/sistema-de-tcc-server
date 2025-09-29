import express from "express";
import {
  deleteUser,
  getAllUsers,
  getAllUsersWithDetails,
  activateUser,
  deactivateUser,
  getDashboardData,
  getUserById,
  getUserByIdWithDetails,
  updateUser,
  searchUser,
  loginUser,
  sendResetCode,
  verifyResetCode,
  resetPasswordWithCode,
  SignUp,
  registerUser,
} from "../controllers/UserController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/signup", SignUp);

router.post("/login", loginUser);

router.post("/register", authMiddleware, registerUser);

router.get("/get-dashboard-data", authMiddleware, getDashboardData);

router.get("/", authMiddleware, getAllUsers);

router.get("/search/:searchTerm", authMiddleware, searchUser);



router.post("/history", authMiddleware, getAllUsersWithDetails);

router.get(
  "/:id/with-history",
  authMiddleware,
  getUserByIdWithDetails
);

router.get(
  "/:id",
  authMiddleware,
  getUserById
);

router.put(
  "/:id",
  authMiddleware,
  updateUser
);

router.delete("/:id", authMiddleware, deleteUser);

router.put("/:UserId/activate", authMiddleware, activateUser);

router.put("/:UserId/deactivate", authMiddleware, deactivateUser);

// User password reset via email code
router.post("/password/forgot/send-code", sendResetCode);
router.post("/password/forgot/verify-code", verifyResetCode);
router.post("/password/forgot/reset", resetPasswordWithCode);

export default router;
