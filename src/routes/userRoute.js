import express from "express";
import {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
// Protected Route
router.get("/me", authMiddleware, getMe);
// udpaet profile
router.put("/profile", authMiddleware, updateProfile);
// forgot pass
router.post("/forgot-password", forgotPassword);
// verfi otp
router.post("/verify-otp", verifyOtp);
// rets pass
router.put("/reset-password", resetPassword);
export default router;
