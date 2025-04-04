/**
 * Migration to add:
 * 1. harga_pokok_sebelumnya column to produk_harga table
 * 2. threshold_margin column to produk_satuan table
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add harga_pokok_sebelumnya to produk_harga table
    await queryInterface.addColumn('produk_harga', 'harga_pokok_sebelumnya', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Previous base price for tracking changes'
    });
    
    console.log('Added harga_pokok_sebelumnya column to produk_harga table');
    
    // Add threshold_margin to produk_satuan table
    await queryInterface.addColumn('produk_satuan', 'threshold_margin', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Margin threshold for this unit'
    });
    
    console.log('Added threshold_margin column to produk_satuan table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove harga_pokok_sebelumnya from produk_harga table
    await queryInterface.removeColumn('produk_harga', 'harga_pokok_sebelumnya');
    console.log('Removed harga_pokok_sebelumnya column from produk_harga table');
    
    // Remove threshold_margin from produk_satuan table
    await queryInterface.removeColumn('produk_satuan', 'threshold_margin');
    console.log('Removed threshold_margin column from produk_satuan table');
  }
}; 