const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/new-order', authMiddleware.verifyUser, orderController.newOrder);
router.patch('/mark-as-processing/:orderId', authMiddleware.verifyUser, orderController.markAsProcessing);
router.patch('/cancel-order/:orderId', authMiddleware.verifyUser, orderController.cancelOrder);
router.get('/get-all-orders', authMiddleware.verifyUser, orderController.getAllOrdersForSeller);
router.get('/user-orders', authMiddleware.verifyUser, orderController.getAllOrdersForUser); // New route

module.exports = router;
