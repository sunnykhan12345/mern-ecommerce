import express from "express";
import {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/OrderController";
import { getDashboardStats } from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post("/place", placeOrder);

// Admin routes
router.get("/admin/stats", authMiddleware, adminMiddleware, getDashboardStats);
router.get("/admin/all", authMiddleware, adminMiddleware, getAllOrders);
router.get("/admin/:id", authMiddleware, adminMiddleware, getOrderById);
router.patch(
  "/admin/:id/status",
  authMiddleware,
  adminMiddleware,
  updateOrderStatus,
);

export default router;
