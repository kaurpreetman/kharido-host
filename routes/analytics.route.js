import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
const router=express.Router();
import { getAdminStats,getAllUsers, deleteUserById  } from '../controllers/analytics.controller.js';

router.get('/stats',protectRoute, getAdminStats);
router.get('/getusers',protectRoute,getAllUsers);
router.delete('/dltuser/:id',protectRoute,deleteUserById)
export default router;
