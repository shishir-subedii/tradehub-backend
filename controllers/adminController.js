const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendMessageViaEmail } = require('../services/mailService');
const User = require('../models/User');

exports.adminCancelOrder = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId).exec();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus === 'completed' || order.orderStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Completed or cancelled orders cannot be cancelled' });
        }

        order.orderStatus = 'cancelled';
        order.updatedAt = Date.now();
        await order.save();

        // Restore product quantities and adjust soldCount
        const bulkOps = order.products.map(item => ({
            updateOne: {
                filter: { _id: item.product },
                update: {
                    $inc: {
                        quantity: item.quantity,
                        soldCount: -item.quantity
                    }
                },
                upsert: false
            }
        }));

        await Product.bulkWrite(bulkOps);

        // Send cancellation email to buyer
        const buyerDetails = await User.findById(order.buyer).exec();
        sendMessageViaEmail(buyerDetails.email, 'Order Cancellation', `Your order with ID ${order._id} has been cancelled by the admin.`);

        return res.status(200).json({ success: true, message: 'Order cancelled successfully by admin', order });
    } catch (error) {
        console.error('Error occurred while cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        const order = await Order.findById(orderId).exec();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = status;
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({ success: true, message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Error occurred while updating order status:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Delete a user by admin
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findByIdAndDelete(userId).exec();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        sendMessageViaEmail(user.email, 'Account Deletion', 'Your account has been deleted by the admin.');

        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error occurred while deleting user:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a product by admin
exports.deleteProduct = async (req, res) => {
    const { productId } = req.params;

    try {
        const product = await Product.findByIdAndDelete(productId).exec();
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error occurred while deleting product:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Search users by name or ID
exports.searchUser = async (req, res) => {
    const { searchKey } = req.query;

    try {
        const users = await User.find({
            $or: [
                { name: { $regex: searchKey, $options: 'i' } },
                { _id: searchKey }
            ]
        }).exec();

        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Error occurred while searching users:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Search orders by name or ID
exports.searchOrder = async (req, res) => {
    const { searchKey } = req.query;

    try {
        const orders = await Order.find({
            $or: [
                { 'products.productName': { $regex: searchKey, $options: 'i' } },
                { _id: searchKey }
            ]
        }).exec();

        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Error occurred while searching orders:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all users sorted by date
exports.getAllUsers = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const users = await User.find()
            .sort({ createdOn: -1 }) // Sort by date, latest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .exec();

        const totalUsers = await User.countDocuments();

        return res.status(200).json({
            success: true,
            data: users,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers
        });
    } catch (error) {
        console.error('Error occurred while fetching users:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all orders sorted by date
exports.getAllOrders = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 }) // Sort by date, latest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .exec();

        const totalOrders = await Order.countDocuments();

        return res.status(200).json({
            success: true,
            data: orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        });
    } catch (error) {
        console.error('Error occurred while fetching orders:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.changePaymentStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        const order = await Order.findById(orderId).exec();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.paymentStatus = status;
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({ success: true, message: 'Payment status updated successfully', order });
    } catch (error) {
        console.error('Error occurred while updating payment status:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}