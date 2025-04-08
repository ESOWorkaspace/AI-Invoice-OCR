/**
 * Main server entry point for OCR Invoice Processing System
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import database setup
const { sequelize } = require('./config/database');

// Import routes
const invoiceRoutes = require('./routes/invoiceRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const productRoutes = require('./routes/productRoutes');
const productItemRoutes = require('./routes/productItemRoutes');
const rawOcrRoutes = require('./routes/rawOcrRoutes');

// Create Express app
const app = express();

// Configure CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173'
];

console.log('CORS configuration:', {
  allowedOrigins
});

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
app.use('/api/product-items', productItemRoutes);
app.use('/api/raw-ocr', rawOcrRoutes);

// Add units endpoint
app.get('/api/units', (req, res) => {
  // Return predefined units that are commonly used
  const units = [
    'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
    'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML'
  ];
  
  // Additional supplier-specific units
  const supplierUnits = [
    'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
    'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML',
    'CTN', 'CARTON', 'BTL', 'BTG', 'CRT', 'SLOP', 'BAL', 'KARTON'
  ];
  
  res.json({ 
    units, 
    supplierUnits,
    success: true,
    message: 'Units retrieved successfully'
  });
});

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
const PORT = process.env.PORT || 1513;

async function startServer() {
  try {
    // Test database connection and sync models
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sinkronisasi model dengan database jika parameter SYNC_DB=true
    const syncDatabase = process.env.SYNC_DB === 'true';

    if (syncDatabase) {
      console.log('Synchronizing database models...');
      await sequelize.sync({ force: true });
      console.log('Database synchronized successfully');
    } else {
      console.log('Database sync skipped. Set SYNC_DB=true to create tables automatically.');
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
