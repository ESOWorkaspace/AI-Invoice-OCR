/**
 * Middleware for handling file uploads
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueId = uuid.v4();
    const timestamp = Date.now();
    const extname = path.extname(file.originalname);
    cb(null, `${uniqueId}_${timestamp}${extname}`);
  }
});

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
