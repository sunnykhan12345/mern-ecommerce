import express from "express";

import {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.put("/reset-password", resetPassword);

router.get("/me", authMiddleware, getMe);

router.put(
  "/profile",
  authMiddleware,

  // This middleware reads multipart/form-data
  upload.single("profileImage"),

  (req, res, next) => {
    console.log("PROFILE REQUEST CONTENT TYPE:", req.headers["content-type"]);

    console.log("PROFILE REQUEST BODY:", req.body);

    console.log(
      "PROFILE REQUEST FILE:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : null,
    );

    next();
  },

  updateProfile,
);

router.put("/change-password", authMiddleware, changePassword);

export default router;
