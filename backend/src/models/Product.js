/**
 * Product model for the product master database
 * This matches the Python SQLAlchemy model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  product_code: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    index: true
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  supplier_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  min_stock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
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
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Product;
