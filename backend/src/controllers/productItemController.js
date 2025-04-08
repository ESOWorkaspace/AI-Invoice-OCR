/**
 * Controller for product management operations
 */
const { ProductItem, ProductVariant, ProductUnit, ProductPrice, ProductStock } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const uuid = require('uuid');

/**
 * Get all products with optional pagination, filtering and sorting
 */
exports.getAllProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Getting all products`);
  
  // Extract query parameters
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    sortField = 'Kode_Item', 
    sortOrder = 'ASC',
    filter
  } = req.query;
  
  // Create where clause for searching/filtering
  const whereClause = {};
  
  // Parse any filter conditions
  if (filter) {
    try {
      const filterObj = JSON.parse(filter);
      Object.assign(whereClause, filterObj);
    } catch (error) {
      console.error(`[${requestId}] Error parsing filter:`, error);
    }
  }
  
  console.log(`[${requestId}] Search criteria:`, whereClause);
  
  // Calculate offset for pagination
  const offset = (page - 1) * limit;
  console.log(`[${requestId}] Pagination: page=${page}, limit=${limit}, offset=${offset}`);
  
  // Determine sort order
  const order = [[sortField, sortOrder]];
  console.log(`[${requestId}] Sorting: ${sortField} ${sortOrder}`);
  
  try {
    // First check if the table exists
    const tableExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'produk')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`[${requestId}] Table check:`, tableExists);
    
    if (!tableExists[0].exists) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Products table doesn't exist yet"
      });
    }
    
    // Check if there are any products in the table
    const countCheck = await sequelize.query(
      "SELECT COUNT(*) FROM produk",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`[${requestId}] Count check:`, countCheck);
    
    if (parseInt(countCheck[0].count) === 0) {
      console.log(`[${requestId}] No products found in the database`);
      return res.status(200).json({
        success: true,
        data: [],
        message: "No products found"
      });
    }
    
    // Add search conditions if search term is provided
    if (search) {
      whereClause[Op.or] = [
        { kode_item: { [Op.iLike]: `%${search}%` } },
        { nama_item: { [Op.iLike]: `%${search}%` } },
        { supplier_code: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Map the frontend sort field names to database column names
    const sortFieldMap = {
      'Kode_Item': 'kode_item',
      'Nama_Item': 'nama_item',
      'Jenis': 'jenis',
      'updatedAt': 'updated_at',
      'createdAt': 'created_at'
    };
    
    // Get the actual database column name to sort by
    const dbSortField = sortFieldMap[sortField] || 'updated_at';
    
    // Use separate try/catch blocks for each major database operation to prevent cascading failures
    let products = { count: 0, rows: [] };
    
    try {
      // Proceed with the normal query with separate includes to avoid join issues
      products = await ProductItem.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [[dbSortField, sortOrder]],
        distinct: true // This is important for correct count with associations
      });
      
      console.log(`[${requestId}] Base product query successful, found ${products.count} products`);
    } catch (error) {
      console.error(`[${requestId}] Error in base product query:`, error);
      // Return empty products rather than failing completely
      products = { count: 0, rows: [] };
    }
    
    // Process the results to add related data and group similar products as variations
    const processedProducts = [];
    const productsByBaseCode = {};
    
    // Process each product individually with error handling
    for (const product of products.rows) {
      try {
        const productJson = product.toJSON();
        
        // Format dates in a user-friendly way if they exist
        if (productJson.createdAt) {
          productJson.createdAt = new Date(productJson.createdAt).toISOString();
        }
        if (productJson.updatedAt) {
          productJson.updatedAt = new Date(productJson.updatedAt).toISOString();
        }
        
        // Load related data for each product separately to avoid join failures
        try {
          const variants = await ProductVariant.findAll({
            where: { ID_Produk: product.ID_Produk }
          });
          productJson.variants = variants.map(v => v.toJSON());
        } catch (error) {
          console.error(`[${requestId}] Error loading variants for product ${product.ID_Produk}:`, error);
          productJson.variants = [];
        }
        
        try {
          const units = await ProductUnit.findAll({
            where: { ID_Produk: product.ID_Produk }
          });
          productJson.units = units.map(u => u.toJSON());
        } catch (error) {
          console.error(`[${requestId}] Error loading units for product ${product.ID_Produk}:`, error);
          productJson.units = [];
        }
        
        try {
          const prices = await ProductPrice.findAll({
            where: { ID_Produk: product.ID_Produk }
          });
          productJson.prices = prices.map(p => p.toJSON());
        } catch (error) {
          console.error(`[${requestId}] Error loading prices for product ${product.ID_Produk}:`, error);
          productJson.prices = [];
        }
        
        try {
          const stocks = await ProductStock.findAll({
            where: { ID_Produk: product.ID_Produk }
          });
          productJson.stocks = stocks.map(s => s.toJSON());
        } catch (error) {
          console.error(`[${requestId}] Error loading stocks for product ${product.ID_Produk}:`, error);
          productJson.stocks = [];
        }
        
        // Extract the base code - we'll consider anything before hyphen, dot, or space as the base code
        let baseCode = productJson.Kode_Item;
        const baseCodeMatch = productJson.Kode_Item.match(/^([^\-\.\s]+)/);
        if (baseCodeMatch) {
          baseCode = baseCodeMatch[1];
        }
        
        // Add product to the mapping for variants
        if (!productsByBaseCode[baseCode]) {
          productsByBaseCode[baseCode] = {
            mainProduct: productJson,
            variations: []
          };
        } else if (productJson.Kode_Item !== baseCode) {
          // If this is not the base product itself, add it as a variation
          productsByBaseCode[baseCode].variations.push(productJson);
        }
        
      } catch (error) {
        console.error(`[${requestId}] Error processing product:`, error);
        // Skip this product but continue with others
      }
    }
    
    // Convert the grouped products back to an array, with variations nested
    for (const baseCode in productsByBaseCode) {
      try {
        const group = productsByBaseCode[baseCode];
        const result = group.mainProduct;
        
        // If we have actual product variants, use those
        if (result.variants && result.variants.length > 0) {
          processedProducts.push(result);
          continue;
        }
        
        // Otherwise, use the code-based variations we detected
        if (group.variations.length > 0) {
          // Create virtual variants from the similar products
          result.variants = group.variations.map(variation => ({
            ID_Varian: variation.ID_Produk, // Use the variation's product ID
            ID_Produk: result.ID_Produk,    // Link to the main product
            Deskripsi: variation.Nama_Item, // Use the variation's name as description
            virtualProduct: variation        // Store the full product for reference
          }));
        }
        
        processedProducts.push(result);
      } catch (error) {
        console.error(`[${requestId}] Error processing product group for ${baseCode}:`, error);
        // Skip this group but continue with others
      }
    }
    
    console.log(`[${requestId}] Processed ${processedProducts.length} products from ${products.count} base products`);
    
    res.json({
      total: products.count,
      totalGroups: processedProducts.length,
      page,
      limit,
      data: processedProducts
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
 * Import multiple products from a file or array
 */
exports.importProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Import products request received`);
  
  try {
    const importData = req.body;
    
    if (!importData || !Array.isArray(importData)) {
      console.log(`[${requestId}] Invalid import data format`);
      return res.status(400).json({
        success: false,
        message: 'Invalid import data format. Expected an array of products.'
      });
    }
    
    console.log(`[${requestId}] Received ${importData.length} products to import`);
    
    // Structure to hold the results
    const results = {
      success: true,
      total: importData.length,
      imported: 0,
      skipped: 0,
      updated: 0,
      failed: 0,
      errors: []
    };
    
    // Begin a transaction for the entire import
    const transaction = await sequelize.transaction();
    
    try {
      // Find all existing products with kode_item to check for duplicates
      const existingProducts = await ProductItem.findAll({
        attributes: ['id_produk', 'kode_item'],
        raw: true,
        transaction
      });
      
      // Create a map for faster lookup
      const existingProductMap = new Map();
      existingProducts.forEach(product => {
        existingProductMap.set(product.kode_item, product.id_produk);
      });
      
      // Process each product in the import array
      for (const productData of importData) {
        // Skip if required fields are missing
        if (!productData.Kode_Item || !productData.Nama_Item) {
          results.failed++;
          results.errors.push({
            product: productData,
            error: 'Missing required fields: Kode_Item or Nama_Item'
          });
          continue;
        }
        
        try {
          // Check if product with this kode_item already exists
          const existingProductId = existingProductMap.get(productData.Kode_Item);
          
          if (existingProductId) {
            // Handle update of existing product
            const productId = existingProductId;
            
            // Update the existing product
            await ProductItem.update({
              nama_item: productData.Nama_Item,
              jenis: productData.Jenis || null,
              supplier_code: productData.Supplier_Code || null,
              updated_at: new Date()
            }, {
              where: { id_produk: productId },
              transaction
            });
            
            // Handle variants if provided
            if (productData.variants && Array.isArray(productData.variants)) {
              // Delete existing variants first
              await ProductVariant.destroy({
                where: { id_produk: productId },
                transaction
              });
              
              // Create new variants
              for (const variant of productData.variants) {
                await ProductVariant.create({
                  id_produk: productId,
                  deskripsi: variant.Deskripsi
                }, { transaction });
              }
            }
            
            // Handle units if provided
            if (productData.units && Array.isArray(productData.units)) {
              // Delete existing units first
              await ProductUnit.destroy({
                where: { id_produk: productId },
                transaction
              });
              
              // Create new units
              for (const unit of productData.units) {
                const unitObj = {
                  ID_Produk: productId,
                  Nama_Satuan: unit.Nama_Satuan,
                  Jumlah_Dalam_Satuan_Dasar: parseFloat(unit.Jumlah_Dalam_Satuan_Dasar || 1),
                  Satuan_Supplier: unit.Satuan_Supplier || '',
                  Threshold_Margin: parseFloat(unit.Threshold_Margin || 0)
                };
                await ProductUnit.create(unitObj, { transaction });
              }
            }
            
            // Handle prices if provided
            if (productData.prices && Array.isArray(productData.prices)) {
              // Delete existing prices first
              await ProductPrice.destroy({
                where: { id_produk: productId },
                transaction
              });
              
              // Create new prices
              for (const price of productData.prices) {
                await ProductPrice.create({
                  id_produk: productId,
                  id_satuan: price.ID_Satuan,
                  minimal_qty: price.Minimal_Qty || 1,
                  maksimal_qty: price.Maksimal_Qty || 999999,
                  harga_pokok: price.Harga_Pokok,
                  harga_pokok_sebelumnya: price.Harga_Pokok_Sebelumnya || 0,
                  harga_jual: price.Harga_Jual
                }, { transaction });
              }
            }
            
            // Handle stocks if provided
            if (productData.stocks && Array.isArray(productData.stocks)) {
              // Delete existing stocks first
              await ProductStock.destroy({
                where: { id_produk: productId },
                transaction
              });
              
              // Create new stocks
              for (const stock of productData.stocks) {
                await ProductStock.create({
                  id_produk: productId,
                  id_satuan: stock.ID_Satuan,
                  jumlah_stok: stock.Jumlah_Stok || 0
                }, { transaction });
              }
            }
            
            results.updated++;
            console.log(`[${requestId}] Updated existing product: ${productData.Kode_Item}`);
          } else {
            // This is a new product - create it
            const newProduct = await ProductItem.create({
              kode_item: productData.Kode_Item,
              nama_item: productData.Nama_Item,
              jenis: productData.Jenis || null,
              supplier_code: productData.Supplier_Code || null
            }, { transaction });
            
            const productId = newProduct.id_produk;
            
            // Handle variants if provided
            if (productData.variants && Array.isArray(productData.variants)) {
              for (const variant of productData.variants) {
                await ProductVariant.create({
                  id_produk: productId,
                  deskripsi: variant.Deskripsi
                }, { transaction });
              }
            }
            
            // Handle units if provided
            if (productData.units && Array.isArray(productData.units)) {
              for (const unit of productData.units) {
                const unitObj = {
                  ID_Produk: productId,
                  Nama_Satuan: unit.Nama_Satuan,
                  Jumlah_Dalam_Satuan_Dasar: parseFloat(unit.Jumlah_Dalam_Satuan_Dasar || 1),
                  Satuan_Supplier: unit.Satuan_Supplier || '',
                  Threshold_Margin: parseFloat(unit.Threshold_Margin || 0)
                };
                await ProductUnit.create(unitObj, { transaction });
              }
            }
            
            // Handle prices if provided
            if (productData.prices && Array.isArray(productData.prices)) {
              for (const price of productData.prices) {
                await ProductPrice.create({
                  id_produk: productId,
                  id_satuan: price.ID_Satuan,
                  minimal_qty: price.Minimal_Qty || 1,
                  maksimal_qty: price.Maksimal_Qty || 999999,
                  harga_pokok: price.Harga_Pokok,
                  harga_pokok_sebelumnya: price.Harga_Pokok_Sebelumnya || 0,
                  harga_jual: price.Harga_Jual
                }, { transaction });
              }
            }
            
            // Handle stocks if provided
            if (productData.stocks && Array.isArray(productData.stocks)) {
              for (const stock of productData.stocks) {
                await ProductStock.create({
                  id_produk: productId,
                  id_satuan: stock.ID_Satuan,
                  jumlah_stok: stock.Jumlah_Stok || 0
                }, { transaction });
              }
            }
            
            results.imported++;
            console.log(`[${requestId}] Imported new product: ${productData.Kode_Item}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            product: productData,
            error: error.message
          });
          console.error(`[${requestId}] Error importing product ${productData.Kode_Item}:`, error);
        }
      }
      
      // Commit the transaction if no errors occurred
      await transaction.commit();
      
      console.log(`[${requestId}] Import completed: ${results.imported} imported, ${results.updated} updated, ${results.failed} failed`);
      
      res.status(200).json(results);
    } catch (error) {
      // Rollback the transaction if an error occurred
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`[${requestId}] Error during import:`, error);
    
    res.status(500).json({
      success: false,
      message: `Error importing products: ${error.message}`
    });
  }
};

/**
 * Get product by ID with all related data
 */
exports.getProductById = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Getting product with ID: ${id}`);
  
  try {
    // First try to parse the ID as a number if it's a string containing only digits
    let productId = id;
    if (typeof id === 'string' && /^[0-9]+$/.test(id)) {
      productId = parseInt(id, 10);
    }
    
    const product = await ProductItem.findByPk(productId, {
      include: [
        {
          model: ProductVariant,
          as: 'variants'
        },
        {
          model: ProductUnit,
          as: 'units',
          include: [
            {
              model: ProductPrice,
              as: 'prices'
            },
            {
              model: ProductStock,
              as: 'stocks'
            }
          ]
        }
      ]
    });
    
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
 * Create new product with related data
 */
exports.createProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Creating new product`);
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Extract data from request body
    const { 
      product,
      variants = [], 
      units = [],
      prices = [],
      stocks = []
    } = req.body;
    
    // Validate required fields for product
    if (!product || !product.kode_item || !product.nama_item) {
      await transaction.rollback();
      return res.status(400).json({
        error: {
          message: 'Product code and name are required'
        }
      });
    }
    
    // Check if product already exists
    const existing = await ProductItem.findOne({
      where: { kode_item: product.kode_item },
      transaction
    });
    
    if (existing) {
      await transaction.rollback();
      console.log(`[${requestId}] Product with code ${product.kode_item} already exists`);
      return res.status(400).json({
        error: {
          message: 'Product with this code already exists'
        }
      });
    }
    
    // Create the product
    const newProduct = await ProductItem.create(product, { transaction });
    console.log(`[${requestId}] Created new product with ID: ${newProduct.ID_Produk}`);
    
    // Process variants if provided
    if (variants.length > 0) {
      const variantsWithProductId = variants.map(variant => ({
        ...variant,
        ID_Produk: newProduct.ID_Produk
      }));
      
      await ProductVariant.bulkCreate(variantsWithProductId, { transaction });
      console.log(`[${requestId}] Added ${variants.length} variants to product`);
    }
    
    // Process units if provided
    if (units.length > 0) {
      const unitsWithProductId = units.map(unit => ({
        ...unit,
        ID_Produk: newProduct.ID_Produk
      }));
      
      const createdUnits = await ProductUnit.bulkCreate(unitsWithProductId, { 
        transaction,
        returning: true
      });
      console.log(`[${requestId}] Added ${units.length} units to product`);
      
      // Map of unit names to IDs for referencing in prices and stocks
      const unitNameToId = {};
      createdUnits.forEach(unit => {
        unitNameToId[unit.Nama_Satuan] = unit.ID_Satuan;
      });
      
      // Process prices if provided
      if (prices.length > 0) {
        const processedPrices = prices.map(price => ({
          ...price,
          ID_Produk: newProduct.ID_Produk,
          ID_Satuan: unitNameToId[price.unitName] || price.ID_Satuan
        }));
        
        await ProductPrice.bulkCreate(processedPrices, { transaction });
        console.log(`[${requestId}] Added ${prices.length} prices to product`);
      }
      
      // Process stocks if provided
      if (stocks.length > 0) {
        const processedStocks = stocks.map(stock => ({
          ...stock,
          ID_Produk: newProduct.ID_Produk,
          ID_Satuan: unitNameToId[stock.unitName] || stock.ID_Satuan
        }));
        
        await ProductStock.bulkCreate(processedStocks, { transaction });
        console.log(`[${requestId}] Added ${stocks.length} stock entries to product`);
      }
    }
    
    // Commit the transaction
    await transaction.commit();
    
    // Fetch the newly created product with all its relations
    const createdProduct = await ProductItem.findByPk(newProduct.ID_Produk, {
      include: [
        {
          model: ProductVariant,
          as: 'variants'
        },
        {
          model: ProductUnit,
          as: 'units',
          include: [
            {
              model: ProductPrice,
              as: 'prices'
            },
            {
              model: ProductStock,
              as: 'stocks'
            }
          ]
        }
      ]
    });
    
    res.status(201).json(createdProduct);
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
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
 * Update existing product and its related data
 */
exports.updateProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Updating product with ID: ${id}`);
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Extract data from request body
    const { 
      product,
      variants = [], 
      units = [],
      prices = [],
      stocks = []
    } = req.body;
    
    // Check if product exists
    // First try to parse the ID as a number if it's a string containing only digits
    let productId = id;
    if (typeof id === 'string' && /^[0-9]+$/.test(id)) {
      productId = parseInt(id, 10);
    }
    
    const existingProduct = await ProductItem.findByPk(productId, { transaction });
    
    if (!existingProduct) {
      await transaction.rollback();
      console.log(`[${requestId}] Product not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Update the product
    await existingProduct.update(product, { transaction });
    console.log(`[${requestId}] Updated product: ${id}`);
    
    // Handle variants - replace all existing ones with new set
    if (variants) {
      // Remove existing variants
      await ProductVariant.destroy({
        where: { ID_Produk: productId },
        transaction
      });
      
      // Add new variants
      if (variants.length > 0) {
        const variantsWithProductId = variants.map(variant => ({
          ...variant,
          ID_Produk: productId
        }));
        
        await ProductVariant.bulkCreate(variantsWithProductId, { transaction });
        console.log(`[${requestId}] Updated ${variants.length} variants for product`);
      }
    }
    
    // Handle units - more complex because prices and stocks depend on them
    if (units) {
      // Get existing units to keep track of which ones are removed
      const existingUnits = await ProductUnit.findAll({
        where: { ID_Produk: productId },
        transaction
      });
      
      const existingUnitIds = existingUnits.map(unit => unit.ID_Satuan);
      
      // Remove units that are not in the new set
      const newUnitNames = units.map(unit => unit.Nama_Satuan);
      const unitsToRemove = existingUnits.filter(unit => 
        !newUnitNames.includes(unit.Nama_Satuan)
      );
      
      // Remove units that are not in the new set along with associated prices and stocks
      for (const unit of unitsToRemove) {
        // Remove associated prices and stocks first (due to foreign key constraints)
        await ProductPrice.destroy({
          where: { ID_Satuan: unit.ID_Satuan },
          transaction
        });
        
        await ProductStock.destroy({
          where: { ID_Satuan: unit.ID_Satuan },
          transaction
        });
        
        // Then remove the unit
        await unit.destroy({ transaction });
      }
      
      console.log(`[${requestId}] Removed ${unitsToRemove.length} units from product`);
      
      // Add new units and update existing ones
      for (const unitData of units) {
        const existingUnit = existingUnits.find(u => u.Nama_Satuan === unitData.Nama_Satuan);
        
        if (existingUnit) {
          // Update existing unit
          await existingUnit.update(unitData, { transaction });
        } else {
          // Create new unit
          await ProductUnit.create({
            ...unitData,
            ID_Produk: productId
          }, { transaction });
        }
      }
      
      console.log(`[${requestId}] Updated units for product`);
      
      // Refresh the list of units after updates
      const updatedUnits = await ProductUnit.findAll({
        where: { ID_Produk: productId },
        transaction
      });
      
      // Map of unit names to IDs for use with prices and stocks
      const unitNameToId = {};
      updatedUnits.forEach(unit => {
        unitNameToId[unit.Nama_Satuan] = unit.ID_Satuan;
      });
      
      // Handle prices - replace all for this product
      if (prices) {
        await ProductPrice.destroy({
          where: { ID_Produk: productId },
          transaction
        });
        
        if (prices.length > 0) {
          const processedPrices = prices.map(price => ({
            ...price,
            ID_Produk: productId,
            ID_Satuan: unitNameToId[price.unitName] || price.ID_Satuan
          }));
          
          await ProductPrice.bulkCreate(processedPrices, { transaction });
          console.log(`[${requestId}] Updated ${prices.length} prices for product`);
        }
      }
      
      // Handle stocks - replace all for this product
      if (stocks) {
        await ProductStock.destroy({
          where: { ID_Produk: productId },
          transaction
        });
        
        if (stocks.length > 0) {
          const processedStocks = stocks.map(stock => ({
            ...stock,
            ID_Produk: productId,
            ID_Satuan: unitNameToId[stock.unitName] || stock.ID_Satuan
          }));
          
          await ProductStock.bulkCreate(processedStocks, { transaction });
          console.log(`[${requestId}] Updated ${stocks.length} stock entries for product`);
        }
      }
    }
    
    // Commit the transaction
    await transaction.commit();
    
    // Fetch the updated product with all its relations
    const updatedProduct = await ProductItem.findByPk(productId, {
      include: [
        {
          model: ProductVariant,
          as: 'variants'
        },
        {
          model: ProductUnit,
          as: 'units',
          include: [
            {
              model: ProductPrice,
              as: 'prices'
            },
            {
              model: ProductStock,
              as: 'stocks'
            }
          ]
        }
      ]
    });
    
    res.json(updatedProduct);
  } catch (error) {
    // Rollback transaction in case of error
    await transaction.rollback();
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
 * Delete product and all associated data
 */
exports.deleteProduct = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Deleting product with ID: ${id}`);
  
  const transaction = await sequelize.transaction();
  
  try {
    // First try to parse the ID as a number if it's a string containing only digits
    let productId = id;
    if (typeof id === 'string' && /^[0-9]+$/.test(id)) {
      productId = parseInt(id, 10);
    }
    
    // Check if product exists
    const product = await ProductItem.findByPk(productId, { transaction });
    
    if (!product) {
      await transaction.rollback();
      console.log(`[${requestId}] Product not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Product not found'
        }
      });
    }
    
    // Delete associated data first (should cascade, but doing it explicitly for safety)
    // Delete prices and stocks first (due to foreign key constraints)
    await ProductPrice.destroy({
      where: { ID_Produk: productId },
      transaction
    });
    
    await ProductStock.destroy({
      where: { ID_Produk: productId },
      transaction
    });
    
    // Delete units and variants
    await ProductUnit.destroy({
      where: { ID_Produk: productId },
      transaction
    });
    
    await ProductVariant.destroy({
      where: { ID_Produk: productId },
      transaction
    });
    
    // Finally delete the product
    await product.destroy({ transaction });
    
    await transaction.commit();
    console.log(`[${requestId}] Deleted product: ${id}`);
    
    res.status(204).send();
  } catch (error) {
    await transaction.rollback();
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
 * Import multiple products from a file or array
 */
exports.importProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Importing products`);
  console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: {
          message: 'No products to import or invalid format'
        }
      });
    }
    
    const imported = [];
    const failed = [];
    
    // Process each product in sequence with its own transaction
    for (const item of products) {
      // Create a new transaction for each product
      const transaction = await sequelize.transaction();
      
      try {
        // Validate required fields for product with defaults if missing
        if (!item.product) {
          failed.push({
            item: JSON.stringify(item).substring(0, 50) + '...',
            reason: 'Missing product information'
          });
          await transaction.rollback();
          continue;
        }
        
        // Ensure all required fields have defaults if missing
        const productData = {
          Kode_Item: item.product.Kode_Item || `UNKNOWN-${Date.now()}`,
          Nama_Item: item.product.Nama_Item || `Unnamed Product ${Date.now()}`,
          Jenis: item.product.Jenis || 'Uncategorized',
          Supplier_Code: item.product.Supplier_Code || null
        };
        
        // Only do a basic validation to ensure minimum required data is present
        if (!productData.Kode_Item || !productData.Nama_Item) {
          failed.push({
            item: JSON.stringify(item.product).substring(0, 50) + '...',
            reason: 'Missing required product code or name'
          });
          await transaction.rollback();
          continue;
        }
        
        console.log(`[${requestId}] Processing product:`, productData.Kode_Item);
        
        // Check if product exists by code - if it does, we'll update it instead of creating a new one
        let newProduct;
        const existing = await ProductItem.findOne({
          where: { Kode_Item: productData.Kode_Item },
          transaction
        });
        
        if (existing) {
          // Update existing product
          await existing.update(productData, { transaction });
          newProduct = existing;
          console.log(`[${requestId}] Updated existing product with ID: ${newProduct.ID_Produk}`);
        } else {
          // Create new product
          newProduct = await ProductItem.create(productData, { transaction });
          console.log(`[${requestId}] Created new product with ID: ${newProduct.ID_Produk}`);
        }
        
        // Process variants with flexible handling
        if (item.variants && Array.isArray(item.variants)) {
          // Remove existing variants if updating
          if (existing) {
            await ProductVariant.destroy({
              where: { ID_Produk: newProduct.ID_Produk },
              transaction
            });
          }
          
          const validVariants = item.variants
            .filter(variant => variant && typeof variant === 'object')
            .map(variant => ({
              ID_Produk: newProduct.ID_Produk,
              Deskripsi: variant.Deskripsi || 'Default Variant'
            }));
          
          if (validVariants.length > 0) {
            await ProductVariant.bulkCreate(validVariants, { transaction });
            console.log(`[${requestId}] Created ${validVariants.length} variants`);
          }
        }
        
        // Process units with flexible handling
        if (item.units && Array.isArray(item.units) && item.units.length > 0) {
          // Remove existing units if updating
          if (existing) {
            await ProductUnit.destroy({
              where: { ID_Produk: newProduct.ID_Produk },
              transaction
            });
          }
          
          // Ensure at least one valid unit
          const validUnits = item.units
            .filter(unit => unit && unit.Nama_Satuan)
            .map(unit => ({
              ID_Produk: newProduct.ID_Produk,
              Nama_Satuan: unit.Nama_Satuan,
              Jumlah_Dalam_Satuan_Dasar: parseFloat(unit.Jumlah_Dalam_Satuan_Dasar || 1),
              Satuan_Supplier: unit.Satuan_Supplier || '',
              Threshold_Margin: parseFloat(unit.Threshold_Margin || 0)
            }));
          
          if (validUnits.length === 0) {
            // Create a default unit if none provided
            validUnits.push({
              ID_Produk: newProduct.ID_Produk,
              Nama_Satuan: 'pcs',
              Jumlah_Dalam_Satuan_Dasar: 1,
              Satuan_Supplier: '',
              Threshold_Margin: 0
            });
            console.log(`[${requestId}] No valid units, created default 'pcs' unit`);
          }
          
          const createdUnits = await ProductUnit.bulkCreate(validUnits, { 
            transaction,
            returning: true
          });
          console.log(`[${requestId}] Created ${createdUnits.length} units`);
          
          // Create a map of unit names to IDs for prices and stocks
          const unitNameToId = {};
          createdUnits.forEach(unit => {
            unitNameToId[unit.Nama_Satuan] = unit.ID_Satuan;
          });
          
          // Process prices with flexible handling
          if (item.prices && Array.isArray(item.prices)) {
            // Remove existing prices if updating
            if (existing) {
              await ProductPrice.destroy({
                where: { ID_Produk: newProduct.ID_Produk },
                transaction
              });
            }
            
            const validPrices = item.prices
              .filter(price => price && (price.unitName || price.ID_Satuan))
              .map(price => {
                // Find the corresponding unit ID
                let unitId = price.ID_Satuan;
                if (!unitId && price.unitName) {
                  unitId = unitNameToId[price.unitName];
                }
                
                if (!unitId) {
                  console.log(`[${requestId}] Warning: No unit found for price: ${JSON.stringify(price)}`);
                  return null;
                }
                
                return {
                  ID_Produk: newProduct.ID_Produk,
                  ID_Satuan: unitId,
                  Minimal_Qty: parseFloat(price.Minimal_Qty || 1),
                  Maksimal_Qty: price.Maksimal_Qty ? parseFloat(price.Maksimal_Qty) : null,
                  Harga_Pokok: parseFloat(price.Harga_Pokok || 0),
                  Harga_Pokok_Sebelumnya: parseFloat(price.Harga_Pokok_Sebelumnya || 0),
                  Harga_Jual: parseFloat(price.Harga_Jual || 0)
                };
              })
              .filter(price => price !== null);
            
            if (validPrices.length > 0) {
              await ProductPrice.bulkCreate(validPrices, { transaction });
              console.log(`[${requestId}] Created ${validPrices.length} prices`);
            } else {
              // Create default prices for all units if none provided
              const defaultPrices = Object.entries(unitNameToId).map(([_, unitId]) => ({
                ID_Produk: newProduct.ID_Produk,
                ID_Satuan: unitId,
                Minimal_Qty: 1,
                Maksimal_Qty: null,
                Harga_Pokok: 0,
                Harga_Pokok_Sebelumnya: 0,
                Harga_Jual: 0
              }));
              
              await ProductPrice.bulkCreate(defaultPrices, { transaction });
              console.log(`[${requestId}] No valid prices, created ${defaultPrices.length} default prices`);
            }
          }
          
          // Process stocks with flexible handling
          if (item.stocks && Array.isArray(item.stocks)) {
            // Remove existing stocks if updating
            if (existing) {
              await ProductStock.destroy({
                where: { ID_Produk: newProduct.ID_Produk },
                transaction
              });
            }
            
            const validStocks = item.stocks
              .filter(stock => stock && (stock.unitName || stock.ID_Satuan))
              .map(stock => {
                // Find the corresponding unit ID
                let unitId = stock.ID_Satuan;
                if (!unitId && stock.unitName) {
                  unitId = unitNameToId[stock.unitName];
                }
                
                if (!unitId) {
                  console.log(`[${requestId}] Warning: No unit found for stock: ${JSON.stringify(stock)}`);
                  return null;
                }
                
                return {
                  ID_Produk: newProduct.ID_Produk,
                  ID_Satuan: unitId,
                  Jumlah_Stok: parseFloat(stock.Jumlah_Stok || 0)
                };
              })
              .filter(stock => stock !== null);
            
            if (validStocks.length > 0) {
              await ProductStock.bulkCreate(validStocks, { transaction });
              console.log(`[${requestId}] Created ${validStocks.length} stocks`);
            } else {
              // Create default stocks for all units if none provided
              const defaultStocks = Object.entries(unitNameToId).map(([_, unitId]) => ({
                ID_Produk: newProduct.ID_Produk,
                ID_Satuan: unitId,
                Jumlah_Stok: 0
              }));
              
              await ProductStock.bulkCreate(defaultStocks, { transaction });
              console.log(`[${requestId}] No valid stocks, created ${defaultStocks.length} default stocks`);
            }
          }
        } else {
          // Always ensure at least one default unit
          const defaultUnit = {
            ID_Produk: newProduct.ID_Produk,
            Nama_Satuan: 'pcs',
            Jumlah_Dalam_Satuan_Dasar: 1,
            Satuan_Supplier: '',
            Threshold_Margin: 0
          };
          
          const createdUnit = await ProductUnit.create(defaultUnit, { transaction });
          console.log(`[${requestId}] No units specified, created default 'pcs' unit`);
          
          // Create default price and stock for the default unit
          await ProductPrice.create({
            ID_Produk: newProduct.ID_Produk,
            ID_Satuan: createdUnit.ID_Satuan,
            Minimal_Qty: 1,
            Maksimal_Qty: null,
            Harga_Pokok: 0,
            Harga_Pokok_Sebelumnya: 0,
            Harga_Jual: 0
          }, { transaction });
          
          await ProductStock.create({
            ID_Produk: newProduct.ID_Produk,
            ID_Satuan: createdUnit.ID_Satuan,
            Jumlah_Stok: 0
          }, { transaction });
          
          console.log(`[${requestId}] Created default price and stock for default unit`);
        }
        
        // All operations successful for this product, commit the transaction
        await transaction.commit();
        imported.push(newProduct.Kode_Item);
        console.log(`[${requestId}] Successfully imported product: ${newProduct.Kode_Item}`);
        
      } catch (error) {
        // Roll back the transaction for this product only
        await transaction.rollback();
        console.error(`[${requestId}] Error processing product:`, error);
        
        failed.push({
          Kode_Item: item.product?.Kode_Item || 'Unknown',
          reason: error.message || 'Unknown error'
        });
      }
    }
    
    console.log(`[${requestId}] Import complete. Imported ${imported.length} products, ${failed.length} failed`);
    
    res.status(200).json({
      imported: imported.length,
      failed: failed.length,
      failedItems: failed,
      importedItems: imported
    });
  } catch (error) {
    console.error(`[${requestId}] Error importing products:`, error);
    res.status(500).json({
      error: {
        message: 'Error importing products',
        details: error.message
      }
    });
  }
};

/**
 * Delete all products and associated data with confirmation code
 */
exports.deleteAllProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Delete all products request received with confirmation: ${req.body.confirmationText}`);
  
  try {
    // Check if confirmation code matches
    if (!req.body.confirmationText || !req.body.confirmationCode ||
        req.body.confirmationText !== `${req.body.confirmationCode} DELETE-ALL-PRODUCTS-CONFIRM`) {
      console.log(`[${requestId}] Invalid confirmation`);
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation. Please enter the correct confirmation code followed by DELETE-ALL-PRODUCTS-CONFIRM.'
      });
    }
    
    // Begin transaction
    const t = await sequelize.transaction();
    
    try {
      // Delete all associated data first
      await ProductStock.destroy({ where: {}, transaction: t });
      await ProductPrice.destroy({ where: {}, transaction: t });
      await ProductUnit.destroy({ where: {}, transaction: t });
      await ProductVariant.destroy({ where: {}, transaction: t });
      
      // Delete all products
      await ProductItem.destroy({ where: {}, transaction: t });
      
      // Commit the transaction
      await t.commit();
      
      console.log(`[${requestId}] All products deleted successfully`);
      
      return res.status(200).json({
        success: true,
        message: 'All products and associated data deleted successfully.'
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`[${requestId}] Error deleting all products:`, error);
    
    return res.status(500).json({
      success: false,
      message: `Error deleting all products: ${error.message}`
    });
  }
};

/**
 * Bulk delete multiple products by their IDs
 */
exports.bulkDeleteProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Bulk delete products request received`);
  
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log(`[${requestId}] Invalid request - no IDs provided or invalid format`);
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of product IDs to delete.'
      });
    }
    
    console.log(`[${requestId}] Deleting ${ids.length} products: ${JSON.stringify(ids)}`);
    
    // Begin transaction
    const t = await sequelize.transaction();
    
    try {
      // Delete associated data for these products first
      await ProductStock.destroy({ 
        where: { id_produk: { [Op.in]: ids } },
        transaction: t 
      });
      
      await ProductPrice.destroy({ 
        where: { id_produk: { [Op.in]: ids } }, 
        transaction: t 
      });
      
      await ProductUnit.destroy({ 
        where: { id_produk: { [Op.in]: ids } },
        transaction: t 
      });
      
      await ProductVariant.destroy({ 
        where: { id_produk: { [Op.in]: ids } },
        transaction: t 
      });
      
      // Delete the products
      const deletedCount = await ProductItem.destroy({ 
        where: { id_produk: { [Op.in]: ids } },
        transaction: t 
      });
      
      // Commit the transaction
      await t.commit();
      
      console.log(`[${requestId}] Successfully deleted ${deletedCount} products`);
      
      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${deletedCount} products.`,
        deletedCount
      });
    } catch (error) {
      // Rollback the transaction in case of error
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`[${requestId}] Error bulk deleting products:`, error);
    
    return res.status(500).json({
      success: false,
      message: `Error deleting products: ${error.message}`
    });
  }
};

/**
 * Export all products data
 */
exports.exportProducts = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Exporting all products`);
  
  try {
    const format = req.query.format || 'json'; // Default to JSON if not specified
    
    // Get all products with their related data
    const products = await ProductItem.findAll({
      include: [
        {
          model: ProductVariant,
          as: 'variants',
          required: false
        },
        {
          model: ProductUnit,
          as: 'units',
          required: false,
          include: [
            {
              model: ProductPrice,
              as: 'prices',
              required: false
            },
            {
              model: ProductStock,
              as: 'stocks',
              required: false
            }
          ]
        }
      ]
    });
    
    if (format.toLowerCase() === 'csv') {
      // Convert to CSV format
      let csvContent = 'ID_Produk,Kode_Item,Nama_Item,Jenis,Supplier_Code\n';
      
      products.forEach(product => {
        const p = product.toJSON();
        // Escape any commas in the fields
        const escapedName = p.Nama_Item ? `"${p.Nama_Item.replace(/"/g, '""')}"` : '';
        const escapedJenis = p.Jenis ? `"${p.Jenis.replace(/"/g, '""')}"` : '';
        const escapedSupplierCode = p.Supplier_Code ? `"${p.Supplier_Code.replace(/"/g, '""')}"` : '';
        
        csvContent += `${p.ID_Produk},${p.Kode_Item},${escapedName},${escapedJenis},${escapedSupplierCode}\n`;
      });
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=products-export.csv');
      
      return res.send(csvContent);
    } else {
      // Default JSON format
      res.json({
        count: products.length,
        data: products
      });
    }
  } catch (error) {
    console.error(`[${requestId}] Error exporting products:`, error);
    res.status(500).json({
      error: {
        message: 'Error exporting products',
        details: error.message
      }
    });
  }
};

/**
 * Get product by supplier code
 */
exports.getProductBySupplierCode = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { supplierCode } = req.params;
  console.log(`[${requestId}] Getting product with Supplier Code: ${supplierCode}`);
  
  try {
    const product = await ProductItem.findOne({
      where: { supplier_code: supplierCode },
      include: [
        {
          model: ProductVariant,
          as: 'variants'
        },
        {
          model: ProductUnit,
          as: 'units',
          include: [
            {
              model: ProductPrice,
              as: 'prices'
            },
            {
              model: ProductStock,
              as: 'stocks'
            }
          ]
        }
      ]
    });
    
    if (!product) {
      console.log(`[${requestId}] Product not found with supplier code: ${supplierCode}`);
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Product not found'
      });
    }
    
    console.log(`[${requestId}] Successfully retrieved product by supplier code: ${supplierCode}`);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting product by supplier code:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving product',
        details: error.message
      }
    });
  }
};
