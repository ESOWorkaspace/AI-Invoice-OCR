/**
 * Routes for OCR processing
 */
const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');

// Process and save OCR data
router.post('/save', ocrController.saveOcrData);

// Get OCR results
router.get('/results/:invoice_number', ocrController.getOcrResults);

// Upload file for OCR processing
router.post('/upload', uploadMiddleware.single('file'), ocrController.uploadFile);

// Test connection
router.get('/test-connection', ocrController.testConnection);

// Queue file for asynchronous processing
router.post('/queue', uploadMiddleware.single('file'), ocrController.queueFileForProcessing);

// Get file processing status
router.get('/status/:fileId', ocrController.getFileStatus);

// Get all file processing statuses
router.get('/status', ocrController.getAllStatuses);

module.exports = router;
