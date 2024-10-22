const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET; // Load secret once

exports.generateToken = (userId) => {
    return jwt.sign({ _id: userId }, JWT_SECRET, { expiresIn: '1h' });
};

// If you want to verify something
exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token'); // Handle errors appropriately
    }
};
