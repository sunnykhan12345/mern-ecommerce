import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../controllers/wishlistController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.post("/toggle", toggleWishlist);
router.delete("/remove", removeFromWishlist);

export default router;
