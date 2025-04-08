/**
 * Utility functions for the EnhancedProductForm component
 */

/**
 * Processes product units and extracts related prices and stocks
 * @param {Object} product - The product data
 * @param {Array} availableUnits - Currently available units
 * @param {Array} supplierUnits - Currently available supplier units
 * @returns {Object} Processed data with units, prices, and stocks
 */
export const processProductData = (product) => {
  // Initialize result
  const result = {
    productData: {
      Kode_Item: product.Kode_Item || '',
      Supplier_Code: product.Supplier_Code || '',
      Nama_Item: product.Nama_Item || '',
      Jenis: product.Jenis || '',
    },
    variants: [],
    units: [],
    prices: [],
    stocks: []
  };

  // Process variants if available
  if (product.variants && product.variants.length > 0) {
    result.variants = product.variants.map(variant => ({
      ID_Varian: variant.ID_Varian,
      Deskripsi: variant.Deskripsi || ''
    }));
  } else {
    result.variants = [{ Deskripsi: '' }];
  }

  // Process units if available
  if (product.units && product.units.length > 0) {
    // Create a local copy of units for processing
    const productUnits = product.units.map(unit => ({
      ID_Satuan: unit.ID_Satuan,
      Nama_Satuan: unit.Nama_Satuan || '',
      Jumlah_Dalam_Satuan_Dasar: unit.Jumlah_Dalam_Satuan_Dasar || 1,
      Satuan_Supplier: unit.Satuan_Supplier || '',
      Threshold_Margin: parseFloat(unit.Threshold_Margin || 0)
    }));
    
    result.units = productUnits;
    
    // Extract unit names for reference in prices and stocks
    const unitNames = productUnits.map(unit => unit.Nama_Satuan);
    
    // Create a map of unit IDs to names for easier reference
    const unitIdToName = {};
    productUnits.forEach(unit => {
      if (unit.ID_Satuan && unit.Nama_Satuan) {
        unitIdToName[unit.ID_Satuan] = unit.Nama_Satuan;
      }
    });
    
    // Process prices data
    let productPrices = [];
    let pricesFound = false;
    
    // 1. Check if prices is directly in the product object
    if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
      pricesFound = true;
      productPrices = product.prices;
    }
    
    // 2. Check if prices are nested in units
    if (!pricesFound && product.units.some(u => u.prices && Array.isArray(u.prices) && u.prices.length > 0)) {
      product.units.forEach(unit => {
        if (unit.prices && Array.isArray(unit.prices) && unit.prices.length > 0) {
          unit.prices.forEach(price => {
            productPrices.push({
              ...price,
              ID_Satuan: unit.ID_Satuan
            });
          });
        }
      });
      pricesFound = true;
    }
    
    // Format prices if found
    if (pricesFound && productPrices.length > 0) {
      const formattedPrices = productPrices.map(price => {
        // Find the unit name for this price
        const unitName = unitIdToName[price.ID_Satuan] || '';
        
        return {
          ID_Harga: price.ID_Harga,
          unitName,
          Minimal_Qty: price.Minimal_Qty || price.minimal_qty || 1,
          Maksimal_Qty: price.Maksimal_Qty || price.maksimal_qty || null,
          Harga_Pokok: parseFloat(price.Harga_Pokok || price.harga_pokok || 0),
          Harga_Jual: parseFloat(price.Harga_Jual || price.harga_jual || 0)
        };
      }).filter(price => price.unitName);
      
      result.prices = formattedPrices;
      
      // If we don't have prices for all units, add default ones
      const unitsWithPrices = new Set(formattedPrices.map(p => p.unitName));
      const unitsWithoutPrices = unitNames.filter(name => !unitsWithPrices.has(name));
      
      if (unitsWithoutPrices.length > 0) {
        const additionalPrices = unitsWithoutPrices.map(unitName => ({
          unitName,
          Minimal_Qty: 1,
          Maksimal_Qty: null,
          Harga_Pokok: 0,
          Harga_Jual: 0
        }));
        
        result.prices = [...result.prices, ...additionalPrices];
      }
    } else {
      // Create default price entries for each unit if no prices were found
      result.prices = unitNames.map(unitName => ({
        unitName,
        Minimal_Qty: 1,
        Maksimal_Qty: null,
        Harga_Pokok: 0,
        Harga_Jual: 0
      }));
    }
    
    // Process stocks data
    let productStocks = [];
    let stocksFound = false;
    
    // 1. Check if stocks is directly in the product object
    if (product.stocks && Array.isArray(product.stocks) && product.stocks.length > 0) {
      stocksFound = true;
      productStocks = product.stocks;
    }
    
    // 2. Check if stocks are nested in units
    if (!stocksFound && product.units.some(u => u.stocks && Array.isArray(u.stocks) && u.stocks.length > 0)) {
      product.units.forEach(unit => {
        if (unit.stocks && Array.isArray(unit.stocks) && unit.stocks.length > 0) {
          unit.stocks.forEach(stock => {
            productStocks.push({
              ...stock,
              ID_Satuan: unit.ID_Satuan
            });
          });
        }
      });
      stocksFound = true;
    }
    
    // Format stocks if found
    if (stocksFound && productStocks.length > 0) {
      const formattedStocks = productStocks.map(stock => {
        const unitName = unitIdToName[stock.ID_Satuan] || '';
        
        return {
          ID_Stok: stock.ID_Stok,
          unitName,
          Jumlah_Stok: parseFloat(stock.Jumlah_Stok || stock.jumlah_stok || 0)
        };
      }).filter(stock => stock.unitName);
      
      result.stocks = formattedStocks;
      
      // If we don't have stocks for all units, add default ones
      const unitsWithStocks = new Set(formattedStocks.map(s => s.unitName));
      const unitsWithoutStocks = unitNames.filter(name => !unitsWithStocks.has(name));
      
      if (unitsWithoutStocks.length > 0) {
        const additionalStocks = unitsWithoutStocks.map(unitName => ({
          unitName,
          Jumlah_Stok: 0
        }));
        
        result.stocks = [...result.stocks, ...additionalStocks];
      }
    } else {
      // Create default stock entries for each unit if no stocks were found
      result.stocks = unitNames.map(unitName => ({
        unitName,
        Jumlah_Stok: 0
      }));
    }
  } else {
    // Default values if no units are found
    result.units = [{ 
      Nama_Satuan: '', 
      Jumlah_Dalam_Satuan_Dasar: 1,
      Satuan_Supplier: '',
      Threshold_Margin: 0
    }];
    result.prices = [{ 
      unitName: '', 
      Minimal_Qty: 1, 
      Maksimal_Qty: null, 
      Harga_Pokok: 0, 
      Harga_Jual: 0 
    }];
    result.stocks = [{ 
      unitName: '', 
      Jumlah_Stok: 0 
    }];
  }

  return result;
};

/**
 * Prepares product data for submission to the API
 * @param {Object} productData - Main product data
 * @param {Array} variants - Product variants
 * @param {Array} units - Product units
 * @param {Array} prices - Product prices
 * @param {Array} stocks - Product stocks
 * @returns {Object} Formatted data for submission
 */
export const prepareFormDataForSubmission = (productData, variants, units, prices, stocks) => {
  return {
    product: productData,
    variants: variants.filter(v => v.Deskripsi.trim() !== ''),
    units: units.filter(u => u.Nama_Satuan.trim() !== ''),
    prices: prices.filter(p => p.unitName !== ''),
    stocks: stocks.filter(s => s.unitName !== '')
  };
};

/**
 * Validate product form data
 * @param {Object} productData - Main product data
 * @param {Array} variants - Product variants
 * @param {Array} units - Product units
 * @returns {Object} Validation errors, if any
 */
export const validateProductForm = (productData, variants, units) => {
  const errors = {};
  
  // Validate main product data
  if (!productData.Kode_Item.trim()) {
    errors.Kode_Item = 'Kode item harus diisi';
  }
  
  if (!productData.Nama_Item.trim()) {
    errors.Nama_Item = 'Nama item harus diisi';
  }
  
  // Validate variants - only check non-empty variants
  const variantErrors = [];
  variants.forEach((variant, index) => {
    // Only validate variants that have some content
    if (variant.Deskripsi.trim() !== '' && !variant.Deskripsi.trim()) {
      variantErrors[index] = 'Deskripsi varian harus diisi jika ditambahkan';
    }
  });
  if (variantErrors.length > 0) {
    errors.variants = variantErrors;
  }
  
  // Validate units
  const unitErrors = [];
  const unitNames = new Set();
  units.forEach((unit, index) => {
    const unitError = {};
    
    if (!unit.Nama_Satuan.trim()) {
      unitError.Nama_Satuan = 'Nama satuan harus diisi';
    } else if (unitNames.has(unit.Nama_Satuan)) {
      unitError.Nama_Satuan = 'Nama satuan harus unik';
    } else {
      unitNames.add(unit.Nama_Satuan);
    }
    
    if (unit.Jumlah_Dalam_Satuan_Dasar <= 0) {
      unitError.Jumlah_Dalam_Satuan_Dasar = 'Jumlah harus lebih dari 0';
    }
    
    if (Object.keys(unitError).length > 0) {
      unitErrors[index] = unitError;
    }
  });
  if (unitErrors.length > 0) {
    errors.units = unitErrors;
  }
  
  return errors;
}; 