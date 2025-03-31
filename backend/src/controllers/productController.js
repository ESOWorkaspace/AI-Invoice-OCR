/**
 * Controller for product management operations
 */
const { Product } = require('../models');
const { Op } = require('sequelize');
const uuid = require('uuid');

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
