/**
 * Controller for product management operations
 */
const { Product } = require('../models');
const { Op } = require('sequelize');
const uuid = require('uuid');
const { ProductItem } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Get all products with optional pagination
 */
exports.getAllProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Getting all products`);
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const products = await Product.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });
    
    console.log(`[${requestId}] Found ${products.count} products`);
    
    res.json({
      total: products.count,
      page,
      limit,
      data: products.rows
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting products:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving products',
        details: error.message
      }
    });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Getting product with ID: ${id}`);
  
  try {
    const product = await Product.findByPk(id);
    
    if (!product) {
      console.log(`[${requestId}] Product not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Product not found'
        }
      });
    }
    
    console.log(`[${requestId}] Successfully retrieved product: ${id}`);
    res.json(product);
  } catch (error) {
    console.error(`[${requestId}] Error getting product:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving product',
        details: error.message
      }
    });
  }
};

/**
 * Create new product
 */
exports.createProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Creating new product`);
  
  try {
    // Validate required fields
    const { product_code, product_name, unit, price } = req.body;
    if (!product_code || !product_name || !unit) {
      return res.status(400).json({
        error: {
          message: 'Product code, name, and unit are required'
        }
      });
    }
    
    // Check if product already exists
    const existing = await Product.findOne({
      where: { product_code }
    });
    
    if (existing) {
      console.log(`[${requestId}] Product with code ${product_code} already exists`);
      return res.status(400).json({
        error: {
          message: 'Product with this code already exists'
        }
      });
    }
    
    // Create new product
    const newProduct = await Product.create(req.body);
    console.log(`[${requestId}] Created new product with ID: ${newProduct.id}`);
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(`[${requestId}] Error creating product:`, error);
    res.status(500).json({
      error: {
        message: 'Error creating product',
        details: error.message
      }
    });
  }
};

/**
 * Update existing product
 */
exports.updateProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Updating product with ID: ${id}`);
  
  try {
    // Check if product exists
    const product = await Product.findByPk(id);
    
    if (!product) {
      console.log(`[${requestId}] Product not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Update product
    await product.update(req.body);
    console.log(`[${requestId}] Updated product: ${id}`);
    
    // Get updated product
    const updatedProduct = await Product.findByPk(id);
    res.json(updatedProduct);
  } catch (error) {
    console.error(`[${requestId}] Error updating product:`, error);
    res.status(500).json({
      error: {
        message: 'Error updating product',
        details: error.message
      }
    });
  }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Deleting product with ID: ${id}`);
  
  try {
    // Check if product exists
    const product = await Product.findByPk(id);
    
    if (!product) {
      console.log(`[${requestId}] Product not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Delete product
    await product.destroy();
    console.log(`[${requestId}] Deleted product: ${id}`);
    
    res.status(204).send();
  } catch (error) {
    console.error(`[${requestId}] Error deleting product:`, error);
    res.status(500).json({
      error: {
        message: 'Error deleting product',
        details: error.message
      }
    });
  }
};

/**
 * Search products
 */
exports.searchProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { query } = req.params;
  console.log(`[${requestId}] Searching products with query: ${query}`);
  
  try {
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { product_code: { [Op.iLike]: `%${query}%` } },
          { product_name: { [Op.iLike]: `%${query}%` } },
          { category: { [Op.iLike]: `%${query}%` } },
          { supplier_code: { [Op.iLike]: `%${query}%` } },
          { barcode: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['product_name', 'ASC']],
      limit: 20
    });
    
    console.log(`[${requestId}] Found ${products.length} products matching query`);
    
    res.json(products);
  } catch (error) {
    console.error(`[${requestId}] Error searching products:`, error);
    res.status(500).json({
      error: {
        message: 'Error searching products',
        details: error.message
      }
    });
  }
};

/**
 * Search products by supplier code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchBySupplierCode = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  try {
    const { supplierCode } = req.params;
    console.log(`[${requestId}] Searching for product with supplier code: ${supplierCode}`);
    
    const product = await ProductItem.findOne({
      where: {
        supplier_code: supplierCode
      }
    });
    
    if (!product) {
      console.log(`[${requestId}] No product found with supplier code: ${supplierCode}`);
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Product not found with this supplier code'
      });
    }
    
    console.log(`[${requestId}] Found product with supplier code: ${supplierCode}`);
    console.log(`[${requestId}] Product details:`, product.kode_item, product.nama_item);
    
    return res.status(200).json({
      success: true,
      data: {
        kode_main: product.kode_item,
        nama_main: product.nama_item,
        supplier_code: product.supplier_code
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Error searching product by supplier code:`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error searching product by supplier code',
        details: error.message
      }
    });
  }
};

/**
 * Search products for dropdown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { search, field, limit: requestLimit } = req.query;
  console.log(`[${requestId}] Searching products with term: ${search}, field: ${field}, limit: ${requestLimit}`);
  
  if (!search || search.length < 2) {
    console.log(`[${requestId}] Search term too short or missing`);
    return res.json({
      success: true,
      data: []
    });
  }
  
  try {
    console.log(`[${requestId}] Searching for products with query: ${search}`);
    
    // Build the where clause based on the field parameter
    let whereClause = {};
    
    if (field === 'product_code') {
      whereClause = {
        [Op.or]: [
          { Kode_Item: { [Op.iLike]: `%${search}%` } },
          { Supplier_Code: { [Op.iLike]: `%${search}%` } }
        ]
      };
    } else if (field === 'product_name') {
      whereClause = {
        Nama_Item: { [Op.iLike]: `%${search}%` }
      };
    } else {
      // Default search across all relevant fields
      whereClause = {
        [Op.or]: [
          { Supplier_Code: { [Op.iLike]: `%${search}%` } },
          { Kode_Item: { [Op.iLike]: `%${search}%` } },
          { Nama_Item: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }
    
    // Parse the limit parameter
    const limit = parseInt(requestLimit) || 0;
    
    // If limit is 0, return all matching products (no limit)
    const queryOptions = {
      where: whereClause,
      order: [['Nama_Item', 'ASC']]
    };
    
    // Only add limit if it's greater than 0
    if (limit > 0) {
      queryOptions.limit = limit;
    }
    
    const products = await ProductItem.findAll(queryOptions);
    
    console.log(`[${requestId}] Found ${products.length} products matching search term: ${search}`);
    console.log(`[${requestId}] First product sample:`, products.length > 0 ? products[0].dataValues : 'No products found');
    
    // Check for unit data
    const productIds = products.map(p => p.ID_Produk);
    let unitData = [];
    
    if (productIds.length > 0) {
      try {
        // Get units for all products in one query
        unitData = await sequelize.query(
          `SELECT id_produk, nama_satuan 
           FROM produk_satuan 
           WHERE id_produk IN (:productIds)`,
          {
            replacements: { productIds },
            type: sequelize.QueryTypes.SELECT
          }
        );
        console.log(`[${requestId}] Found unit data for ${unitData.length} products`);
      } catch (error) {
        console.error(`[${requestId}] Error fetching unit data:`, error);
        // Continue with empty unit data
      }
    }
    
    // Get price data
    let priceData = [];
    
    if (productIds.length > 0) {
      try {
        // Get prices for all products in one query
        priceData = await sequelize.query(
          `SELECT id_produk, harga_pokok, harga_jual 
           FROM produk_harga 
           WHERE id_produk IN (:productIds)`,
          {
            replacements: { productIds },
            type: sequelize.QueryTypes.SELECT
          }
        );
        console.log(`[${requestId}] Found price data for ${priceData.length} products`);
      } catch (error) {
        console.error(`[${requestId}] Error fetching price data:`, error);
        // Continue with empty price data
      }
    }
    
    // Create lookup maps for efficient access
    const unitMap = {};
    unitData.forEach(unit => {
      if (!unitMap[unit.id_produk]) {
        unitMap[unit.id_produk] = [];
      }
      unitMap[unit.id_produk].push(unit.nama_satuan);
    });
    
    const priceMap = {};
    priceData.forEach(price => {
      priceMap[price.id_produk] = {
        harga_pokok: price.harga_pokok,
        harga_jual: price.harga_jual
      };
    });
    
    // Get unit-specific prices
    let unitPrices = {};
    if (productIds.length > 0) {
      try {
        // Get all unit prices for these products
        const unitPriceData = await sequelize.query(
          `SELECT ps.id_produk, ps.nama_satuan, ph.harga_pokok, ph.harga_jual
           FROM produk_satuan ps
           LEFT JOIN produk_harga ph ON ps.id_satuan = ph.id_satuan
           WHERE ps.id_produk IN (:productIds)`,
          {
            replacements: { productIds },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        console.log(`[${requestId}] Found unit price data: ${unitPriceData.length} rows`);
        
        // Organize unit prices by product and unit
        unitPriceData.forEach(unitPrice => {
          const prodId = unitPrice.id_produk;
          const unitName = unitPrice.nama_satuan;
          
          if (!unitPrices[prodId]) {
            unitPrices[prodId] = {};
          }
          
          unitPrices[prodId][unitName] = {
            harga_pokok: unitPrice.harga_pokok || 0,
            harga_jual: unitPrice.harga_jual || 0
          };
        });
      } catch (error) {
        console.error(`[${requestId}] Error fetching unit price data:`, error);
      }
    }
    
    // Transform the data to match the expected format with units and prices
    const formattedProducts = products.map(product => {
      const productId = product.ID_Produk;
      const units = unitMap[productId] || [];
      const prices = priceMap[productId] || {};
      
      // Get unit-specific prices for this product
      const unitPricesForProduct = unitPrices[productId] || {};
      
      // Create unit_prices object mapping each unit to its base price
      const unitPricesMap = {};
      units.forEach(unit => {
        // Use unit-specific price if available, otherwise use default
        unitPricesMap[unit] = (unitPricesForProduct[unit]?.harga_pokok) || prices.harga_pokok || 0;
      });
      
      console.log(`[${requestId}] Product ${product.Kode_Item} unit prices:`, unitPricesMap);
      
      return {
        kode_main: product.Kode_Item,
        nama_main: product.Nama_Item,
        supplier_code: product.Supplier_Code,
        units: units,
        unit: units.length > 0 ? units[0] : '',
        harga_pokok: prices.harga_pokok || 0,
        harga_jual: prices.harga_jual || 0,
        unit_prices: unitPricesMap // Add unit-specific prices
      };
    });
    
    res.json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    console.error(`[${requestId}] Error searching products:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error searching products',
        details: error.message
      }
    });
  }
};

/**
 * Get recent products
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecentProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Getting recent products from produk table`);
  
  try {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    console.log(`[${requestId}] Pagination parameters: page=${page}, limit=${limit}, offset=${offset}`);
    
    // Get most recent products by created_at date from produk table with pagination
    const products = await sequelize.query(
      `SELECT 
        kode_item as product_code, 
        nama_item as product_name, 
        supplier_code, 
        jenis as category, 
        (SELECT nama_satuan FROM produk_satuan WHERE id_produk = produk.id_produk LIMIT 1) as unit,
        (SELECT harga_jual FROM produk_harga WHERE id_produk = produk.id_produk LIMIT 1) as price,
        created_at
      FROM produk 
      ORDER BY created_at DESC 
      LIMIT :limit OFFSET :offset`,
      { 
        replacements: { limit, offset },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // Get total count for pagination metadata
    const [{ total_count }] = await sequelize.query(
      `SELECT COUNT(*) as total_count FROM produk`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log(`[${requestId}] Found ${products.length} recent products from produk table (page ${page}/${Math.ceil(total_count/limit)})`);
    
    // Return empty array if no products found
    if (products.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: parseInt(total_count),
          page,
          limit,
          total_pages: Math.ceil(total_count/limit)
        }
      });
    }
    
    res.json({
      success: true,
      data: products,
      pagination: {
        total: parseInt(total_count),
        page,
        limit,
        total_pages: Math.ceil(total_count/limit)
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting recent products from produk table:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving recent products',
        details: error.message
      }
    });
  }
};

/**
 * Search product by invoice code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchByInvoiceCode = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  try {
    const { invoiceCode } = req.query;
    console.log(`[${requestId}] Searching for product with invoice code: ${invoiceCode}`);
    
    if (!invoiceCode || invoiceCode.trim() === '') {
      console.log(`[${requestId}] No invoice code provided`);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invoice code is required'
        }
      });
    }
    
    // Search in the ProductItem (produk) table for a matching product
    const product = await ProductItem.findOne({
      where: {
        [Op.or]: [
          { Kode_Item: invoiceCode },
          { Supplier_Code: invoiceCode }
        ]
      }
    });
    
    if (!product) {
      console.log(`[${requestId}] No product found with invoice code: ${invoiceCode}`);
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    console.log(`[${requestId}] Found product with invoice code: ${invoiceCode}`);
    console.log(`[${requestId}] Product details:`, product.Kode_Item, product.Nama_Item);
    
    // Get unit and price information if available
    let units = [];
    let unit = '';
    let base_price = 0;
    let price = 0;
    let unit_prices = {}; // Object to store unit-specific prices
    
    try {
      // Get all units for this product
      const unitInfo = await sequelize.query(
        `SELECT id_satuan, nama_satuan FROM produk_satuan WHERE id_produk = :id_produk`,
        { 
          replacements: { id_produk: product.ID_Produk },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (unitInfo.length > 0) {
        units = unitInfo.map(u => u.nama_satuan);
        unit = units[0]; // Default to the first unit
        
        // Get unit-specific prices
        const unitIds = unitInfo.map(u => u.id_satuan);
        const unitPriceInfo = await sequelize.query(
          `SELECT ps.nama_satuan, ph.harga_pokok, ph.harga_jual 
           FROM produk_satuan ps
           LEFT JOIN produk_harga ph ON ps.id_satuan = ph.id_satuan
           WHERE ps.id_produk = :id_produk`,
          { 
            replacements: { id_produk: product.ID_Produk },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        console.log(`[${requestId}] Found ${unitPriceInfo.length} unit-specific prices`);
        
        // Create unit_prices mapping
        unitPriceInfo.forEach(up => {
          unit_prices[up.nama_satuan] = up.harga_pokok || 0;
        });
        
        console.log(`[${requestId}] Unit prices:`, unit_prices);
      }
      
      const priceInfo = await sequelize.query(
        `SELECT harga_pokok, harga_jual FROM produk_harga WHERE id_produk = :id_produk LIMIT 1`,
        { 
          replacements: { id_produk: product.ID_Produk },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (priceInfo.length > 0) {
        base_price = priceInfo[0].harga_pokok || 0;
        price = priceInfo[0].harga_jual || 0;
      }
      
      // If we don't have unit-specific prices yet but have units and a base price,
      // create default mapping using the base price
      if (Object.keys(unit_prices).length === 0 && units.length > 0) {
        units.forEach(u => {
          unit_prices[u] = base_price;
        });
      }
    } catch (error) {
      console.error(`[${requestId}] Error fetching product details:`, error);
      // Continue with the product data we have
    }
    
    const productData = {
      product_code: product.Kode_Item,
      kode_main: product.Kode_Item,
      product_name: product.Nama_Item,
      nama_main: product.Nama_Item,
      supplier_code: product.Supplier_Code,
      units: units,
      unit: unit,
      base_price: base_price,
      harga_pokok: base_price,
      price: price,
      harga_jual: price,
      unit_prices: unit_prices, // Add unit-specific prices
      category: product.Jenis
    };
    
    return res.status(200).json({
      success: true,
      data: [productData]
    });
  } catch (error) {
    console.error(`[${requestId}] Error searching product by invoice code:`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error searching product by invoice code',
        details: error.message
      }
    });
  }
};
