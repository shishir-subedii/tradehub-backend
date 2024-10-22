const nodemailer = require('nodemailer');

//used to send OTP to the user for authentication
const sendOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // Use your email provider
        auth: {
            user: process.env.EMAIL_USER,  // Your email
            pass: process.env.EMAIL_PASS,    // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Your OTP Code - ${otp}`,
        text: `Your OTP is ${otp}. It is valid for 10 minutes. From TradeHub`,
    };

    await transporter.sendMail(mailOptions);
};

//if you want to send any email to any user
const sendMessageViaEmail = async (email,subject, message) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // Use your email provider
        auth: {
            user: process.env.EMAIL_USER,  // Your email
            pass: process.env.EMAIL_PASS,    // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `${subject}`,
        text: `${message} From TradeHub.`,
    };

    await transporter.sendMail(mailOptions);
};



module.exports = { sendOTP, sendMessageViaEmail };
