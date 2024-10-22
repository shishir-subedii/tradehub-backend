const jwt = require('jsonwebtoken');

exports.verifyUser = (req, res, next) => {
    const token = req.header('token');
    if (!token) {
        return res.status(401).json({ success: false, message: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data._id; // Assign user ID to req.user
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token. Please authenticate using a valid token." });
    }
};

exports.verifyAdmin = (req, res, next) => {
    const token = req.header('token');
    if (!token) {
        return res.status(401).json({ success: false, message: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        if (process.env.ADMIN !== data._id) {
            return res.status(403).json({ success: false, message: "You are not authorized to access this resource" });
        }
        req.user = data._id; // Assign user ID to req.user
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token. Please authenticate using a valid token." });
    }
}
