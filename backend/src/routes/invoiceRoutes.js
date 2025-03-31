/**
 * Routes for invoice management
 */
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');

// Get all invoices
router.get('/', invoiceController.getAllInvoices);

// Get invoice image - MOVED BEFORE THE ID ROUTE TO ENSURE PROPER MATCHING
router.get('/:id/image', invoiceController.getInvoiceImage);

// Search invoices
router.get('/search/:query', invoiceController.searchInvoices);

// Get invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Create new invoice
router.post('/', invoiceController.createInvoice);

// Update invoice
router.put('/:id', invoiceController.updateInvoice);

// Delete invoice
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
