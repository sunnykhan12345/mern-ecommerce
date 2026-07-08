import express from "express";
import { placeOrder } from "../controllers/OrderController";
placeOrder;
const router = express.Router();

router.post("/place", placeOrder);
export default router;
