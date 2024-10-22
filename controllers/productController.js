const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 100 }); // Cache TTL set to 100 seconds


// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: 'dtlohjvcm',
    api_key: '743143472995847',
    api_secret: '9u6xnWJEE4woXHaa_pfWKoj2rx8'
});

exports.createProduct = async (req, res) => {
    const { name, description, price, category, quantity, tags } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: 'No product data provided.' });
    }

    try {
        let uploadedImages = [];
        const files = req.files || [];

        // Use Promise.all for parallel uploads
        await Promise.all(files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'products' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                stream.end(file.buffer);
            }).then(url => uploadedImages.push(url));
        }));

        const product = new Product({
            name,
            description,
            price,
            category,
            quantity,
            images: uploadedImages,
            seller: req.user,
            tags
        });
        cache.flushAll()

        await product.save();
        return res.status(201).json({ success: true, message: "Product Created Successfully" });

    } catch (error) {
        console.error('Error occurred while creating product:', error);  // Detailed error logging
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all products with pagination and caching
exports.getAllProducts = async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const cacheKey = `products_${page}_${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, message: cachedData });
    }

    try {
        const products = await Product.find()
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Product.countDocuments();
        const pages = Math.ceil(total / limit);

        const response = {
            products,
            currentPage: page,
            totalPages: pages,
            totalProducts: total
        };

        cache.set(cacheKey, response);

        return res.status(200).json({ success: true, message: response });

    } catch (error) {
        console.error('Error occurred while fetching products:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

//get all products for seller
exports.getAllSellerProducts = async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const sellerId = req.user;
    const cacheKey = `seller_${sellerId}products_${page}_${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, message: cachedData });
    }

    try {
        const products = await Product.find({seller: sellerId})
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Product.countDocuments();
        const pages = Math.ceil(total / limit);

        const response = {
            products,
            currentPage: page,
            totalPages: pages,
            totalProducts: total
        };

        cache.set(cacheKey, response);

        return res.status(200).json({ success: true, message: response });

    } catch (error) {
        console.error('Error occurred while fetching products:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get single product by ID with caching
exports.getSingleProduct = async (req, res) => {
    const { id } = req.params;
    const cacheKey = `product_${id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, message: cachedData });
    }

    try {
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        cache.set(cacheKey, product);

        return res.status(200).json({ success: true, message:product });

    } catch (error) {
        console.error('Error occurred while fetching product:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update product and handle image updates, invalidate cache
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const newImages = req.files || [];

    try {
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.seller.toString() !== req.user.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this product' });
        }

        let uploadedImages = product.images; // Keep existing images initially

        if (newImages.length > 0) {
            // If there are new images, upload and replace old URLs
            uploadedImages = await Promise.all(newImages.map(file => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'products' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    stream.end(file.buffer);
                });
            }));
        }

        updateData.images = uploadedImages;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Invalidate cache for updated product and all products cache
        cache.del(`product_${id}`);
        cache.flushAll();

        return res.status(200).json({ success: true, message: 'Product Updated' });

    } catch (error) {
        console.error('Error occurred while updating product:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete product and invalidate cache
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.seller.toString() !== req.user.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this product' });
        }

        // Invalidate cache for the deleted product and all products cache
        cache.del(`product_${id}`);
        cache.flushAll();

        return res.status(200).json({ success: true, message: 'Product deleted' });

    } catch (error) {
        console.error('Error occurred while deleting product:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


exports.searchProduct = async (req, res) => {
    const { searchKey, page, limit } = req.query;

    if (!searchKey) {
        return res.status(400).json({ success: false, message: 'Search key is required.' });
    }

    // Build search criteria based on search key
    const searchCriteria = {
        $or: [
            { name: { $regex: searchKey, $options: 'i' } },
            { description: { $regex: searchKey, $options: 'i' } },
            { tags: { $regex: searchKey, $options: 'i' } }
        ]
    };

    // Create a cache key based on the search criteria and pagination
    const cacheKey = `search_${searchKey}_${page}_${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return res.status(200).json({ success: true, message: cachedData });
    }

    try {
        const skip = (page - 1) * limit;
        const products = await Product.find(searchCriteria).skip(skip).limit(limit);
        const total = await Product.countDocuments(searchCriteria);
        const totalPages = Math.ceil(total / limit);

        const response = {
            products,
            currentPage: page,
            totalPages,
            totalProducts: total
        };

        cache.set(cacheKey, response); // Cache the search results
        return res.status(200).json({ success: true, message: response });
    } catch (error) {
        console.error('Error occurred while searching for products:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
