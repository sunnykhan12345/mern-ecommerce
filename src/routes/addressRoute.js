import express from "express";
import { saveAddress, getAddresses } from "../controllers/AddressController";

const router = express.Router();

router.post("/add", saveAddress);
router.get("/:userId", getAddresses);
export default router;
