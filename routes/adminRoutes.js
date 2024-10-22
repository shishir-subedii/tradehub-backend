const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.patch('/update-order-status/:orderId', authMiddleware.verifyAdmin, adminController.updateOrderStatus);
router.patch('/cancel-order/:orderId', authMiddleware.verifyAdmin, adminController.adminCancelOrder);
router.delete('/delete-user/:userId', authMiddleware.verifyAdmin, adminController.deleteUser);
router.delete('/delete-product/:productId', authMiddleware.verifyAdmin, adminController.deleteProduct);
router.get('/search-user', authMiddleware.verifyAdmin, adminController.searchUser);
router.get('/search-order', authMiddleware.verifyAdmin, adminController.searchOrder);
router.get('/get-all-users', authMiddleware.verifyAdmin, adminController.getAllUsers); // New route
router.get('/get-all-orders', authMiddleware.verifyAdmin, adminController.getAllOrders); // New route

module.exports = router;
