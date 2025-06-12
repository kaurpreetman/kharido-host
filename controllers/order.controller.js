import dotenv from 'dotenv';
import crypto from 'crypto';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import Order from "../models/order.model.js";
import Product from "../models/Product.model.js";
import User from "../models/user.model.js";

dotenv.config();

const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`);
const razorpay = new Razorpay({
  key_id: `${process.env.RAZORPAY_KEY_ID}`,
  key_secret: `${process.env.RAZORPAY_KEY_SECRET}`,
});

// Place Order (COD & Bank Transfer)
const placeOrder = async (req, res) => {
  try {
    const user=req.user?._id
    const {products, totalAmount, address, paymentMethod } = req.body;

    if (!user || !products.length || !totalAmount || !address || !paymentMethod) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newOrder = new Order({
      user,
      products,
      totalAmount,
      address,
      paymentMethod,
      paymentStatus: paymentMethod === "cash_on_delivery" ? "pending" : "failed",
      status: "pending",
    });

    await newOrder.save();

    await User.findByIdAndUpdate(user, {
      $push: { orders: { product: newOrder._id } },
      
    });

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Place Order with Stripe
const placeOrderStripe = async (req, res) => {
  try {
    const user= req.user?._id;
const { products, totalAmount, address, paymentMethod } = req.body;

if (!user || !products?.length || !totalAmount || !address || !paymentMethod) {
  return res.status(400).json({ message: "All fields are required" });
}

    const deliveryCharge = 10; // ₹10
    const currency = "inr";

    const enrichedProducts = await Promise.all(
      products.map(async (item) => {
        const productDoc = await Product.findById(item.product);
        if (!productDoc) throw new Error(`Product not found: ${item.product}`);
        return {
          ...item,
          product_name: productDoc.name,
        };
      })
    );

    const line_items = [
      ...enrichedProducts.map((item) => ({
        price_data: {
          currency,
          product_data: {
            name: item.product_name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      {
        price_data: {
          currency,
          product_data: { name: "Delivery Charge" },
          unit_amount: deliveryCharge * 100,
        },
        quantity: 1,
      },
    ];

    const newOrder = new Order({
  user: user,
  products,
  totalAmount,
  address,
  paymentMethod: "stripe",
  paymentStatus: "pending",
  status: "pending",
});

    await newOrder.save();

    const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items,
  mode: "payment",
  success_url: `${process.env.CLIENT_URL}/order-success/${user}/${newOrder._id}`,
  cancel_url: `${process.env.CLIENT_URL}/checkout`,
});

    res.status(201).json({ sessionId: session.id, order: newOrder });
  } catch (error) {
    console.log(error);
    console.error("Stripe order error:", error);
    res.status(500).json({ message: "Stripe payment failed", error: error.message });
  }
};

// Verify Stripe Payment
const verifyStripe = async (req, res) => {
  const userId = req.user?._id;
  const { orderId, success } = req.body;

  try {
    if (!orderId || !userId) {
      return res.status(400).json({ success: false, message: "Missing orderId or userId" });
    }

    if (success === "true") {
    
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid" });

   
      // await User.findByIdAndUpdate(userId, { $set: { cartItems: {} } });

      return res.status(200).json({ success: true, message: "Payment verified and cart cleared" });
    } else {
 
      await Order.findByIdAndDelete(orderId);
      return res.status(200).json({ success: false, message: "Payment failed. Order deleted" });
    }
  } catch (error) {
    console.error("Stripe verification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// Place Order with Razorpay
const placeOrderRazorpay = async (req, res) => {
  try {
    const user = req.user?._id;
    const { products, totalAmount, address } = req.body;

    if (!user || !products.length || !totalAmount || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    const newOrder = new Order({
      user,
      products,
      totalAmount,
      address,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
    });

    await newOrder.save();

    res.status(201).json({ orderId: razorpayOrder.id, order: newOrder });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Razorpay payment failed", error: error.message });
  }
};

// Verify Razorpay Payment
const verifyRazorpay = async (req, res) => {
  try {
    const userId=req.user?._id
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId} = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256",`${process.env.RAZORPAY_KEY_SECRET}`)
      .update(sign)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });

      // await User.findByIdAndUpdate(userId, { cartItems: {} });

      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed" });
      res.status(400).json({ success: false, message: "Payment verification failed" });
    }
  } catch (error) {
    console.log(error);
    console.error("Razorpay verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id })
      .populate({
        path: 'products.product',
        model: 'Product',
        select: 'name image price' // ✅ only fetch name (you can add price, image etc. too)
      });

    res.status(200).json(orders);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Return order
const returnOrder = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order || order.isReturned) {
      return res.status(404).json({ message: "Order not found or already returned" });
    }

    if (order.status !== "delivered" || !order.deliveredAt) {
      return res.status(400).json({ message: "Order not delivered yet" });
    }

    const deliveredAt = new Date(order.deliveredAt);
    const now = new Date();

    if ((now - deliveredAt) / (1000 * 60 * 60 * 24) > 7) {
      return res.status(400).json({ message: "Return window expired" });
    }

    order.status = "returned";
    await order.save();

    res.status(200).json({ message: "Product returned successfully" });
  } catch (err) {
    res.status(500).json({ message: "Return failed" });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order || order.isCancelled) {
      return res.status(404).json({ message: "Order not found or already cancelled" });
    }

    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

    if (["shipped", "delivered"].includes(order.status) || diffDays > 6) {
      return res.status(400).json({ message: "Cannot cancel this order" });
    }

    order.status = "cancelled";
    order.isCancelled = true;
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Cancellation failed" });
  }
};

const allOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email") // Just get the user who placed the order
      .populate("products.product", "name"); // Get product name only

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch orders",
    });
  }
};



// Update Status (Admin)
const updateStatus = async (req, res) => {
  const { orderId, status } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();
    res.json({ success: true, message: 'Status updated', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Default export
export {
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  verifyStripe,
  verifyRazorpay,
  getUserOrders,
  returnOrder,
  cancelOrder,
  allOrders,
  updateStatus,
};
