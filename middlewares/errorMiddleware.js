const errorMiddleware = (err, req, res, next) => {
    return res.status(500).json({ success: false, message: 'Something went wrong!' });
};

module.exports = errorMiddleware;

