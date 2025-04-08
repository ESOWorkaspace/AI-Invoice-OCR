/**
 * Queue service for asynchronous file processing
 */
const Queue = require('better-queue');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { ProcessedInvoice, RawOCRData } = require('../models');

// Store processing status and results
const processingStatus = new Map();

// Get OCR API configuration from environment variables
const OCR_API_ENDPOINT = process.env.OCR_API_ENDPOINT || 'http://localhost:1880/testingupload';
const OCR_API_TOKEN = process.env.OCR_API_TOKEN || 'a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8';
const FALLBACK_OCR_API_ENDPOINT = process.env.FALLBACK_OCR_API_ENDPOINT || 'http://localhost:1880/testingupload';
const MAX_RETRIES = 2; // Number of retry attempts before falling back

// Development mode flag
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
// Use mock data only as fallback, not by default
const USE_MOCK_DATA = IS_DEV_MODE && process.env.USE_MOCK_DATA === 'true';

// Log configuration
console.log('Queue Service Configuration:', {
  OCR_API_ENDPOINT,
  OCR_API_TOKEN: OCR_API_TOKEN ? '***' : 'undefined', // Mask token for security
  FALLBACK_OCR_API_ENDPOINT,
  MAX_RETRIES,
  IS_DEV_MODE,
  USE_MOCK_DATA
});

// Function to check if file is image
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
}

// Function to convert file to base64
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Function to send notification for failed OCR requests
async function sendFailureNotification(fileId, filename, error, retryCount) {
  try {
    console.log(`[Queue:${fileId}] NOTIFICATION: OCR processing failed after ${retryCount} retries for file ${filename}`);
    console.log(`[Queue:${fileId}] NOTIFICATION: Error details: ${error.message}`);
    
    // Here you could implement additional notification methods:
    // - Send email notification
    // - Send webhook to external service
    // - Log to dedicated error tracking system
    // - Store in database for admin dashboard
    
    // For now, we'll just log it prominently
    console.error(`
      =======================================================
      ⚠️ CRITICAL: OCR PROCESSING FAILED AFTER ${retryCount} RETRIES ⚠️
      File ID: ${fileId}
      Filename: ${filename}
      Error: ${error.message}
      Timestamp: ${new Date().toISOString()}
      =======================================================
    `);
  } catch (notifyError) {
    console.error(`[Queue:${fileId}] Error sending failure notification:`, notifyError);
  }
}

// Create processing queue
const processingQueue = new Queue(async (task, cb) => {
  try {
    const { fileId, filePath, originalname } = task;
    
    // Store original file information for correlation
    const fileInfo = {
      id: fileId,
      name: originalname,
      path: filePath
    };
    
    // Update status to processing
    updateStatus(fileId, 'processing', null, 0, fileInfo);
    
    // Setup progress tracking
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress <= 90) { // Cap at 90% until we get actual results
        updateStatus(fileId, 'processing', null, progress, fileInfo);
      } else {
        clearInterval(progressInterval);
      }
    }, 1000);
    
    // Process the file with actual OCR API
    try {
      // In development mode, optionally skip real API call and use mock data directly
      if (USE_MOCK_DATA) {
        console.log(`[Queue:${fileId}] Development mode: Using mock data directly`);
        
        // Create mock OCR result
        const mockResult = createMockResult(fileId, originalname);
        
        // Clean up progress interval
        clearInterval(progressInterval);
        
        // Update status to completed with mock results
        updateStatus(fileId, 'completed', mockResult, 100, fileInfo);
        cb(null, mockResult);
        
        // Clean up the temporary file
        try {
          fs.unlinkSync(filePath);
          console.log(`[Queue:${fileId}] Temporary file deleted: ${filePath}`);
        } catch (err) {
          console.error(`[Queue:${fileId}] Error deleting temporary file:`, err);
        }
        
        return; // Skip actual API call
      }
    
      // Create form data for API request
      const formData = new FormData();
      
      // Add file to FormData without additional manipulation
      const fileStream = fs.createReadStream(filePath);
      formData.append('file', fileStream);
      
      console.log(`[Queue:${fileId}] Starting OCR API request to: ${OCR_API_ENDPOINT}`);
      console.log(`[Queue:${fileId}] File: ${originalname}`);
      
      // Implement retry logic with API call
      let retryCount = 0;
      let lastError = null;
      let successful = false;
      let ocrData = null;
      
      // Try up to MAX_RETRIES times
      while (retryCount <= MAX_RETRIES && !successful) {
        try {
          if (retryCount > 0) {
            console.log(`[Queue:${fileId}] Retry attempt ${retryCount}/${MAX_RETRIES} for OCR API request`);
            // Reset the file stream for retry
            formData.delete('file');
            const newFileStream = fs.createReadStream(filePath);
            formData.append('file', newFileStream);
          }
          
          // Send request to OCR API
          const response = await axios.post(OCR_API_ENDPOINT, formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': OCR_API_TOKEN
            },
            timeout: 600000, // 10 minutes timeout for OCR processing
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });
          
          // Process OCR results
          ocrData = response.data;
          
          // Log response for debugging
          console.log(`[Queue:${fileId}] OCR API Response status: ${response.status}`);
          console.log(`[Queue:${fileId}] OCR API Response type: ${typeof ocrData}`);
          console.log(`[Queue:${fileId}] OCR API Response snippet:`, 
            JSON.stringify(ocrData).substring(0, 300) + '...');
          
          successful = true;
        } catch (error) {
          lastError = error;
          console.error(`[Queue:${fileId}] Error calling OCR API (attempt ${retryCount+1}/${MAX_RETRIES+1}):`, error.message);
          
          // Check if the API returned a response despite the error
          if (error.response) {
            console.log(`[Queue:${fileId}] API Error Status:`, error.response.status);
            console.log(`[Queue:${fileId}] API Error Data:`, error.response.data);
          }
          
          // Increment retry count
          retryCount++;
        }
      }
      
      // If all retries failed, try fallback API
      if (!successful) {
        console.error(`[Queue:${fileId}] All ${MAX_RETRIES+1} attempts to OCR API failed`);
        
        // Send notification about the failure
        await sendFailureNotification(fileId, originalname, lastError, MAX_RETRIES+1);
        
        // Try fallback API if available and different from main API
        if (OCR_API_ENDPOINT !== FALLBACK_OCR_API_ENDPOINT) {
          console.log(`[Queue:${fileId}] Trying fallback OCR API: ${FALLBACK_OCR_API_ENDPOINT}`);
          
          try {
            // Reset stream because it was consumed in previous attempts
            formData.delete('file');
            const fileStream2 = fs.createReadStream(filePath);
            formData.append('file', fileStream2);
            
            const fallbackResponse = await axios.post(FALLBACK_OCR_API_ENDPOINT, formData, {
              headers: {
                ...formData.getHeaders(),
                'Authorization': OCR_API_TOKEN
              },
              timeout: 600000 // 10 minutes timeout
            });
            
            // Process fallback response
            ocrData = fallbackResponse.data;
            successful = true;
            
            console.log(`[Queue:${fileId}] Fallback OCR API succeeded`);
          } catch (fallbackError) {
            console.error(`[Queue:${fileId}] Fallback OCR API also failed:`, fallbackError.message);
            lastError = fallbackError;
            
            // Send additional notification for fallback failure
            await sendFailureNotification(fileId, originalname, fallbackError, MAX_RETRIES+2);
            
            // If everything failed, use mock data in dev mode or report error in prod
            if (IS_DEV_MODE) {
              console.log(`[Queue:${fileId}] Using mock data as last resort fallback`);
              const mockResult = createMockResult(fileId, originalname);
              clearInterval(progressInterval);
              updateStatus(fileId, 'completed', mockResult, 100, fileInfo);
              cb(null, mockResult);
            } else {
              // In prod, don't use mock data, just report the error
              clearInterval(progressInterval);
              updateStatus(fileId, 'error', { message: lastError.message }, 0);
              cb(lastError);
            }
            return;
          }
        } else {
          // If there's no separate fallback API, use mock data in dev mode or report error in prod
          if (IS_DEV_MODE) {
            console.log(`[Queue:${fileId}] Using mock data as last resort fallback`);
            const mockResult = createMockResult(fileId, originalname);
            clearInterval(progressInterval);
            updateStatus(fileId, 'completed', mockResult, 100, fileInfo);
            cb(null, mockResult);
          } else {
            // In prod, don't use mock data, just report the error
            clearInterval(progressInterval);
            updateStatus(fileId, 'error', { message: lastError.message }, 0);
            cb(lastError);
          }
          return;
        }
      }
      
      // Process the OCR data (successful case)
      // Find the item with output property or create a new one
      let processedOcrData;
      if (Array.isArray(ocrData)) {
        // Find element with output property
        const outputItem = ocrData.find(item => item.output);
        if (outputItem) {
          console.log(`[Queue:${fileId}] Found item with output property in array`);
          processedOcrData = outputItem;
        } else {
          // Merge all array items into one object with output property
          console.log(`[Queue:${fileId}] Creating structured output from array items`);
          processedOcrData = {
            output: {
              // Add essential properties if found in any array element
              nomor_referensi: findPropertyInArray(ocrData, 'nomor_referensi') || { value: `INV-${Date.now()}`, is_confident: false },
              nama_supplier: findPropertyInArray(ocrData, 'nama_supplier') || { value: "Unknown Supplier", is_confident: false },
              tanggal_faktur: findPropertyInArray(ocrData, 'tanggal_faktur') || { value: new Date().toISOString().split('T')[0], is_confident: false },
              tgl_jatuh_tempo: findPropertyInArray(ocrData, 'tgl_jatuh_tempo') || { value: "", is_confident: false },
              items: []
            }
          };
          
          // Add any properties from third element which typically has items
          if (ocrData[2] && ocrData[2].output && Array.isArray(ocrData[2].output.items)) {
            processedOcrData.output.items = ocrData[2].output.items;
          }
        }
      } else {
        // Process single object
        console.log(`[Queue:${fileId}] Processing single object response`);
        processedOcrData = ocrData;
      }

      // Ensure output property exists
      if (!processedOcrData.output) {
        console.log(`[Queue:${fileId}] Adding missing output property`);
        processedOcrData = {
          output: {
            // Copy any properties from original data
            ...(typeof processedOcrData === 'object' ? processedOcrData : {}),
            // Ensure items array exists
            items: []
          }
        };
      }

      // Ensure essential properties exist in output
      if (!processedOcrData.output.nomor_referensi) {
        processedOcrData.output.nomor_referensi = { 
          value: `INV-${Date.now()}`, 
          is_confident: true 
        };
      }

      if (!processedOcrData.output.nama_supplier) {
        processedOcrData.output.nama_supplier = { 
          value: "Unknown Supplier", 
          is_confident: false 
        };
      }

      if (!processedOcrData.output.tanggal_faktur) {
        processedOcrData.output.tanggal_faktur = { 
          value: new Date().toISOString().split('T')[0], 
          is_confident: false 
        };
      }

      // Ensure items array exists and is an array
      if (!Array.isArray(processedOcrData.output.items)) {
        processedOcrData.output.items = [];
      }

      // Log structured data for debugging
      console.log(`[Queue:${fileId}] Final OCR data structure:`, 
        JSON.stringify({
          hasOutput: true,
          hasNomorReferensi: !!processedOcrData.output.nomor_referensi,
          hasNamaSupplier: !!processedOcrData.output.nama_supplier, 
          hasTanggalFaktur: !!processedOcrData.output.tanggal_faktur,
          hasItems: Array.isArray(processedOcrData.output.items),
          itemCount: processedOcrData.output.items.length
        }));

      // Close progress interval
      clearInterval(progressInterval);

      // Create result object
      const result = {
        id: fileId,
        filename: originalname,
        filePath: filePath,
        processedAt: new Date().toISOString(),
        ocrData: processedOcrData
      };

      // Helper function to find a property in array of objects
      function findPropertyInArray(array, propertyName) {
        for (const item of array) {
          if (item[propertyName]) {
            return item[propertyName];
          }
          if (item.output && item.output[propertyName]) {
            return item.output[propertyName];
          }
        }
        return null;
      }

      // Update status to completed with OCR results
      updateStatus(fileId, 'completed', result, 100, fileInfo);
      cb(null, result);
    } catch (error) {
      console.error(`[Queue:${fileId}] Error processing file:`, error);
      updateStatus(fileId, 'error', { message: error.message }, 0);
      cb(error);
    }
  } catch (error) {
    console.error(`[Queue:${fileId}] Error processing file:`, error);
    updateStatus(fileId, 'error', { message: error.message }, 0);
    cb(error);
  }
}, { concurrent: 3 }); // Allow up to 3 concurrent processing tasks

// Update status function
function updateStatus(fileId, status, result, progress, fileInfo = null) {
  processingStatus.set(fileId, {
    id: fileId,
    status,
    result,
    progress,
    fileInfo,
    updatedAt: new Date().toISOString()
  });
  
  // In a production app, you might emit events via websockets here
}

// Add file to queue
function queueFile(filePath, originalname) {
  const fileId = uuidv4();
  
  // Initialize status
  updateStatus(fileId, 'queued', null, 0, { id: fileId, name: originalname, path: filePath });
  
  // Add to queue
  processingQueue.push({
    fileId,
    filePath,
    originalname
  });
  
  return fileId;
}

// Get status of a specific file
function getFileStatus(fileId) {
  return processingStatus.get(fileId) || { 
    id: fileId,
    status: 'not_found',
    progress: 0
  };
}

// Get all statuses
function getAllStatuses() {
  return Array.from(processingStatus.values());
}

// Function to create mock OCR result for testing
function createMockResult(fileId, filename) {
  return {
    id: fileId,
    filename: filename,
    processedAt: new Date().toISOString(),
    ocrData: {
      nomor_referensi: {
        value: "SSP318905",
        is_confident: true
      },
      nama_supplier: {
        value: "PT SUKSES SEJATI PERKASA",
        is_confident: true
      },
      tgl_jatuh_tempo: {
        value: "05-03-2025",
        epoch: 1741150800,
        is_confident: true
      },
      tanggal_faktur: {
        value: "26-02-2025",
        epoch: 1740546000,
        is_confident: true
      },
      tipe_dokumen: {
        value: "Faktur",
        is_confident: true
      },
      tipe_pembayaran: {
        value: "Tunai",
        is_confident: true
      },
      salesman: {
        value: "ZUN",
        is_confident: true
      },
      include_vat: {
        value: true,
        is_confident: true
      },
      output: {
        item_keys: [
          "kode_barang_invoice",
          "nama_barang_invoice",
          "qty",
          "satuan",
          "harga_satuan",
          "harga_bruto",
          "diskon_persen",
          "diskon_rp",
          "jumlah_netto"
        ],
        items: [
          {
            kode_barang_invoice: {
              value: "12540202",
              is_confident: true
            },
            nama_barang_invoice: {
              value: "MILO ACTIV - GO UHT Cabk 110ml / 36",
              is_confident: true
            },
            qty: {
              value: 5,
              is_confident: true
            },
            satuan: {
              value: "CTN",
              is_confident: true
            },
            harga_satuan: {
              value: 95570,
              is_confident: true
            },
            harga_bruto: {
              value: 477850,
              is_confident: true
            },
            diskon_persen: {
              value: 3,
              is_confident: true
            },
            diskon_rp: {
              value: 14336,
              is_confident: true
            },
            jumlah_netto: {
              value: 463515,
              is_confident: true
            }
          },
          {
            kode_barang_invoice: {
              value: "12540203",
              is_confident: true
            },
            nama_barang_invoice: {
              value: "MILO ACTIV - GO UHT Cabk 180ml / 36",
              is_confident: true
            },
            qty: {
              value: 5,
              is_confident: true
            },
            satuan: {
              value: "CTN",
              is_confident: true
            },
            harga_satuan: {
              value: 163490,
              is_confident: true
            },
            harga_bruto: {
              value: 817450,
              is_confident: true
            },
            diskon_persen: {
              value: 3,
              is_confident: true
            },
            diskon_rp: {
              value: 24524,
              is_confident: false
            },
            jumlah_netto: {
              value: 792926,
              is_confident: false
            }
          }
        ],
        total_items: {
          value: 0,
          is_confident: false
        }
      },
      debug: [
        {
          item: 1,
          issue: "Diskon Rp pada item 2 (24.524) tidak sesuai dengan perhitungan (3% dari 817.450 adalah 24.523,5)."
        }
      ],
      debug_summary: {
        value: "Ada beberapa ketidaksesuaian dalam perhitungan diskon dan jumlah netto pada beberapa item.",
        is_confident: false
      }
    }
  };
}

/**
 * Process a previously queued file when save data is requested
 * @param {string} fileId - The ID of the queued file to process
 * @returns {Promise<object>} - The OCR processing result
 */
function processQueuedFile(fileId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get the queued file info
      const queuedItem = processingStatus.get(fileId);
      
      if (!queuedItem) {
        throw new Error(`No queued file found with ID: ${fileId}`);
      }
      
      if (!queuedItem.buffer) {
        throw new Error(`File buffer not found for ID: ${fileId}`);
      }
      
      console.log(`[ProcessQueue:${fileId}] Starting processing of queued file: ${queuedItem.originalFilename}`);
      
      // Update status to processing
      updateStatus(fileId, 'processing', null, 0, {
        id: fileId,
        name: queuedItem.originalFilename,
        mimetype: queuedItem.mimetype
      });
      
      // Set up progress tracking
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) { // Cap at 90% until we get actual results
          updateStatus(fileId, 'processing', null, progress);
        } else {
          clearInterval(progressInterval);
        }
      }, 1000);
      
      // Create form data for API request
      const formData = new FormData();
      
      // Create a temporary file path for the buffer
      const tempDir = path.join(__dirname, '../../uploads/temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, queuedItem.originalFilename);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, queuedItem.buffer);
      
      // Add file to form data
      const fileStream = fs.createReadStream(tempFilePath);
      formData.append('file', fileStream);
      
      console.log(`[ProcessQueue:${fileId}] Starting OCR API request to: ${OCR_API_ENDPOINT}`);
      console.log(`[ProcessQueue:${fileId}] File: ${queuedItem.originalFilename}, Size: ${queuedItem.dataSize} bytes`);
      
      // Implement retry logic with API call
      let retryCount = 0;
      let lastError = null;
      let successful = false;
      let ocrData = null;
      
      // Try up to MAX_RETRIES times
      while (retryCount <= MAX_RETRIES && !successful) {
        try {
          if (retryCount > 0) {
            console.log(`[ProcessQueue:${fileId}] Retry attempt ${retryCount}/${MAX_RETRIES} for OCR API request`);
            // Reset the file stream for retry
            formData.delete('file');
            const newFileStream = fs.createReadStream(tempFilePath);
            formData.append('file', newFileStream);
          }
          
          // Send request to OCR API
          const response = await axios.post(OCR_API_ENDPOINT, formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': OCR_API_TOKEN
            },
            timeout: 600000, // 10 minutes timeout for OCR processing
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });
          
          // Process OCR results
          ocrData = response.data;
          
          // Log response for debugging
          console.log(`[ProcessQueue:${fileId}] OCR API Response status: ${response.status}`);
          console.log(`[ProcessQueue:${fileId}] OCR API Response type: ${typeof ocrData}`);
          console.log(`[ProcessQueue:${fileId}] OCR API Response snippet:`, 
            JSON.stringify(ocrData).substring(0, 300) + '...');
          
          successful = true;
        } catch (error) {
          lastError = error;
          console.error(`[ProcessQueue:${fileId}] Error calling OCR API (attempt ${retryCount+1}/${MAX_RETRIES+1}):`, error.message);
          
          // Check if the API returned a response despite the error
          if (error.response) {
            console.log(`[ProcessQueue:${fileId}] API Error Status:`, error.response.status);
            console.log(`[ProcessQueue:${fileId}] API Error Data:`, error.response.data);
          }
          
          // Increment retry count
          retryCount++;
        }
      }
      
      // If all retries failed, try fallback API
      if (!successful) {
        console.error(`[ProcessQueue:${fileId}] All ${MAX_RETRIES+1} attempts to OCR API failed`);
        
        // Send notification about the failure
        await sendFailureNotification(fileId, queuedItem.originalFilename, lastError, MAX_RETRIES+1);
        
        // Try fallback API if available and different from main API
        if (OCR_API_ENDPOINT !== FALLBACK_OCR_API_ENDPOINT) {
          console.log(`[ProcessQueue:${fileId}] Trying fallback OCR API: ${FALLBACK_OCR_API_ENDPOINT}`);
          
          try {
            // Reset stream because it was consumed in previous attempts
            formData.delete('file');
            const fileStream2 = fs.createReadStream(tempFilePath);
            formData.append('file', fileStream2);
            
            const fallbackResponse = await axios.post(FALLBACK_OCR_API_ENDPOINT, formData, {
              headers: {
                ...formData.getHeaders(),
                'Authorization': OCR_API_TOKEN
              },
              timeout: 600000 // 10 minutes timeout
            });
            
            // Process fallback response
            ocrData = fallbackResponse.data;
            successful = true;
            
            console.log(`[ProcessQueue:${fileId}] Fallback OCR API succeeded`);
          } catch (fallbackError) {
            console.error(`[ProcessQueue:${fileId}] Fallback OCR API also failed:`, fallbackError.message);
            lastError = fallbackError;
            
            // Send additional notification for fallback failure
            await sendFailureNotification(fileId, queuedItem.originalFilename, fallbackError, MAX_RETRIES+2);
            
            // Use mock data as last resort in dev mode
            if (IS_DEV_MODE) {
              console.log(`[ProcessQueue:${fileId}] Using mock data as last resort fallback`);
              const mockResult = createMockResult(fileId, queuedItem.originalFilename);
              clearInterval(progressInterval);
              
              // Remove temporary file
              try {
                fs.unlinkSync(tempFilePath);
              } catch (err) {
                console.error(`[ProcessQueue:${fileId}] Error deleting temporary file:`, err);
              }
              
              updateStatus(fileId, 'completed', mockResult, 100);
              resolve(mockResult);
              return;
            } else {
              // In production, report the error
              clearInterval(progressInterval);
              
              // Remove temporary file
              try {
                fs.unlinkSync(tempFilePath);
              } catch (err) {
                console.error(`[ProcessQueue:${fileId}] Error deleting temporary file:`, err);
              }
              
              updateStatus(fileId, 'error', { message: lastError.message }, 0);
              reject(lastError);
              return;
            }
          }
        } else {
          // If there's no separate fallback API, use mock data in dev mode or report error in prod
          if (IS_DEV_MODE) {
            console.log(`[ProcessQueue:${fileId}] Using mock data as last resort fallback`);
            const mockResult = createMockResult(fileId, queuedItem.originalFilename);
            clearInterval(progressInterval);
            
            // Remove temporary file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              console.error(`[ProcessQueue:${fileId}] Error deleting temporary file:`, err);
            }
            
            updateStatus(fileId, 'completed', mockResult, 100);
            resolve(mockResult);
            return;
          } else {
            // In production, report the error
            clearInterval(progressInterval);
            
            // Remove temporary file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              console.error(`[ProcessQueue:${fileId}] Error deleting temporary file:`, err);
            }
            
            updateStatus(fileId, 'error', { message: lastError.message }, 0);
            reject(lastError);
            return;
          }
        }
      }
      
      // Process the OCR data (successful case)
      // Use existing normalizing logic for OCR data
      let processedOcrData;
      if (Array.isArray(ocrData)) {
        // Find element with output property
        const outputItem = ocrData.find(item => item.output);
        if (outputItem) {
          console.log(`[ProcessQueue:${fileId}] Found item with output property in array`);
          processedOcrData = outputItem;
        } else {
          // Merge all array items into one object with output property
          console.log(`[ProcessQueue:${fileId}] Creating structured output from array items`);
          processedOcrData = {
            output: {
              // Add essential properties if found in any array element
              nomor_referensi: findPropertyInArray(ocrData, 'nomor_referensi') || { value: `INV-${Date.now()}`, is_confident: false },
              nama_supplier: findPropertyInArray(ocrData, 'nama_supplier') || { value: "Unknown Supplier", is_confident: false },
              tanggal_faktur: findPropertyInArray(ocrData, 'tanggal_faktur') || { value: new Date().toISOString().split('T')[0], is_confident: false },
              tgl_jatuh_tempo: findPropertyInArray(ocrData, 'tgl_jatuh_tempo') || { value: "", is_confident: false },
              items: []
            }
          };
          
          // Add any properties from third element which typically has items
          if (ocrData[2] && ocrData[2].output && Array.isArray(ocrData[2].output.items)) {
            processedOcrData.output.items = ocrData[2].output.items;
          }
        }
      } else {
        // Process single object
        console.log(`[ProcessQueue:${fileId}] Processing single object response`);
        processedOcrData = ocrData;
      }

      // Ensure output property exists
      if (!processedOcrData.output) {
        console.log(`[ProcessQueue:${fileId}] Adding missing output property`);
        processedOcrData = {
          output: {
            // Copy any properties from original data
            ...(typeof processedOcrData === 'object' ? processedOcrData : {}),
            // Ensure items array exists
            items: []
          }
        };
      }

      // Ensure essential properties exist in output
      if (!processedOcrData.output.nomor_referensi) {
        processedOcrData.output.nomor_referensi = { 
          value: `INV-${Date.now()}`, 
          is_confident: true 
        };
      }

      if (!processedOcrData.output.nama_supplier) {
        processedOcrData.output.nama_supplier = { 
          value: "Unknown Supplier", 
          is_confident: false 
        };
      }

      if (!processedOcrData.output.tanggal_faktur) {
        processedOcrData.output.tanggal_faktur = { 
          value: new Date().toISOString().split('T')[0], 
          is_confident: false 
        };
      }

      // Ensure items array exists and is an array
      if (!Array.isArray(processedOcrData.output.items)) {
        processedOcrData.output.items = [];
      }
      
      // Clean up
      clearInterval(progressInterval);
      
      // Remove temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[ProcessQueue:${fileId}] Temporary file deleted: ${tempFilePath}`);
      } catch (err) {
        console.error(`[ProcessQueue:${fileId}] Error deleting temporary file:`, err);
      }
      
      // Update status with results
      const result = {
        id: fileId,
        filename: queuedItem.originalFilename,
        processedAt: new Date().toISOString(),
        ocrData: processedOcrData
      };
      
      updateStatus(fileId, 'completed', result, 100);
      resolve(result);
      
    } catch (error) {
      console.error(`[ProcessQueue:${fileId}] Error processing file:`, error);
      updateStatus(fileId, 'error', { message: error.message }, 0);
      reject(error);
    }
  });
}

/**
 * Queue a file buffer for asynchronous processing (used when file is in memory)
 * @param {Buffer} buffer - The file buffer to process
 * @param {string} originalFilename - Original name of the file
 * @param {string} mimetype - MIME type of the file
 * @returns {string} The generated ID for the queued process
 */
exports.queueBuffer = function(buffer, originalFilename, mimetype) {
  // Generate a unique ID for this queued process
  const processId = uuidv4();
  
  console.log(`Queueing buffer for processing. Original filename: ${originalFilename}, Size: ${buffer.length} bytes, MIME: ${mimetype}`);
  
  // Store initial status - the buffer is not saved to disk until actually needed
  processingStatus.set(processId, {
    id: processId,
    originalFilename,
    status: 'queued',
    mimetype,
    queuedAt: new Date().toISOString(),
    // Store buffer in memory until save data action
    buffer: buffer,
    dataSize: buffer.length,
    results: null,
    error: null
  });
  
  // Process will only take place when save data is pressed
  
  return processId;
};

// Export functions from the module
exports.queueFile = queueFile;
exports.getFileStatus = getFileStatus;
exports.getAllStatuses = getAllStatuses;
exports.processQueuedFile = processQueuedFile;

module.exports = {
  queueFile: exports.queueFile,
  queueBuffer: exports.queueBuffer,
  getFileStatus: exports.getFileStatus,
  getAllStatuses: exports.getAllStatuses,
  processQueuedFile: exports.processQueuedFile
};
