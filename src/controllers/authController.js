import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const normalizeEmail = (email = "") => {
  return String(email).trim().toLowerCase();
};

const getAuthenticatedUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    profileImage: {
      url: user.profileImage?.url || "",
      public_id: user.profileImage?.public_id || "",
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const generateOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

const clearOtpFields = (user) => {
  user.otp = null;
  user.otpExpiry = null;
  user.isOtpVerified = false;
};

const issueAndSendOtp = async (user) => {
  const otp = generateOtp();

  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  user.isOtpVerified = false;

  await user.save();

  try {
    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });
  } catch (emailError) {
    clearOtpFields(user);
    await user.save();
    throw emailError;
  }

  return otp;
};

// POST /api/auth/signup
export const registerUser = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profileImage: {
        url: "",
        public_id: "",
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  let newlyUploadedPublicId = "";
  let imageSavedToDatabase = false;

  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { name, email, phone } = req.body;
    const updates = {};

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      updates.name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const emailOwner = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      });

      if (emailOwner) {
        return res.status(409).json({
          success: false,
          message: "This email address is already in use",
        });
      }

      updates.email = cleanEmail;
    }

    if (phone !== undefined) {
      updates.phone = String(phone).trim();
    }

    const previousImagePublicId = user.profileImage?.public_id || "";

    if (req.file) {
      if (!req.file.mimetype?.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed for profile picture",
        });
      }

      console.log("FILE RECEIVED BY CONTROLLER:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: Boolean(req.file.buffer),
      });

      const uploadedImage = await uploadToCloudinary(
        req.file,
        "ecommerce/users",
      );

      const secureUrl = uploadedImage?.url || uploadedImage?.secure_url;

      if (!secureUrl || !uploadedImage?.public_id) {
        throw new Error("Cloudinary did not return secure_url and public_id.");
      }

      newlyUploadedPublicId = uploadedImage.public_id;

      // Persist Cloudinary secure_url explicitly via $set so nested
      // profileImage is never left as an empty string in MongoDB.
      updates.profileImage = {
        url: secureUrl,
        public_id: uploadedImage.public_id,
      };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile fields were provided to update",
      });
    }

    const savedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!savedUser) {
      throw new Error("User could not be updated.");
    }

    imageSavedToDatabase = true;

    console.log("PROFILE SAVED IN DATABASE:", {
      userId: savedUser._id,
      profileImage: savedUser.profileImage,
    });

    if (
      req.file &&
      previousImagePublicId &&
      previousImagePublicId !== savedUser.profileImage?.public_id
    ) {
      try {
        await cloudinary.uploader.destroy(previousImagePublicId, {
          resource_type: "image",
        });
      } catch (deleteError) {
        console.error("OLD CLOUDINARY IMAGE DELETE ERROR:", deleteError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: formatUserResponse(savedUser),
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    if (newlyUploadedPublicId && !imageSavedToDatabase) {
      try {
        await cloudinary.uploader.destroy(newlyUploadedPublicId, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        console.error("NEW IMAGE CLEANUP ERROR:", cleanupError);
      }
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email address is already in use",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to update profile",
    });
  }
};

// PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    // Avoid revealing whether an email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for this email, an OTP has been sent.",
      });
    }

    await issueAndSendOtp(user);

    return res.status(200).json({
      success: true,
      message: "OTP has been sent to your email address",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message?.includes("EMAIL_")
          ? "Email service is not configured. Please contact support."
          : "Unable to send OTP. Please try again later.",
    });
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for this email, a new OTP has been sent.",
      });
    }

    await issueAndSendOtp(user);

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email address",
    });
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP. Please try again later.",
    });
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit code",
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
      clearOtpFields(user);
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isOtpVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// PUT /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const { newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    if (!user.isOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify the OTP before resetting your password",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
      clearOtpFields(user);
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearOtpFields(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
