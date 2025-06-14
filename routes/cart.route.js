import express from "express";
const router=express.Router();
import {addToCart,clearCart,removeone,getCartProducts,updateQuantity} from '../controllers/cart.controller.js'
import { protectRoute } from "../middleware/auth.middleware.js";

router.get("/",protectRoute,getCartProducts);
router.post("/add",protectRoute,addToCart);
router.post("/removeone",protectRoute,removeone);
router.put("/:id", protectRoute, updateQuantity);
router.delete("/clear",protectRoute,clearCart);

export default router;