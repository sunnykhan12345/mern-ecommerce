import Product from "../models/Product.js";

export const createProduct = async (req, res) => {
  try {
    const { title, description, price, image, category, stock } = req.body;
    const product = new Product({
      title,
      description,
      price,
      image,
      category,
      stock,
    });
    await product.save();
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
