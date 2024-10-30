const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendMessageViaEmail } = require('../services/mailService');
const User = require('../models/User');

exports.newOrder = async (req, res) => {
    const { products, shippingAddress } = req.body;
    if (!products || products.length === 0) {
        return res.status(400).json({ success: false, message: 'No products provided for order.' });
    }

    try {
        const buyer = req.user;
        let totalAmount = 0;
        let productDetails = [];

        // Check product quantities first
        for (const item of products) {
            const product = await Product.findById(item.product).exec();
            if (!product) {
                return res.status(404).json({ success: false, message: `Product with ID ${item.product} not found` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ success: false, message: `Not enough stock for product: ${product.name}` });
            }

            totalAmount += product.price * item.quantity;
            productDetails.push({
                product: item.product,
                quantity: item.quantity,
                seller: product.seller
            });
        }

        const seller = productDetails[0].seller;

        // Use a bulk write to update product quantities and soldCount
        const bulkOps = productDetails.map(item => ({
            updateOne: {
                filter: { _id: item.product },
                update: {
                    $inc: {
                        quantity: -item.quantity,
                        soldCount: item.quantity
                    }
                },
                upsert: false
            }
        }));

        await Product.bulkWrite(bulkOps);

        const order = new Order({
            buyer,
            seller,
            products: productDetails,
            totalAmount,
            shippingAddress
        });

        const newOrder = await order.save();

        // Send email to buyer with order ID
        const buyerDetails = await User.findById(buyer).exec();
        sendMessageViaEmail(buyerDetails.email, 'Order Confirmation', `Your order has been placed successfully. Your order ID is: ${newOrder._id}`);

        return res.status(201).json({ success: true, message: "Order Placed Successfully", order: newOrder });
    } catch (error) {
        console.error('Error occurred while creating order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.markAsProcessing = async (req, res) => {
    const { orderId } = req.params;
    const sellerId = req.user; // Assuming req.user contains the seller ID

    try {
        const order = await Order.findById(orderId).exec();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.seller.toString() !== sellerId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to process this order' });
        }

        if (order.orderStatus !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending orders can be marked as processing' });
        }

        order.orderStatus = 'processing';
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({ success: true, message: 'Order marked as processing', order });
    } catch (error) {
        console.error('Error occurred while marking order as processing:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    const sellerId = req.user; // Assuming req.user contains the seller ID

    try {
        const order = await Order.findById(orderId).exec();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.seller.toString() !== sellerId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to cancel this order' });
        }

        if (order.orderStatus === 'completed' || order.orderStatus === 'shipped' || order.orderStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: 'This order cannot be cancelled' });
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
        sendMessageViaEmail(buyerDetails.email, 'Order Cancellation', `Your order with ID ${order._id} has been cancelled.`);

        return res.status(200).json({ success: true, message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error occurred while cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


//Fetch all orders for a seller
exports.getAllOrdersForSeller = async (req, res) => {
    const sellerId = req.user; // Assuming req.user contains the seller ID
    const { page = 1, limit = 10 } = req.query;

    try {
        const orders = await Order.find({ seller: sellerId })
            .sort({ createdAt: -1 }) // Sort by date, newest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .exec();

        const totalOrders = await Order.countDocuments({ seller: sellerId });

        // Define order priority
        const orderPriority = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

        // Sort orders based on the defined priority
        orders.sort((a, b) => {
            return orderPriority.indexOf(a.orderStatus) - orderPriority.indexOf(b.orderStatus);
        });

        return res.status(200).json({
            success: true,
            message: orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        });
    } catch (error) {
        console.error('Error occurred while fetching orders:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


//get all orders for a buyer
exports.getAllOrdersForUser = async (req, res) => {
    const userId = req.user; // Assuming req.user contains the buyer ID
    const { page = 1, limit = 10 } = req.query;

    try {
        const orders = await Order.find({ buyer: userId })
            .sort({ createdAt: -1 }) // Sort by date, newest first
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .exec();

        const totalOrders = await Order.countDocuments({ buyer: userId });

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



