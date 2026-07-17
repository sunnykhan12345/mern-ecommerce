import express from "express";

import {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

const handleProfileImageUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (error) {
      console.error("PROFILE IMAGE MULTER ERROR:", error);

      return res.status(400).json({
        success: false,
        message: error.message || "Profile image upload failed.",
      });
    }

    console.log("PROFILE UPLOAD REQUEST:", {
      contentType: req.headers["content-type"],
      body: req.body,
      file: req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            hasBuffer: Boolean(req.file.buffer),
          }
        : null,
    });

    return next();
  });
};

router.post("/signup", registerUser);
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.put("/reset-password", resetPassword);

router.get("/me", authMiddleware, getMe);

router.put("/profile", authMiddleware, handleProfileImageUpload, updateProfile);

router.put("/change-password", authMiddleware, changePassword);

export default router;
