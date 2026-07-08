import Order from "../models/Orders";

export const placeOrder = async (req, res) => {
  try {
    const { userId, items, address, totalAmount, paymentMethod } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    const order = await Order.create({
      userId,
      items,
      address,
      totalAmount,
      paymentMethod: paymentMethod || "COD",
      status: "Placed",
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.log("Place order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};
