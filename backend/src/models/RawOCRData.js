/**
 * RawOCRData model for storing raw OCR data in JSON format
 * This matches the Python SQLAlchemy model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RawOCRData = sequelize.define('RawOCRData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  invoice_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Add default value to avoid null issues
  },
  raw_data: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  processed_invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'raw_ocr_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
RawOCRData.associate = function(models) {
  RawOCRData.belongsTo(models.ProcessedInvoice, {
    foreignKey: 'processed_invoice_id', 
    as: 'processed_invoice',
    onDelete: 'CASCADE' // Add cascade delete
  });
};

// Add hooks for JSONB data handling
RawOCRData.beforeCreate(instance => {
  if (instance.raw_data && typeof instance.raw_data === 'string') {
    try {
      instance.raw_data = JSON.parse(instance.raw_data);
      console.log('Parsed raw_data from string to object');
    } catch (error) {
      console.error('Error parsing raw_data:', error);
    }
  }
});

RawOCRData.beforeUpdate(instance => {
  if (instance.raw_data && typeof instance.raw_data === 'string') {
    try {
      instance.raw_data = JSON.parse(instance.raw_data);
      console.log('Parsed raw_data from string to object');
    } catch (error) {
      console.error('Error parsing raw_data:', error);
    }
  }
});

module.exports = RawOCRData;
