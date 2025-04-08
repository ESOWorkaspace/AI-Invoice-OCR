/**
 * ProcessedInvoice model for storing processed and edited OCR invoice data
 * This matches the Python SQLAlchemy model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProcessedInvoice = sequelize.define('ProcessedInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
    index: true
  },
  document_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    index: true
  },
  supplier_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    index: true
  },
  invoice_date: {
    type: DataTypes.DATE,
    allowNull: true,
    index: true
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
    index: true
  },
  payment_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  include_tax: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  salesman: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tax_rate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 11.0 // Default 11% PPN
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('items');
      if (rawValue === null || rawValue === undefined) {
        return [];
      }
      
      // If it's already an object, return it
      if (typeof rawValue === 'object') {
        return rawValue;
      }
      
      // If it's a string, try to parse it
      try {
        return JSON.parse(rawValue);
      } catch (e) {
        console.error('Error parsing items JSON:', e);
        return [];
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        this.setDataValue('items', null);
        return;
      }
      
      // If it's a string, check if it's valid JSON
      if (typeof value === 'string') {
        try {
          // Validate by parsing and re-stringifying
          const parsed = JSON.parse(value);
          this.setDataValue('items', parsed);
        } catch (e) {
          console.error('Invalid JSON string for items:', e);
          this.setDataValue('items', []);
        }
      } else {
        // If it's already an object, store it directly
        this.setDataValue('items', value);
      }
    }
  },
  image_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  image_data: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  image_content_type: {
    type: DataTypes.STRING(100),
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
  tableName: 'processed_invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
ProcessedInvoice.associate = function(models) {
  ProcessedInvoice.hasOne(models.RawOCRData, {
    foreignKey: 'processed_invoice_id',
    as: 'raw_data',
    onDelete: 'CASCADE'  // Add cascade delete
  });

  // Removed association with ProcessedInvoiceItem
  // ProcessedInvoice.hasMany(models.ProcessedInvoiceItem, { 
  //   foreignKey: 'invoice_id', 
  //   as: 'invoiceItems' 
  // });
};

// Add hooks to ensure JSON data is properly handled
ProcessedInvoice.beforeCreate(instance => {
  console.log('ProcessedInvoice beforeCreate hook - items type:', typeof instance.items);
  
  // Ensure items is properly formatted for JSONB
  if (instance.items === null || instance.items === undefined) {
    instance.items = [];
  }
});

ProcessedInvoice.beforeUpdate(instance => {
  console.log('ProcessedInvoice beforeUpdate hook - items type:', typeof instance.items);
  
  // Ensure items is properly formatted for JSONB
  if (instance.items === null || instance.items === undefined) {
    instance.items = [];
  }
});

module.exports = ProcessedInvoice;
