import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

const getAuthenticatedUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      userId,
      products: [],
    });
  }

  return wishlist;
};

const populateWishlist = async (userId) => {
  return Wishlist.findOne({ userId }).populate("products");
};

// GET /api/wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await getOrCreateWishlist(userId);
    const wishlist = await populateWishlist(userId);

    return res.status(200).json({
      success: true,
      wishlist,
      count: wishlist?.products?.length || 0,
    });
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load wishlist",
    });
  }
};

// POST /api/wishlist/add
export const addToWishlist = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const wishlist = await getOrCreateWishlist(userId);
    const alreadySaved = wishlist.products.some((id) => id.equals(productId));

    if (!alreadySaved) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    const populated = await populateWishlist(userId);

    return res.status(200).json({
      success: true,
      message: alreadySaved
        ? "Product is already in your wishlist"
        : "Product added to wishlist",
      wishlist: populated,
    });
  } catch (error) {
    console.error("ADD TO WISHLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to add product to wishlist",
    });
  }
};

// DELETE /api/wishlist/remove
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const productId = req.body?.productId || req.query?.productId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => !id.equals(productId),
    );
    await wishlist.save();

    const populated = await populateWishlist(userId);

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist: populated,
    });
  } catch (error) {
    console.error("REMOVE FROM WISHLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to remove product from wishlist",
    });
  }
};

// POST /api/wishlist/toggle
export const toggleWishlist = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const wishlist = await getOrCreateWishlist(userId);
    const alreadySaved = wishlist.products.some((id) => id.equals(productId));

    if (alreadySaved) {
      wishlist.products = wishlist.products.filter(
        (id) => !id.equals(productId),
      );
    } else {
      wishlist.products.push(productId);
    }

    await wishlist.save();

    const populated = await populateWishlist(userId);

    return res.status(200).json({
      success: true,
      message: alreadySaved
        ? "Product removed from wishlist"
        : "Product added to wishlist",
      added: !alreadySaved,
      wishlist: populated,
    });
  } catch (error) {
    console.error("TOGGLE WISHLIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update wishlist",
    });
  }
};
