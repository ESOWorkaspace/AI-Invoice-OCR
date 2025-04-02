/**
 * ProductPrice model for storing pricing information
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductPrice = sequelize.define('ProductPrice', {
  ID_Harga: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'id_harga'
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
  Minimal_Qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'minimal_qty',
    defaultValue: 1
  },
  Maksimal_Qty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'maksimal_qty'
  },
  Harga_Pokok: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'harga_pokok',
    defaultValue: 0.00
  },
  Harga_Jual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'harga_jual',
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
  tableName: 'produk_harga',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define relationships
ProductPrice.associate = (models) => {
  ProductPrice.belongsTo(models.ProductItem, {
    foreignKey: 'id_produk',
    as: 'product'
  });
  ProductPrice.belongsTo(models.ProductUnit, {
    foreignKey: 'id_satuan',
    as: 'unit'
  });
};

module.exports = ProductPrice;
