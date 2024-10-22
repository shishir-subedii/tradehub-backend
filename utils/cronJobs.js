const cron = require('node-cron');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendMessageViaEmail } = require('../services/mailService');
const User = require('../models/User');

// Set order status to cancelled if not processed within 3 days
cron.schedule('0 0 * * *', async () => { // Runs everyday at midnight
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // Find all pending orders older than 3 days
        const ordersToCancel = await Order.find({ orderStatus: 'pending', createdAt: { $lte: threeDaysAgo } });

        for (const order of ordersToCancel) {
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
                            soldCount: -item.quantity // Decrease sold count
                        }
                    },
                    upsert: false
                }
            }));

            await Product.bulkWrite(bulkOps);

            // Notify the buyer
            const buyerDetails = await User.findById(order.buyer).exec();
            sendMessageViaEmail(buyerDetails.email, 'Order Cancelled', `Your order with ID ${order._id} has been cancelled due to inactivity.`);
        }

        console.log(`Cancelled ${ordersToCancel.length} orders due to inactivity.`);
    } catch (error) {
        console.error('Error while cancelling inactive orders:', error);
    }
});

// Remind the seller to drop off the product
cron.schedule('0 0 * * *', async () => { // Runs everyday at midnight
    try {
        const ordersToRemind = await Order.find({ orderStatus: 'processing' });

        for (const order of ordersToRemind) {
            const sellerDetails = await User.findById(order.seller).exec();
            sendMessageViaEmail(sellerDetails.email, 'Product Drop-off Reminder', `You need to drop off the product for order ID ${order._id}.`);
        }

        console.log(`Sent reminders to sellers for ${ordersToRemind.length} orders.`);
    } catch (error) {
        console.error('Error while sending reminders to sellers:', error);
    }
});
