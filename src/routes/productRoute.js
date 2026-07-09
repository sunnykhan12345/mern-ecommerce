// import express from "express";
// import {
//   createProduct,
//   getProducts,
//   updateProduct,
//   deleteProduct,
//   getProductById,
// } from "../controllers/productController.js";
// const router = express.Router();
// router.post("/add", createProduct);
// router.get("/", getProducts);
// router.get("/:id", getProductById);
// router.put("/update/:id", updateProduct);
// router.delete("/delete/:id", deleteProduct);
// export default router;
import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductById,
} from "../controllers/productController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin Routes
router.post("/add", authMiddleware, adminMiddleware, createProduct);
router.put("/update/:id", authMiddleware, adminMiddleware, updateProduct);
router.delete("/delete/:id", authMiddleware, adminMiddleware, deleteProduct);

export default router;
