const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/create-product', authMiddleware.verifyUser, upload.array('images'), productController.createProduct);
router.patch('/update-product/:id', authMiddleware.verifyUser, upload.array('images'), productController.updateProduct);
router.delete('/delete-product/:id', authMiddleware.verifyUser, productController.deleteProduct);
router.get('/get-all-products', productController.getAllProducts);
router.get('/get-seller-products', authMiddleware.verifyUser, productController.getAllSellerProducts);
router.get('/product/:id', productController.getSingleProduct);
router.get('/search', productController.searchProduct); 

module.exports = router;
