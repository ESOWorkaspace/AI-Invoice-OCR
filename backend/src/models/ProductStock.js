/**
 * ProductStock model for storing stock information
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductStock = sequelize.define('ProductStock', {
  ID_Stok: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'id_stok'
  },
  ID_Produk: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_produk',
    references: {
      model: 'produk',
      key: 'id_produk'
    }
  },
  ID_Satuan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_satuan',
    references: {
      model: 'produk_satuan',
      key: 'id_satuan'
    }
  },
  Jumlah_Stok: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'jumlah_stok',
    defaultValue: 0.00
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
  tableName: 'produk_stok',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define relationships
ProductStock.associate = (models) => {
  ProductStock.belongsTo(models.ProductItem, {
    foreignKey: 'id_produk',
    as: 'product'
  });
  ProductStock.belongsTo(models.ProductUnit, {
    foreignKey: 'id_satuan',
    as: 'unit'
  });
};

module.exports = ProductStock;
