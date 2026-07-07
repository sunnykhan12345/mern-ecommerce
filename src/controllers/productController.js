import Product from "../models/Product.js";

// create a new product ['/api/products', POST]
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
// get all products ['/api/products', GET]
export const getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// update a product ['/api/products/:id', PUT]
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, image, category, stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      id,
      { title, description, price, image, category, stock },
      { new: true },
    );
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// delete a product ['/api/products/:id', DELETE]
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// get product by id ['/api/products/:id', GET]
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
