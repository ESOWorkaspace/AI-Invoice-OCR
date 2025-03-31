/**
 * Routes for raw OCR data management
 */
const express = require('express');
const router = express.Router();
const { RawOCRData, ProcessedInvoice } = require('../models');
const { Op } = require('sequelize');
const uuid = require('uuid');

// Get all raw OCR data entries
router.get('/', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Getting all raw OCR data entries`);
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const entries = await RawOCRData.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: ProcessedInvoice,
          as: 'processed_invoice',
          attributes: ['id', 'invoice_number', 'supplier_name']
        }
      ]
    });
    
    console.log(`[${requestId}] Found ${entries.count} raw OCR data entries`);
    
    res.json({
      total: entries.count,
      page,
      limit,
      data: entries.rows
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving raw OCR data',
        details: error.message
      }
    });
  }
});

// Get raw OCR data by ID
router.get('/:id', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Getting raw OCR data with ID: ${id}`);
  
  try {
    const entry = await RawOCRData.findByPk(id, {
      include: [
        {
          model: ProcessedInvoice,
          as: 'processed_invoice',
          attributes: ['id', 'invoice_number', 'supplier_name', 'invoice_date']
        }
      ]
    });
    
    if (!entry) {
      console.log(`[${requestId}] Raw OCR data not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Raw OCR data not found'
        }
      });
    }
    
    console.log(`[${requestId}] Successfully retrieved raw OCR data: ${id}`);
    res.json(entry);
  } catch (error) {
    console.error(`[${requestId}] Error getting raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving raw OCR data',
        details: error.message
      }
    });
  }
});

// Get raw OCR data by invoice number
router.get('/invoice/:invoice_number', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { invoice_number } = req.params;
  console.log(`[${requestId}] Getting raw OCR data for invoice: ${invoice_number}`);
  
  try {
    const entry = await RawOCRData.findOne({
      where: { invoice_number },
      include: [
        {
          model: ProcessedInvoice,
          as: 'processed_invoice',
          attributes: ['id', 'invoice_number', 'supplier_name', 'invoice_date']
        }
      ]
    });
    
    if (!entry) {
      console.log(`[${requestId}] Raw OCR data not found for invoice: ${invoice_number}`);
      return res.status(404).json({
        error: {
          message: 'Raw OCR data not found for the specified invoice'
        }
      });
    }
    
    console.log(`[${requestId}] Successfully retrieved raw OCR data for invoice: ${invoice_number}`);
    res.json(entry);
  } catch (error) {
    console.error(`[${requestId}] Error getting raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error retrieving raw OCR data',
        details: error.message
      }
    });
  }
});

// Create raw OCR data entry
router.post('/', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  console.log(`[${requestId}] Creating new raw OCR data entry`);
  
  try {
    const { invoice_number, invoice_date, raw_data, processed_invoice_id } = req.body;
    
    // Validate required fields
    if (!invoice_number || !raw_data) {
      return res.status(400).json({
        error: {
          message: 'Invoice number and raw data are required'
        }
      });
    }
    
    // Create new entry
    const entry = await RawOCRData.create({
      invoice_number,
      invoice_date: invoice_date || new Date(),
      raw_data,
      processed_invoice_id
    });
    
    console.log(`[${requestId}] Successfully created raw OCR data: ${entry.id}`);
    res.status(201).json(entry);
  } catch (error) {
    console.error(`[${requestId}] Error creating raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error creating raw OCR data',
        details: error.message
      }
    });
  }
});

// Update raw OCR data entry
router.put('/:id', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Updating raw OCR data with ID: ${id}`);
  
  try {
    const { invoice_number, invoice_date, raw_data, processed_invoice_id } = req.body;
    
    // Find the entry
    const entry = await RawOCRData.findByPk(id);
    
    if (!entry) {
      console.log(`[${requestId}] Raw OCR data not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Raw OCR data not found'
        }
      });
    }
    
    // Update the entry
    await entry.update({
      invoice_number: invoice_number || entry.invoice_number,
      invoice_date: invoice_date || entry.invoice_date,
      raw_data: raw_data || entry.raw_data,
      processed_invoice_id: processed_invoice_id || entry.processed_invoice_id,
      updated_at: new Date()
    });
    
    console.log(`[${requestId}] Successfully updated raw OCR data: ${id}`);
    res.json(entry);
  } catch (error) {
    console.error(`[${requestId}] Error updating raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error updating raw OCR data',
        details: error.message
      }
    });
  }
});

// Delete raw OCR data entry
router.delete('/:id', async (req, res) => {
  const requestId = uuid.v4().substring(0, 8);
  const { id } = req.params;
  console.log(`[${requestId}] Deleting raw OCR data with ID: ${id}`);
  
  try {
    const entry = await RawOCRData.findByPk(id);
    
    if (!entry) {
      console.log(`[${requestId}] Raw OCR data not found: ${id}`);
      return res.status(404).json({
        error: {
          message: 'Raw OCR data not found'
        }
      });
    }
    
    await entry.destroy();
    console.log(`[${requestId}] Successfully deleted raw OCR data: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error(`[${requestId}] Error deleting raw OCR data:`, error);
    res.status(500).json({
      error: {
        message: 'Error deleting raw OCR data',
        details: error.message
      }
    });
  }
});

module.exports = router;
