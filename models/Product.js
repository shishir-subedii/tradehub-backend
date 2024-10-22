const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,  // Every product must have a name
    },
    description: {
        type: String,
        required: true,  // Every product must have a description
    },
    price: {
        type: Number,
        required: true,  // Every product must have a price
    },
    category: {
        type: String,
        required: true,  // Every product must belong to a category
    },
    quantity: {
        type: Number,
        required: true,  // Every product must have a quantity
        default: 1       // Default quantity is 1 if not specified
    },
    images: [
        {
            type: String,   // Image URLs
            required: true  // At least one image is required
        }
    ],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',     // Reference to the User model (the seller)
        required: true   // Every product must have a seller
    },
    ratings: [
        {
            type: Number,   // Array of ratings
            min: 1,
            max: 5
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now  // Automatically set the time the product was created
    },
    updatedAt: {
        type: Date,
        default: Date.now  // Automatically set the time the product was last updated
    },
    discount: {
        type: Number,  // If there’s a discount
        default: 0     // No discount by default
    },
    soldCount: {
        type: Number,
        default: 0     // Track how many times the product has been sold
    },
    tags: [String],  // Array of tags for easier searching
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
