import Product from '../models/Product.model.js';

// ✅ ADD TO CART
export const addToCart = async (req, res) => {
  try {
    const user = req.user;
    const { productId, size = null } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const existingItem = user.cartItems.find(
      (item) => item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, size, quantity: 1 });
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ GET CART PRODUCTS
export const getCartProducts = async (req, res) => {
  try {
    const cartItems = await Promise.all(
      req.user.cartItems.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          product: product._id.toString(),
          name: product.name,
          price: product.price,
          size: item.size,
          quantity: item.quantity,
        };
      })
    );

    res.json(cartItems);
  } catch (error) {
    console.error("Error in getCartProducts:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ UPDATE QUANTITY
export const updateQuantity = async (req, res) => {
  try {
    const user = req.user;
    const { productId, size = null, quantity } = req.body;

    const item = user.cartItems.find(
      (item) => item.product.toString() === productId && item.size === size
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (quantity === 0) {
      user.cartItems = user.cartItems.filter(
        (item) => !(item.product.toString() === productId && item.size === size)
      );
    } else {
      item.quantity = quantity;
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in updateQuantity:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ REMOVE ONE
export const removeone = async (req, res) => {
  try {
    const user = req.user;
    const { productId, size = null } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const filteredCart = user.cartItems.filter(
      (item) => !(item.product.toString() === productId && item.size === size)
    );

    user.cartItems = filteredCart;

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in removeOne:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ CLEAR CART
export const clearCart = async (req, res) => {
  try {
    const user = req.user;
    user.cartItems = [];
    await user.save();
    res.json({ success: true, cartItems: [] });
  } catch (error) {
    console.error("Error in clearCart:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
