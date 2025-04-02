/**
 * Migration to add supplier_code column to the produk table
 */
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('produk', 'supplier_code', {
      type: DataTypes.STRING(20),
      allowNull: true
    });
    
    console.log('Added supplier_code column to produk table');
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('produk', 'supplier_code');
    
    console.log('Removed supplier_code column from produk table');
    return Promise.resolve();
  }
};
