/**
 * Export all models from a central file
 */
const ProcessedInvoice = require('./ProcessedInvoice');
const RawOCRData = require('./RawOCRData');
const Product = require('./Product');
const ProductItem = require('./ProductItem');
const ProductVariant = require('./ProductVariant');
const ProductUnit = require('./ProductUnit');
const ProductPrice = require('./ProductPrice');
const ProductStock = require('./ProductStock');

// Set up associations
const models = {
  ProcessedInvoice,
  RawOCRData,
  Product,
  ProductItem,
  ProductVariant,
  ProductUnit,
  ProductPrice,
  ProductStock
};

// Initialize associations if they exist
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
    console.log(`Initialized associations for ${modelName}`);
  }
});

module.exports = models;
