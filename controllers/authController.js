const User = require('../models/User');
const mailService = require('../services/mailService');
const bcryptUtils = require('../utils/bcryptUtils');
const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
const { generateOTP } = require('../utils/otpGenerator');
const { generateToken } = require('../services/tokenService');

exports.signup = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    try {
        const existingUser = await User.exists({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }
        const otp = generateOTP();
        const hashedPassword = await bcryptUtils.hashPassword(password);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpiration: Date.now() + OTP_EXPIRATION_TIME,
            createdAt: Date.now()
        });
        await user.save();
        mailService.sendOTP(email, otp);
        return res.status(201).json({ success: true, message: 'User created successfully! Please verify OTP.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found or OTP expired' });
        }
        if(user.isVerified){
            return res.status(400).json({ success: false, message: 'User already verified' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        if (Date.now() > user.otpExpiration) {
            await User.deleteOne({ _id: user._id }); // Delete unverified user
            return res.status(400).json({ success: false, message: 'OTP expired. User deleted.' });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiration = undefined;
        user.createdAt = undefined;
        await user.save();
        return res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.isVerified) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or email not verified.' });
        }
        const isMatch = await bcryptUtils.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const token = await generateToken(user._id);
        if (user._id == process.env.ADMIN) {
            return res.status(200).json({ success: true, message: token, isAdmin: true });
        }
        return res.status(200).json({ success: true, message: token });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const otp = generateOTP()
        user.otp = otp;
        user.otpExpiration = Date.now() + OTP_EXPIRATION_TIME;
        user.createdAt = undefined;
        await user.save();
        mailService.sendOTP(email, otp);
        return res.status(200).json({ success: true, message: 'OTP sent for password reset' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, newPassword, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if(!user.isVerified){
            return res.status(400).json({ success: false, message: 'User not verified' });
        }
        if (user.otp !== otp || Date.now() > user.otpExpiration) {
            user.otp = undefined; //idk i maybe wrong with this
            user.otpExpiration = undefined; //idk i maybe wrong with this
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP. try again!' });
        }
        user.password = await bcryptUtils.hashPassword(newPassword);
        user.otp = undefined;
        user.otpExpiration = undefined;
        await user.save();
        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user; // Extract user id from JWT token
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await bcryptUtils.comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        user.password = await bcryptUtils.hashPassword(newPassword);
        await user.save();
        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};