/**
 * ProductVariant model for product variants
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductVariant = sequelize.define('ProductVariant', {
  ID_Varian: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'id_varian'
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
  Deskripsi: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'deskripsi'
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
  tableName: 'produk_varian',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define relationship with ProductItem
ProductVariant.associate = (models) => {
  ProductVariant.belongsTo(models.ProductItem, {
    foreignKey: 'id_produk',
    as: 'product'
  });
};

module.exports = ProductVariant;
