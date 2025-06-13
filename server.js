import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { connectDB } from './lib/db.js';

import orderRoutes from './routes/order.route.js'
import authRoutes from './routes/auth.route.js';
import productRoutes from './routes/product.route.js';
import cartRoutes from './routes/cart.route.js';
import analyticsRoutes from './routes/analytics.route.js'



dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();


const allowedOrigins = ['https://subtle-begonia-7b3674.netlify.app','https://courageous-heliotrope-f1246e.netlify.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/analytics',analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders',orderRoutes)
// app.use('/api/analytics', analyticsRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
