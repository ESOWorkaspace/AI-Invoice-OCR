/**
 * ProductUnit model for storing unit and conversion information
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductUnit = sequelize.define('ProductUnit', {
  ID_Satuan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'id_satuan'
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
  Nama_Satuan: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'nama_satuan'
  },
  Satuan_Supplier: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'satuan_supplier',
    comment: 'Unit name as provided by supplier'
  },
  Threshold_Margin: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'threshold_margin',
    defaultValue: 0,
    comment: 'Margin threshold for this unit'
  },
  Jumlah_Dalam_Satuan_Dasar: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'jumlah_dalam_satuan_dasar',
    defaultValue: 1.00
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
  tableName: 'produk_satuan',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations with other models
ProductUnit.associate = function(models) {
  ProductUnit.belongsTo(models.ProductItem, {
    foreignKey: 'ID_Produk',
    as: 'product'
  });
  
  ProductUnit.hasMany(models.ProductPrice, {
    foreignKey: 'ID_Satuan',
    as: 'prices',
    onDelete: 'CASCADE'
  });
  
  ProductUnit.hasMany(models.ProductStock, {
    foreignKey: 'ID_Satuan',
    as: 'stocks',
    onDelete: 'CASCADE'
  });
};

module.exports = ProductUnit;
