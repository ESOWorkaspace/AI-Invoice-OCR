/**
 * Middleware for handling file uploads
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');

// Use memory storage to prevent saving files to disk before save data is pressed
const storage = multer.memoryStorage();

// File filter to accept only images and PDFs
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image or PDF files are allowed!'), false);
  }
};

// Create multer upload instance
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 // Default 10MB
  }
});

module.exports = { uploadMiddleware };
