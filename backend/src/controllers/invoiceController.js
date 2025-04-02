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
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Getting all invoices`);
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const invoices = await ProcessedInvoice.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });
    
    console.log(`[${requestId}] Found ${invoices.count} invoices`);
    
    // Format the response data to ensure items are in the correct format
    const formattedInvoices = invoices.rows.map(invoice => {
      const plainInvoice = invoice.get({ plain: true });
      
      // Ensure items is an array
      if (!plainInvoice.items) {
        plainInvoice.items = [];
      }
      
      // Format each item to match the frontend's expected structure
      if (Array.isArray(plainInvoice.items)) {
        plainInvoice.items = plainInvoice.items.map(item => ({
          product_code: item.product_code || item.code || '',
          product_name: item.product_name || item.name || '',
          quantity: parseFloat(item.quantity || 0),
          unit: item.unit || '',
          price: parseFloat(item.price || 0),
          total: parseFloat(item.total || 0)
        }));
      }
      
      return plainInvoice;
    });
    
    res.json({
      total: invoices.count,
      page,
      limit,
      data: formattedInvoices
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting invoices:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving invoices',
        details: error.message
      }
    });
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  
  console.log(`[${requestId}] Getting invoice by ID: ${id}`);
  
  try {
    const invoice = await ProcessedInvoice.findByPk(id);
    
    if (!invoice) {
      console.log(`[${requestId}] Invoice not found with ID: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    // Format the invoice to ensure items are in the correct format
    const plainInvoice = invoice.get({ plain: true });
    
    // Ensure items is an array
    if (!plainInvoice.items) {
      plainInvoice.items = [];
    }
    
    // Format each item to match the frontend's expected structure
    if (Array.isArray(plainInvoice.items)) {
      plainInvoice.items = plainInvoice.items.map(item => ({
        product_code: item.product_code || item.code || '',
        product_name: item.product_name || item.name || '',
        quantity: parseFloat(item.quantity || 0),
        unit: item.unit || '',
        price: parseFloat(item.price || 0),
        total: parseFloat(item.total || 0)
      }));
    }
    
    console.log(`[${requestId}] Found invoice with ID: ${id}`);
    
    res.json(plainInvoice);
  } catch (error) {
    console.error(`[${requestId}] Error getting invoice:`, error);
    res.status(500).json({
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
  const requestId = uuid.v4().substring(0, 8);
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
    
    res.json(invoices);
  } catch (error) {
    console.error(`[${requestId}] Error searching invoices:`, error);
    res.status(500).json({
      error: {
        message: 'Error searching invoices',
        details: error.message
      }
    });
  }
};
