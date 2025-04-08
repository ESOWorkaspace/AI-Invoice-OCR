/**
 * Routes for the new product management system
 */
const express = require('express');
const router = express.Router();
const productItemController = require('../controllers/productItemController');

// Get all products
router.get('/', productItemController.getAllProducts);

// Get product by supplier code - harus diletakkan di atas route dinamis
router.get('/supplier/:supplierCode', productItemController.getProductBySupplierCode);

// Get product by ID
router.get('/:id', productItemController.getProductById);

// Create new product
router.post('/', productItemController.createProduct);

// Update product
router.put('/:id', productItemController.updateProduct);

// Delete product
router.delete('/:id', productItemController.deleteProduct);

// Bulk delete products
router.post('/bulk-delete', productItemController.bulkDeleteProducts);

// Import products
router.post('/import', productItemController.importProducts);

// Export all products
router.get('/export/all', productItemController.exportProducts);

// Delete all products with confirmation
router.delete('/delete-all/confirm', productItemController.deleteAllProducts);

module.exports = router;
