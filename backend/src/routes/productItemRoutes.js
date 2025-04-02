/**
 * Routes for the new product management system
 */
const express = require('express');
const router = express.Router();
const productItemController = require('../controllers/productItemController');

// Get all products with optional filtering
router.get('/', productItemController.getAllProducts);

// Get product by ID with all related data
router.get('/:id', productItemController.getProductById);

// Create new product with all related data
router.post('/', productItemController.createProduct);

// Update product and related data
router.put('/:id', productItemController.updateProduct);

// Delete product and all related data
router.delete('/:id', productItemController.deleteProduct);

// Bulk delete multiple products
router.post('/bulk-delete', productItemController.bulkDeleteProducts);

// Import products in bulk
router.post('/import', productItemController.importProducts);

// Export all products
router.get('/export/all', productItemController.exportProducts);

// Delete all products with confirmation
router.delete('/delete-all/confirm', productItemController.deleteAllProducts);

module.exports = router;
