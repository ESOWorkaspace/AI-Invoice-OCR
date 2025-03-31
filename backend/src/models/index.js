/**
 * Export all models from a central file
 */
const ProcessedInvoice = require('./ProcessedInvoice');
const RawOCRData = require('./RawOCRData');
const Product = require('./Product');

// Set up associations
const models = {
  ProcessedInvoice,
  RawOCRData,
  Product
};

// Initialize associations if they exist
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
    console.log(`Initialized associations for ${modelName}`);
  }
});

module.exports = models;
