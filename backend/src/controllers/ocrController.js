/**
 * Controller for OCR operations
 */
const { ProcessedInvoice, RawOCRData, ProductItem, ProductUnit, ProductPrice } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const queueService = require('../services/queueService');

/**
 * Update product prices and metadata based on invoice data
 * @param {Object} editedData - The complete edited data from the request
 * @param {String} requestId - The request ID for logging
 */
async function updateProductData(editedData, requestId) {
  // Extract supplier information from invoice
  let supplierName = '';
  if (editedData.output && editedData.output.nama_supplier && editedData.output.nama_supplier.value) {
    supplierName = editedData.output.nama_supplier.value;
  } else if (editedData.supplier_name) {
    supplierName = editedData.supplier_name;
  }
  
  // Get source items from the edited data structure
  let sourceItems = [];
  
  if (editedData.output && editedData.output.items && Array.isArray(editedData.output.items)) {
    sourceItems = editedData.output.items;
  } else if (editedData.items && Array.isArray(editedData.items)) {
    sourceItems = editedData.items;
  }
  
  if (sourceItems.length === 0) {
    return;
  }
  
  // Track products that were processed
  const processedProducts = [];
  
  // Process each item in the invoice
  for (const item of sourceItems) {
    try {
      // Extract product code and unit from item
      let productCode = '';
      let unitName = '';
      
      // Extract product code (kode_barang_main)
      if (item.kode_barang_main) {
        productCode = item.kode_barang_main.value !== undefined ? item.kode_barang_main.value : item.kode_barang_main;
      }
      
      // Extract unit name (satuan_main)
      if (item.satuan_main) {
        if (typeof item.satuan_main === 'object') {
          unitName = item.satuan_main.value || '';
        } else if (typeof item.satuan_main === 'string') {
          unitName = item.satuan_main;
        }
      }
      
      // Skip if no product code or unit
      if (!productCode || !unitName) {
        continue;
      }
      
      // Skip if this product was already processed
      const productKey = `${productCode}-${unitName}`;
      if (processedProducts.includes(productKey)) {
        continue;
      }
      
      // Keep track of processed products
      processedProducts.push(productKey);
      
      // Find product in database
      const product = await ProductItem.findOne({
        where: { Kode_Item: productCode }
      });
      
      if (!product) {
        continue;
      }
      
      const productId = product.ID_Produk;
      
      // Update supplier information if available
      if (supplierName) {
        await product.update({
          Supplier_Name: supplierName
        });
      }
      
      // If there's a supplier code in the invoice item, update it
      let supplierCode = '';
      if (item.supplier_code) {
        supplierCode = item.supplier_code.value !== undefined ? item.supplier_code.value : item.supplier_code;
        if (supplierCode) {
          await product.update({
            Supplier_Code: supplierCode
          });
        }
      }
      
      // If the item has kode_barang_invoice, also store that as a supplier code
      if (!supplierCode && item.kode_barang_invoice) {
        supplierCode = item.kode_barang_invoice.value !== undefined ? item.kode_barang_invoice.value : item.kode_barang_invoice;
        if (supplierCode && supplierCode !== productCode) {
          await product.update({
            Supplier_Code: supplierCode
          });
        }
      }
      
      // Find product unit
      const unit = await ProductUnit.findOne({
        where: {
          ID_Produk: productId,
          Nama_Satuan: unitName
        }
      });
      
      if (!unit) {
        continue;
      }
      
      // Find product price
      const price = await ProductPrice.findOne({
        where: {
          ID_Produk: productId,
          ID_Satuan: unit.ID_Satuan
        }
      });
      
      if (!price) {
        continue;
      }
      
      // Update supplier unit if available in the data
      if (item.satuan) {
        const supplierUnit = item.satuan.value !== undefined ? item.satuan.value : 
                            (typeof item.satuan === 'string' ? item.satuan : '');
        
        if (supplierUnit && supplierUnit !== unit.Satuan_Supplier) {
          await unit.update({
            Satuan_Supplier: supplierUnit
          });
        }
      } else if (item.satuan_main && item.satuan_main.supplier_unit) {
        // Try to get from satuan_main.supplier_unit if available
        const supplierUnit = item.satuan_main.supplier_unit;
        if (supplierUnit && supplierUnit !== unit.Satuan_Supplier) {
          await unit.update({
            Satuan_Supplier: supplierUnit
          });
        }
      }
      
      // Get the new price from invoice
      let newPrice = 0;
      
      // Priority 1: Try to get harga_satuan (from ItemsTable) 
      if (item.harga_satuan) {
        newPrice = parseFloat(item.harga_satuan.value !== undefined ? item.harga_satuan.value : item.harga_satuan);
      }
      
      // Priority 2: Fall back to harga_dasar_main if harga_satuan not available
      if (!newPrice && item.harga_dasar_main) {
        newPrice = parseFloat(item.harga_dasar_main.value !== undefined ? item.harga_dasar_main.value : item.harga_dasar_main);
      }
      
      if (!newPrice) {
        continue;
      }
      
      // Save current price to harga_pokok_sebelumnya and update harga_pokok
      const oldPrice = price.Harga_Pokok;
      
      // Only update if the price has actually changed
      if (newPrice !== oldPrice) {
        await price.update({
          Harga_Pokok_Sebelumnya: oldPrice,
          Harga_Pokok: newPrice
        });
      }
      
      // Calculate and update threshold margin
      const hargaJual = parseFloat(price.Harga_Jual || 0);
      if (oldPrice > 0 && hargaJual > 0) {
        // Calculate current margin percent from old price and selling price
        const marginPercent = ((hargaJual - oldPrice) / oldPrice) * 100;
        
        // Update threshold margin
        await unit.update({
          Threshold_Margin: marginPercent
        });
      }
    } catch (error) {
      // Silently continue with next item
    }
  }
}

/**
 * Save OCR data to the database
 */
exports.saveOcrData = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Saving OCR data`);
  
  try {
    // Extract data from the request
    const { originalData, editedData, imageData } = req.body;
    
    if (!editedData) {
      return res.status(400).json({
        error: {
          message: 'Edited data is required'
        }
      });
    }
    
    console.log(`[${requestId}] Received OCR data structure:`, JSON.stringify(editedData, null, 2).substring(0, 500) + '...');
    
    // Extract invoice details from edited data
    // First try to get invoice number from the proper location in OCR data structure
    let base_invoice_number = '';
    
    if (editedData.output && editedData.output.nomor_referensi && editedData.output.nomor_referensi.value) {
      base_invoice_number = editedData.output.nomor_referensi.value;
      console.log(`[${requestId}] Found invoice number in OCR data: ${base_invoice_number}`);
    } else if (editedData.invoice_number) {
      base_invoice_number = editedData.invoice_number;
      console.log(`[${requestId}] Using provided invoice_number: ${base_invoice_number}`);
    } else {
      // Generate a unique invoice number if none is found
      base_invoice_number = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`[${requestId}] Generated random invoice number: ${base_invoice_number}`);
    }
    
    let invoice_number = base_invoice_number;
    
    // Extract other invoice details
    let supplier_name = '';
    if (editedData.output && editedData.output.nama_supplier && editedData.output.nama_supplier.value) {
      supplier_name = editedData.output.nama_supplier.value;
    } else if (editedData.supplier_name) {
      supplier_name = editedData.supplier_name;
    }
    
    // Helper function to parse dates with better error handling
    function parseDate(dateValue, format = 'DD-MM-YYYY') {
      if (!dateValue) return null;
      
      // If already a Date object or timestamp
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === 'number') return new Date(dateValue);
      
      // Handle different string formats
      let parsed;
      
      // Try specific format first
      parsed = moment(dateValue, format, true);
      if (parsed.isValid()) return parsed.toDate();
      
      // Try generic parsing as fallback
      parsed = moment(dateValue);
      if (parsed.isValid()) return parsed.toDate();
      
      // Log failure and return null
      console.warn(`[${requestId}] Failed to parse date: ${dateValue}`);
      return null;
    }
    
    // Extract invoice date
    let invoice_date = null;
    if (editedData.output && editedData.output.tanggal_faktur && editedData.output.tanggal_faktur.value) {
      invoice_date = parseDate(editedData.output.tanggal_faktur.value);
      console.log(`[${requestId}] Parsed invoice date: ${invoice_date}`);
    } else if (editedData.invoice_date) {
      invoice_date = parseDate(editedData.invoice_date);
    }
    
    // Ensure we always have a date for RawOCRData (required by model)
    const raw_ocr_invoice_date = invoice_date || new Date();
    
    // Extract due date
    let due_date = null;
    if (editedData.output && editedData.output.tgl_jatuh_tempo && editedData.output.tgl_jatuh_tempo.value) {
      due_date = parseDate(editedData.output.tgl_jatuh_tempo.value);
      console.log(`[${requestId}] Parsed due date: ${due_date}`);
    } else if (editedData.due_date) {
      due_date = parseDate(editedData.due_date);
    }
    
    // Validate that invoice date is not after due date
    if (invoice_date && due_date && invoice_date > due_date) {
      return res.status(400).json({
        error: {
          message: 'Tanggal faktur tidak boleh lebih dari tanggal jatuh tempo'
        }
      });
    }
    
    // Extract payment type
    let payment_type = '';
    if (editedData.output && editedData.output.tipe_pembayaran && editedData.output.tipe_pembayaran.value) {
      payment_type = editedData.output.tipe_pembayaran.value;
    } else if (editedData.payment_type) {
      payment_type = editedData.payment_type;
    }
    
    // Extract tax inclusion
    let include_tax = false;
    if (editedData.output && editedData.output.include_ppn && editedData.output.include_ppn.value !== undefined) {
      include_tax = Boolean(editedData.output.include_ppn.value);
    } else if (editedData.include_tax !== undefined) {
      include_tax = Boolean(editedData.include_tax);
    }
    
    // Extract salesman
    let salesman = '';
    if (editedData.output && editedData.output.salesman && editedData.output.salesman.value) {
      salesman = editedData.output.salesman.value;
    } else if (editedData.salesman) {
      salesman = editedData.salesman;
    }
    
    // Extract tax rate
    let tax_rate = 11.0; // Default PPN rate
    if (editedData.output && editedData.output.ppn_rate && editedData.output.ppn_rate.value) {
      tax_rate = parseFloat(editedData.output.ppn_rate.value) || 11.0;
    } else if (editedData.tax_rate !== undefined) {
      tax_rate = parseFloat(editedData.tax_rate) || 11.0;
    }
    
    // Process items - Format them according to the frontend's expected structure
    let sourceItems = [];
    
    if (editedData.output && editedData.output.items && Array.isArray(editedData.output.items)) {
      sourceItems = editedData.output.items;
    } else if (editedData.items && Array.isArray(editedData.items)) {
      sourceItems = editedData.items;
    }
    
    // Create items in the format expected by the frontend
    const items = sourceItems.map((item, index) => {
      return {
        id: index + 1,
        product_code: item.kode_barang_invoice?.value || item.code || '',
        product_name: item.nama_barang_invoice?.value || item.name || '',
        quantity: parseFloat(item.qty?.value || item.quantity || 0),
        unit: item.satuan?.value || item.unit || '',
        price: parseFloat(item.harga_satuan?.value || item.price || 0),
        total: parseFloat(item.jumlah_netto?.value || item.total || 0)
      };
    });
    
    console.log(`[${requestId}] Processed invoice data:`, {
      invoice_number,
      supplier_name,
      invoice_date: invoice_date ? invoice_date.toISOString() : null,
      due_date: due_date ? due_date.toISOString() : null,
      payment_type,
      include_tax,
      salesman,
      tax_rate,
      items_count: items.length
    });
    
    // Process image data if provided
    let binary_image_data = null;
    let image_content_type = null;

    if (imageData) {
      try {
        // Check if the image data is a base64 string
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
          // Extract content type and base64 data
          const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            image_content_type = matches[1];
            const base64Data = matches[2];
            binary_image_data = Buffer.from(base64Data, 'base64');
            
            console.log(`[${requestId}] Image decoded successfully. Content type: ${image_content_type}, Size: ${binary_image_data.length} bytes`);
          } else {
            console.log(`[${requestId}] Invalid base64 image format`);
          }
        } else {
          console.log(`[${requestId}] Invalid base64 image format`);
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing image data:`, error);
        // Continue without image if there's an error
        binary_image_data = null;
        image_content_type = null;
      }
    }
    
    // Use a transaction for database operations
    const result = await sequelize.transaction(async (transaction) => {
      // Check if invoice already exists and handle duplicate invoice numbers
      let existing_invoice = await ProcessedInvoice.findOne({
        where: { invoice_number },
        transaction
      });
      
      // If invoice number already exists, add a suffix (-2, -3, etc.)
      if (existing_invoice) {
        console.log(`[${requestId}] Invoice number ${invoice_number} already exists, generating a new one`);
        
        // Find all invoices with the same base number
        const similarInvoices = await ProcessedInvoice.findAll({
          where: {
            invoice_number: {
              [Op.like]: `${base_invoice_number}%`
            }
          },
          transaction
        });
        
        if (similarInvoices.length > 0) {
          // Find the highest suffix number
          let maxSuffix = 1;
          
          for (const inv of similarInvoices) {
            const match = inv.invoice_number.match(new RegExp(`${base_invoice_number}-([0-9]+)$`));
            if (match && match[1]) {
              const suffix = parseInt(match[1], 10);
              if (suffix >= maxSuffix) {
                maxSuffix = suffix + 1;
              }
            }
          }
          
          // Generate new invoice number with suffix
          invoice_number = `${base_invoice_number}-${maxSuffix}`;
          console.log(`[${requestId}] Generated new invoice number: ${invoice_number}`);
          
          // Check if the new number also exists (just to be safe)
          existing_invoice = await ProcessedInvoice.findOne({
            where: { invoice_number },
            transaction
          });
        }
      }
      
      let invoice_id;
      
      if (existing_invoice) {
        // Update existing invoice
        console.log(`[${requestId}] Updating existing invoice: ${existing_invoice.id}`);
        
        const update_values = {
          document_type: 'Invoice',
          supplier_name,
          invoice_date,
          due_date,
          payment_type,
          include_tax,
          salesman,
          tax_rate,
          items, // Store as JSON object
          updated_at: new Date()
        };
        
        // Add binary image data if available
        if (binary_image_data) {
          update_values.image_data = binary_image_data;
          update_values.image_content_type = image_content_type;
        }
        
        await existing_invoice.update(update_values, { transaction });
        
        // Update raw OCR data if it exists
        const existing_raw = await RawOCRData.findOne({
          where: { invoice_number },
          transaction
        });
        
        if (existing_raw) {
          await existing_raw.update({
            invoice_date: raw_ocr_invoice_date,
            raw_data: originalData,
            updated_at: new Date()
          }, { transaction });
        } else {
          // Create raw OCR data if it doesn't exist
          await RawOCRData.create({
            invoice_number,
            invoice_date: raw_ocr_invoice_date,
            raw_data: originalData,
            processed_invoice_id: existing_invoice.id
          }, { transaction });
        }
        
        invoice_id = existing_invoice.id;
      } else {
        // Create new processed invoice
        console.log(`[${requestId}] Creating new invoice with number: ${invoice_number}`);
        
        const new_invoice_data = {
          invoice_number,
          document_type: 'Invoice',
          supplier_name,
          invoice_date,
          due_date,
          payment_type,
          include_tax,
          salesman,
          tax_rate,
          items // Store as JSON object
        };
        
        // Add binary image data if available
        if (binary_image_data) {
          new_invoice_data.image_data = binary_image_data;
          new_invoice_data.image_content_type = image_content_type;
        }
        
        const new_invoice = await ProcessedInvoice.create(new_invoice_data, { transaction });
        
        // Create raw OCR data
        await RawOCRData.create({
          invoice_number,
          invoice_date: raw_ocr_invoice_date, // Use the non-null date
          raw_data: originalData,
          processed_invoice_id: new_invoice.id
        }, { transaction });
        
        invoice_id = new_invoice.id;
      }
      
      // Update product data
      await updateProductData(editedData, requestId);
      
      return { id: invoice_id, invoice_number };
    });
    
    console.log(`[${requestId}] OCR data saved successfully. Invoice ID: ${result.id}, Invoice Number: ${result.invoice_number}`);
    
    res.status(200).json({
      success: true,
      data: {
        id: result.id,
        invoice_number: result.invoice_number,
        saved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Error saving OCR data:`, error);
    
    res.status(500).json({
      error: {
        message: `Failed to save OCR data: ${error.message}`,
        detail: error.stack
      }
    });
  }
};

/**
 * Get OCR results for an invoice
 */
exports.getOcrResults = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { invoice_number } = req.params;
  console.log(`[${requestId}] Getting OCR results for invoice: ${invoice_number}`);
  
  try {
    const raw_data = await RawOCRData.findOne({
      where: { invoice_number },
      include: [
        {
          model: ProcessedInvoice,
          as: 'processed_invoice'
        }
      ]
    });
    
    if (!raw_data) {
      console.log(`[${requestId}] OCR data not found for invoice: ${invoice_number}`);
      return res.status(404).json({
        error: {
          message: 'OCR data not found for this invoice'
        }
      });
    }
    
    console.log(`[${requestId}] OCR data found for invoice: ${invoice_number}`);
    res.json(raw_data);
  } catch (error) {
    console.error(`[${requestId}] Error getting OCR results:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving OCR results',
        details: error.message
      }
    });
  }
};

/**
 * Upload file for OCR processing
 */
exports.uploadFile = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Processing file upload for OCR`);
  
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'No file uploaded'
        }
      });
    }
    
    console.log(`[${requestId}] File received in memory: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
    // File is now in memory (req.file.buffer) and not saved to disk
    // In real implementation, you would process the buffer directly
    
    res.status(200).json({
      success: true,
      file: {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        // No path is returned since file is not saved to disk
        inMemory: true
      },
      message: 'File received in memory successfully. Ready for processing when save data is pressed.'
    });
  } catch (error) {
    console.error(`[${requestId}] Error processing uploaded file:`, error);
    res.status(500).json({
      error: {
        message: 'Error processing uploaded file',
        details: error.message
      }
    });
  }
};

/**
 * Test database connection
 */
exports.testConnection = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Testing database connection`);
  
  try {
    // Test database connection
    await sequelize.authenticate();
    
    // Test file system access
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Check if directory is writable
    const testFile = path.join(uploadDir, 'test.txt');
    fs.writeFileSync(testFile, 'Test file');
    fs.unlinkSync(testFile);
    
    console.log(`[${requestId}] Connection test successful`);
    
    res.status(200).json({
      success: true,
      database: 'Connected',
      filesystem: 'Writable',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${requestId}] Connection test failed:`, error);
    res.status(500).json({
      error: {
        message: 'Connection test failed',
        details: error.message
      }
    });
  }
};

/**
 * Queue a file for OCR processing
 */
exports.queueFileForProcessing = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Queueing file for OCR processing`);
  
  try {
    // Validasi file exists
    if (!req.file) {
      return res.status(400).json({ 
        error: 'File not provided' 
      });
    }
    
    console.log(`[${requestId}] Received file for queue: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
    // Validasi file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, JPG, PNG, and PDF files are allowed.'
      });
    }
    
    // Validasi file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File size too large. Maximum allowed size is 25MB.'
      });
    }
    
    // Instead of passing the path, we pass the buffer from memory
    // The file is not saved to disk until save data is clicked
    const fileId = queueService.queueBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    
    res.status(200).json({ 
      success: true,
      fileId: fileId,
      message: 'File added to processing queue. It will be processed when save data is clicked.' 
    });
    
    console.log(`[${requestId}] File queued successfully with ID: ${fileId}`);
    
  } catch (error) {
    console.error(`[${requestId}] Error queueing file:`, error);
    res.status(500).json({ 
      error: 'Failed to queue file for processing',
      details: error.message
    });
  }
};

/**
 * Get processing status of a file
 */
exports.getFileStatus = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { fileId } = req.params;
  console.log(`[${requestId}] Getting status for file: ${fileId}`);
  
  try {
    const status = queueService.getFileStatus(fileId);
    res.json(status);
  } catch (error) {
    console.error(`[${requestId}] Error getting file status:`, error);
    res.status(500).json({
      error: {
        message: 'Error getting file status',
        details: error.message
      }
    });
  }
};

/**
 * Trigger processing of a queued file
 */
exports.processQueuedFile = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { fileId } = req.params;
  
  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: 'File ID is required'
    });
  }
  
  console.log(`[${requestId}] Processing queued file with ID: ${fileId}`);
  
  try {
    // Check if file exists in queue
    const status = queueService.getFileStatus(fileId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({
        success: false,
        message: 'File not found in queue'
      });
    }
    
    if (status.status === 'processing') {
      return res.status(409).json({
        success: false,
        message: 'File is already being processed',
        status
      });
    }
    
    if (status.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'File has already been processed',
        result: status.result
      });
    }
    
    // Process the file
    queueService.processQueuedFile(fileId)
      .then(result => {
        console.log(`[${requestId}] File processed successfully`);
      })
      .catch(error => {
        console.error(`[${requestId}] Error processing file:`, error);
      });
    
    // Return immediately with status "processing" to allow async processing
    res.status(202).json({
      success: true,
      message: 'File processing started',
      fileId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error starting file processing:`, error);
    res.status(500).json({
      success: false,
      message: 'Error starting file processing',
      error: error.message
    });
  }
};

/**
 * Get all processing statuses
 */
exports.getAllStatuses = async (req, res) => {
  try {
    const statuses = queueService.getAllStatuses();
    
    // Log statuses for debugging
    console.log(`Returning ${statuses.length} status items`);
    
    // Ensure consistent structure in response
    res.status(200).json({ 
      success: true, 
      statuses 
    });
  } catch (error) {
    console.error('Error getting all statuses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting all statuses', 
      error: error.message 
    });
  }
};
