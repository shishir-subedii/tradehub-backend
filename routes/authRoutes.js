const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.put('/change-password', authMiddleware.verifyUser, authController.changePassword);

module.exports = router;
