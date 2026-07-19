import Order from "../models/Orders.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// GET /api/orders/admin/stats
export const getDashboardStats = async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalCustomers, recentOrders] =
      await Promise.all([
        Order.countDocuments(),
        Product.countDocuments(),
        User.countDocuments({ role: "user" }),
        Order.find()
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalRevenue: revenueResult[0]?.total || 0,
        statusBreakdown,
      },
      recentOrders,
    });
  } catch (error) {
    console.log("Get dashboard stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};
