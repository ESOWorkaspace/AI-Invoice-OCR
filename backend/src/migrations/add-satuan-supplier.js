/**
 * Migration to add satuan_supplier column to produk_satuan table
 * This column is used to translate/map supplier units to database units
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('produk_satuan', 'satuan_supplier', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Unit name as provided by supplier'
    });
    
    console.log('Added satuan_supplier column to produk_satuan table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('produk_satuan', 'satuan_supplier');
    console.log('Removed satuan_supplier column from produk_satuan table');
  }
}; 