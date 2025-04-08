/**
 * Controller for invoice management operations
 */
const { ProcessedInvoice, RawOCRData } = require('../models');
const { Op } = require('sequelize');
const uuid = require('uuid');
const { sequelize } = require('../config/database'); // Fixed import path

/**
 * Get all invoices with optional pagination
 */
exports.getAllInvoices = async (req, res) => {
  const requestId = req.id || uuid.v4();
  console.log(`[${requestId}] Getting all invoices (basic fields only)`);
  
  try {
    const { page, limit } = req.query;
    let options = {};
    
    // Apply pagination if provided
    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      options = {
        offset,
        limit: parseInt(limit)
      };
    }
    
    // Get all invoices with basic fields - Reverted to original selection
    const invoices = await ProcessedInvoice.findAll({
      attributes: [ // Select only the original basic fields
        'id', 
        'invoice_number', 
        'supplier_name', 
        'invoice_date', 
        'due_date', 
        'include_tax', 
        'tax_rate', 
        'document_type', 
        'salesman',
        'items', // Include the raw items JSON field again
        'payment_type',
        'created_at', 
        'updated_at'
      ],
      // Removed include for ProcessedInvoiceItem
      order: [['created_at', 'DESC']],
      ...options
    });
    
    console.log(`[${requestId}] Found ${invoices.length} invoices (basic fields)`);
    
    // Format response data - Reverted to original mapping
    const formattedInvoices = invoices.map(invoice => {
      const plainInvoice = invoice.get({ plain: true });
      
      // Basic validation for items field (ensure it's string or null)
      let itemsData = plainInvoice.items;
      if (itemsData && typeof itemsData !== 'string') {
          try {
              itemsData = JSON.stringify(itemsData);
          } catch (e) {
              console.warn(`[${requestId}] Failed to stringify items for invoice ${plainInvoice.id}, setting to null.`);
              itemsData = null;
          }
      } else if (!itemsData) {
           itemsData = null; // Ensure null if falsy
      }
      
      return {
        id: plainInvoice.id,
        invoice_number: plainInvoice.invoice_number,
        supplier_name: plainInvoice.supplier_name,
        invoice_date: plainInvoice.invoice_date,
        due_date: plainInvoice.due_date,
        include_tax: plainInvoice.include_tax,
        tax_rate: plainInvoice.tax_rate,
        document_type: plainInvoice.document_type,
        salesman: plainInvoice.salesman,
        items: itemsData, // Use the raw items JSON field
        payment_type: plainInvoice.payment_type,
        created_at: plainInvoice.created_at,
        updated_at: plainInvoice.updated_at
      };
    });
    
    // Return success response with invoices data
    return res.json({
      success: true,
      data: formattedInvoices,
      message: 'Invoices retrieved successfully (basic fields)'
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting all invoices (basic):`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving invoices (basic)',
        details: error.message,
        stack: error.stack 
      }
    });
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  const requestId = req.id || uuid.v4();
  const { id } = req.params;
  console.log(`[${requestId}] Getting invoice by ID: ${id}`);
  
  try {
    const invoice = await ProcessedInvoice.findByPk(id);
    
    if (!invoice) {
      console.log(`[${requestId}] Invoice not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    console.log(`[${requestId}] Found invoice: ${invoice.invoice_number}`);
    
    // Format invoice data
    const formattedInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier_name,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      include_tax: invoice.include_tax,
      tax_rate: invoice.tax_rate,
      document_type: invoice.document_type,
      salesman: invoice.salesman,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
    
    // Return success response with invoice data
    return res.json({
      success: true,
      data: formattedInvoice,
      message: 'Invoice retrieved successfully'
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting invoice by ID:`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving invoice',
        details: error.message
      }
    });
  }
};

/**
 * Create new invoice
 */
exports.createInvoice = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Creating new invoice`);
  
  try {
    // Validate required fields
    const { invoice_number, supplier_name, invoice_date } = req.body;
    if (!invoice_number) {
      return res.status(400).json({
        error: {
          message: 'Invoice number is required'
        }
      });
    }
    
    // Check if invoice already exists
    const existing = await ProcessedInvoice.findOne({
      where: { invoice_number }
    });
    
    if (existing) {
      console.log(`[${requestId}] Invoice with number ${invoice_number} already exists`);
      return res.status(400).json({
        error: {
          message: 'Invoice with this number already exists'
        }
      });
    }
    
    // Process image data if sent as base64 string
    if (req.body.image_data) {
      // Extract content type and binary data
      const image_data_parts = req.body.image_data.split(';base64,');
      if (image_data_parts.length === 2) {
        const content_type_part = image_data_parts[0];
        const base64_data = image_data_parts[1];
        
        // Extract content type (e.g., 'image/jpeg')
        req.body.image_content_type = content_type_part.replace('data:', '');
        
        // Decode base64 to binary
        req.body.image_data = Buffer.from(base64_data, 'base64');
        
        console.log(`[${requestId}] Processed image data from base64, size: ${req.body.image_data.length} bytes`);
      }
    }
    
    // Create new invoice
    const newInvoice = await ProcessedInvoice.create(req.body);
    console.log(`[${requestId}] Created new invoice with ID: ${newInvoice.id}`);
    
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error(`[${requestId}] Error creating invoice:`, error);
    res.status(500).json({
      error: {
        message: 'Error creating invoice',
        details: error.message
      }
    });
  }
};

/**
 * Update existing invoice
 */
exports.updateInvoice = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Updating invoice with ID: ${id}`);
  
  try {
    // Check if invoice exists
    const invoice = await ProcessedInvoice.findByPk(id);
    
    if (!invoice) {
      console.log(`[${requestId}] Invoice not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    // Process image data if sent as base64 string
    if (req.body.image_data) {
      // Extract content type and binary data
      const image_data_parts = req.body.image_data.split(';base64,');
      if (image_data_parts.length === 2) {
        const content_type_part = image_data_parts[0];
        const base64_data = image_data_parts[1];
        
        // Extract content type (e.g., 'image/jpeg')
        req.body.image_content_type = content_type_part.replace('data:', '');
        
        // Decode base64 to binary
        req.body.image_data = Buffer.from(base64_data, 'base64');
        
        console.log(`[${requestId}] Processed image data from base64, size: ${req.body.image_data.length} bytes`);
      }
    }
    
    // Update invoice
    await invoice.update(req.body);
    console.log(`[${requestId}] Updated invoice: ${id}`);
    
    // Get updated invoice
    const updatedInvoice = await ProcessedInvoice.findByPk(id);
    res.json(updatedInvoice);
  } catch (error) {
    console.error(`[${requestId}] Error updating invoice:`, error);
    res.status(500).json({
      error: {
        message: 'Error updating invoice',
        details: error.message
      }
    });
  }
};

/**
 * Delete invoice
 */
exports.deleteInvoice = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Deleting invoice with ID: ${id}`);
  
  try {
    // Use a transaction to ensure data consistency
    await sequelize.transaction(async (transaction) => {
      // Check if invoice exists
      const invoice = await ProcessedInvoice.findByPk(id, { transaction });
      
      if (!invoice) {
        console.log(`[${requestId}] Invoice not found: ${id}`);
        throw new Error('Invoice not found');
      }
      
      // Get the invoice number to delete related raw OCR data
      const invoiceNumber = invoice.invoice_number;
      console.log(`[${requestId}] Found invoice ${id} with number ${invoiceNumber}`);
      
      // First delete any related raw OCR data
      const rawOcrData = await RawOCRData.findOne({ 
        where: { invoice_number: invoiceNumber },
        transaction
      });
      
      if (rawOcrData) {
        console.log(`[${requestId}] Deleting related raw OCR data for invoice ${invoiceNumber}`);
        await rawOcrData.destroy({ transaction });
      }
      
      // Now delete the invoice
      console.log(`[${requestId}] Deleting invoice ${id}`);
      await invoice.destroy({ transaction });
    });
    
    console.log(`[${requestId}] Successfully deleted invoice: ${id} and its related data`);
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error(`[${requestId}] Error deleting invoice:`, error);
    
    // Determine status code based on error
    const statusCode = error.message === 'Invoice not found' ? 404 : 500;
    
    res.status(statusCode).json({
      error: {
        message: error.message || 'Error deleting invoice',
        details: error.stack
      }
    });
  }
};

/**
 * Get invoice image
 */
exports.getInvoiceImage = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Getting image for invoice with ID: ${id}`);
  
  try {
    const invoice = await ProcessedInvoice.findByPk(id);
    
    if (!invoice) {
      console.log(`[${requestId}] Invoice not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    // If we have binary image data, use it
    if (invoice.image_data && invoice.image_content_type) {
      console.log(`[${requestId}] Returning binary image data for invoice ${id}`);
      
      res.set('Content-Type', invoice.image_content_type);
      return res.send(invoice.image_data);
    }
    
    // Fallback to image path for backward compatibility
    if (invoice.image_path) {
      const path = require('path');
      const fs = require('fs');
      const imagePath = path.resolve(invoice.image_path);
      
      console.log(`[${requestId}] Using image path: ${imagePath}`);
      
      if (fs.existsSync(imagePath)) {
        return res.sendFile(imagePath);
      } else {
        console.log(`[${requestId}] Image file not found: ${imagePath}`);
        return res.status(404).json({
          error: {
            message: 'Invoice image file not found on server'
          }
        });
      }
    }
    
    // No image data or path
    console.log(`[${requestId}] No image available for invoice: ${id}`);
    return res.status(404).json({
      error: {
        message: 'No image available for this invoice'
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Error retrieving invoice image:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving invoice image',
        details: error.message
      }
    });
  }
};

/**
 * Search invoices
 */
exports.searchInvoices = async (req, res) => {
  const requestId = req.id || uuid.v4();
  const { query } = req.params;
  console.log(`[${requestId}] Searching invoices with query: ${query}`);
  
  try {
    const invoices = await ProcessedInvoice.findAll({
      where: {
        [Op.or]: [
          { invoice_number: { [Op.iLike]: `%${query}%` } },
          { supplier_name: { [Op.iLike]: `%${query}%` } },
          { document_type: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['created_at', 'DESC']],
      limit: 20
    });
    
    console.log(`[${requestId}] Found ${invoices.length} invoices matching query`);
    
    // Format response data
    const formattedInvoices = invoices.map(invoice => {
      const plainInvoice = invoice.get({ plain: true });
      return {
        id: plainInvoice.id,
        invoice_number: plainInvoice.invoice_number,
        supplier_name: plainInvoice.supplier_name,
        invoice_date: plainInvoice.invoice_date,
        due_date: plainInvoice.due_date,
        include_tax: plainInvoice.include_tax,
        tax_rate: plainInvoice.tax_rate,
        document_type: plainInvoice.document_type,
        salesman: plainInvoice.salesman,
        createdAt: plainInvoice.created_at,
        updatedAt: plainInvoice.updated_at
      };
    });
    
    // Return success response with search results
    return res.json({
      success: true,
      data: formattedInvoices,
      message: 'Invoices search completed successfully'
    });
  } catch (error) {
    console.error(`[${requestId}] Error searching invoices:`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error searching invoices',
        details: error.message
      }
    });
  }
};

/**
 * Get invoice details by ID
 * GET /api/invoices/:id/details
 */
exports.getInvoiceDetails = async (req, res) => {
  const requestId = req.id || uuid.v4();
  const { id } = req.params;
  console.log(`[${requestId}] Getting invoice details by ID: ${id}`);
  
  try {
    // First find the invoice
    const invoice = await ProcessedInvoice.findByPk(id);
    
    if (!invoice) {
      console.log(`[${requestId}] Invoice not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    console.log(`[${requestId}] Found invoice: ${invoice.invoice_number}`);
    
    // Then find related items
    let items = [];
    try {
      items = await ProcessedInvoiceItem.findAll({
        where: { invoice_id: id }
      });
      console.log(`[${requestId}] Found ${items.length} items for invoice ${id}`);
    } catch (itemError) {
      console.error(`[${requestId}] Error finding invoice items:`, itemError);
      // Continue with empty items array
    }
    
    // If no items are found, return an empty array
    if (!items || items.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No items found for this invoice'
      });
    }
    
    // Format item data
    const formattedItems = items.map(item => {
      const plainItem = item.get({ plain: true });
      return {
        id: plainItem.id,
        invoice_id: plainItem.invoice_id,
        product_code: plainItem.product_code,
        product_name: plainItem.product_name,
        quantity: plainItem.quantity,
        unit: plainItem.unit,
        base_price: plainItem.base_price,
        price_increase_percent: plainItem.price_increase_percent,
        price_increase_amount: plainItem.price_increase_amount,
        suggested_increase_percent: plainItem.suggested_increase_percent,
        suggested_increase_amount: plainItem.suggested_increase_amount,
        discount: plainItem.discount,
        total_price: plainItem.total_price,
        
        // Include alternative field names for compatibility
        kode_barang: plainItem.product_code,
        nama_barang: plainItem.product_name,
        qty: plainItem.quantity,
        satuan: plainItem.unit,
        harga_pokok: plainItem.base_price,
        kenaikan_persen: plainItem.price_increase_percent,
        kenaikan_rp: plainItem.price_increase_amount,
        saran_kenaikan_persen: plainItem.suggested_increase_percent,
        saran_kenaikan_rp: plainItem.suggested_increase_amount,
        diskon_persen: plainItem.discount,
        total: plainItem.total_price
      };
    });
    
    // Return success response with item data
    return res.json({
      success: true,
      data: formattedItems,
      message: 'Invoice details retrieved successfully'
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting invoice details:`, error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving invoice details',
        details: error.message
      }
    });
  }
};
