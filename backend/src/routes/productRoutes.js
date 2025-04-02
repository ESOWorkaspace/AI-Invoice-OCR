/**
 * Routes for product management
 */
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Search product by supplier code
router.get('/search/supplier/:supplierCode', productController.searchBySupplierCode);

// Search product by invoice code
router.get('/invoice', productController.searchByInvoiceCode);

// Search products for dropdown
router.get('/search', productController.searchProducts);

// Get recent products - MUST BE PLACED BEFORE THE /:id ROUTE
router.get('/recent', productController.getRecentProducts);

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create new product
router.post('/', productController.createProduct);

// Update product
router.put('/:id', productController.updateProduct);

// Delete product
router.delete('/:id', productController.deleteProduct);

module.exports = router; 