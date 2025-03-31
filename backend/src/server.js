/**
 * Main server entry point for OCR Invoice Processing System
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import database setup
const { sequelize } = require('./config/database');

// Import routes
const invoiceRoutes = require('./routes/invoiceRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const productRoutes = require('./routes/productRoutes');
const rawOcrRoutes = require('./routes/rawOcrRoutes');

// Create Express app
const app = express();

// Configure CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:57090',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposedHeaders: ['Content-Type', 'Content-Disposition', 'Content-Length']
}));

// Apply security middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));

// Parse request bodies
app.use(bodyParser.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));

// Set up static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/products', productRoutes);
app.use('/api/raw-ocr', rawOcrRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'OCR Invoice Processing System API',
    version: '1.0.0',
    status: 'active' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 1512;

async function startServer() {
  try {
    // Test database connection and sync models
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Only sync in development mode
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
