const mongoose = require('mongoose');
const validator = require('validator')

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: [true, "Enter a unique email"],
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Invalid Email")
            }
        }
    },

    password: { type: String, required: true, minlength: 6 },
    otp: { type: String },
    otpExpiration: { type: Date }, // Stores when OTP expires
    isVerified: { type: Boolean, default: false }, // Whether the user is verified
    //This one is for time to live
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '10m', // Set the expiration time for the document
    },
    createdOn: { type: Date, default: new Date() }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
