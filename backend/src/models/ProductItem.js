/**
 * Product model for the core product information
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductItem = sequelize.define('ProductItem', {
  ID_Produk: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'id_produk'
  },
  Kode_Item: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    field: 'kode_item'
  },
  Nama_Item: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'nama_item'
  },
  Jenis: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'jenis'
  },
  Supplier_Code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'supplier_code'
  },
  Supplier_Name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'supplier_name'
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
  tableName: 'produk',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations with other models
ProductItem.associate = function(models) {
  ProductItem.hasMany(models.ProductVariant, {
    foreignKey: 'ID_Produk',
    as: 'variants',
    onDelete: 'CASCADE'
  });
  
  ProductItem.hasMany(models.ProductUnit, {
    foreignKey: 'ID_Produk',
    as: 'units',
    onDelete: 'CASCADE'
  });
};

module.exports = ProductItem;
