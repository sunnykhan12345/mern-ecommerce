import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

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

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      user.name = cleanName;
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
        _id: {
          $ne: user._id,
        },
      });

      if (emailOwner) {
        return res.status(409).json({
          success: false,
          message: "This email address is already in use",
        });
      }

      user.email = cleanEmail;
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    const previousImagePublicId = user.profileImage?.public_id || "";

    if (req.file) {
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

      if (!uploadedImage?.url || !uploadedImage?.public_id) {
        throw new Error("Cloudinary did not return url and public_id.");
      }

      newlyUploadedPublicId = uploadedImage.public_id;

      user.set("profileImage", {
        url: uploadedImage.url,
        public_id: uploadedImage.public_id,
      });
    }

    // Save exactly once
    await user.save();

    imageSavedToDatabase = true;

    // Read it again from MongoDB to confirm persistence
    const savedUser = await User.findById(user._id);

    if (!savedUser) {
      throw new Error("User could not be read after profile update.");
    }

    console.log("PROFILE SAVED IN DATABASE:", {
      userId: savedUser._id,
      profileImage: savedUser.profileImage,
    });

    // Delete the previous Cloudinary image only after DB save succeeds
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

    // Delete a new Cloudinary image only when MongoDB save failed
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP generated successfully",
      otp,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
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

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
