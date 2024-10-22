const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database connected successfully!');
    } catch (err) {
        console.log('Database connection error:', err);
        process.exit(1); // Exits the process if the DB connection fails
    }
};

module.exports = dbConnect;
