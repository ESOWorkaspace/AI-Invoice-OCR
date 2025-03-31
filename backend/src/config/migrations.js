/**
 * Database migration utility for Express.js backend
 * Equivalent to the Python Alembic migrations
 */
const { sequelize } = require('./database');
const { ProcessedInvoice, RawOCRData, Product } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Initialize database schema
 */
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with force option to recreate tables
    // WARNING: This will drop existing tables - use with caution in production
    await sequelize.sync({ force: true });
    console.log('Database schema created successfully!');
    
    // Create upload directories
    const uploadsDir = path.join(__dirname, '../../uploads');
    const invoicesDir = path.join(uploadsDir, 'invoices');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
      console.log('Created uploads directory');
    }
    
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir);
      console.log('Created invoices upload directory');
    }
    
    console.log('Database initialization completed!');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

/**
 * Update database schema without losing data
 */
async function updateSchema() {
  console.log('Starting database schema update...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with alter option to update tables without losing data
    await sequelize.sync({ alter: true });
    console.log('Database schema updated successfully!');
    
    return true;
  } catch (error) {
    console.error('Error updating database schema:', error);
    return false;
  }
}

/**
 * Add columns to existing tables
 */
async function addImageColumns() {
  console.log('Adding image columns to database...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Check if columns already exist
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('processed_invoices');
    
    let updates = [];
    
    if (!tableInfo.image_data) {
      console.log('Adding image_data column...');
      updates.push(
        queryInterface.addColumn('processed_invoices', 'image_data', {
          type: sequelize.Sequelize.BLOB('long'),
          allowNull: true
        })
      );
    } else {
      console.log('image_data column already exists');
    }
    
    if (!tableInfo.image_content_type) {
      console.log('Adding image_content_type column...');
      updates.push(
        queryInterface.addColumn('processed_invoices', 'image_content_type', {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        })
      );
    } else {
      console.log('image_content_type column already exists');
    }
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log('Columns added successfully!');
    } else {
      console.log('No columns to add, schema is up to date');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding columns:', error);
    return false;
  }
}

// Export functions for use in CLI tools
module.exports = {
  initializeDatabase,
  updateSchema,
  addImageColumns
};

// Execute directly if this file is run as a script
if (require.main === module) {
  const command = process.argv[2] || 'update';
  
  (async () => {
    let success = false;
    
    switch (command) {
      case 'init':
        success = await initializeDatabase();
        break;
      case 'update':
        success = await updateSchema();
        break;
      case 'add-image-columns':
        success = await addImageColumns();
        break;
      default:
        console.error('Unknown command. Use init, update, or add-image-columns');
        process.exit(1);
    }
    
    if (success) {
      console.log('Operation completed successfully');
      process.exit(0);
    } else {
      console.error('Operation failed');
      process.exit(1);
    }
  })();
}
