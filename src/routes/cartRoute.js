import express from "express";
import {
  addToCart,
  removeFromCart,
  updateCartItem,
  getCartByUserId,
} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add", addToCart);
router.get("/", getCartByUserId);
router.put("/update", updateCartItem);
router.delete("/remove", removeFromCart);

export default router;
