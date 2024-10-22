const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const adminRoutes = require('./routes/adminRoutes');
const dbConnect = require('./config/db'); // Ensure the correct path to db.js
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware should be the last middleware
app.use(errorMiddleware);

// Connect to the database
dbConnect(); // Connect to the database here

require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;``

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} on ${new Date()}`);
});
