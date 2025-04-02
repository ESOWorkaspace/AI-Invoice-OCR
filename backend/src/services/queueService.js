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
const OCR_API_ENDPOINT = process.env.OCR_API_ENDPOINT || 'http://amien-server:1880/testingupload';
const OCR_API_TOKEN = process.env.OCR_API_TOKEN || 'a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8';
const FALLBACK_OCR_API_ENDPOINT = process.env.FALLBACK_OCR_API_ENDPOINT || 'http://localhost:1880/testingupload';

// Development mode flag
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
// Use mock data only as fallback, not by default
const USE_MOCK_DATA = IS_DEV_MODE && process.env.USE_MOCK_DATA === 'true';

// Log configuration
console.log('Queue Service Configuration:', {
  OCR_API_ENDPOINT,
  OCR_API_TOKEN: OCR_API_TOKEN ? '***' : 'undefined', // Mask token for security
  FALLBACK_OCR_API_ENDPOINT,
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
      
      // Tambahkan file ke FormData tanpa manipulasi tambahan
      const fileStream = fs.createReadStream(filePath);
      formData.append('file', fileStream);
      
      console.log(`[Queue:${fileId}] Starting OCR API request to: ${OCR_API_ENDPOINT}`);
      console.log(`[Queue:${fileId}] File: ${originalname}`);
      
      // Kirim request ke OCR API dengan timeout yang lebih panjang
      try {
        const response = await axios.post(OCR_API_ENDPOINT, formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': OCR_API_TOKEN
          },
          timeout: 180000, // 3 menit timeout untuk menunggu OCR selesai
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        
        // Process OCR results
        let ocrData = response.data;
        
        // Log respons raw untuk debugging
        console.log(`[Queue:${fileId}] OCR API Response status: ${response.status}`);
        console.log(`[Queue:${fileId}] OCR API Response type: ${typeof ocrData}`);
        console.log(`[Queue:${fileId}] OCR API Response snippet:`, 
          JSON.stringify(ocrData).substring(0, 300) + '...');
        
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
      } catch (apiError) {
        console.error(`[Queue:${fileId}] Error calling OCR API:`, apiError.message);
        
        // Cek jika ada respons dari API meskipun error
        if (apiError.response) {
          console.log(`[Queue:${fileId}] API Error Status:`, apiError.response.status);
          console.log(`[Queue:${fileId}] API Error Data:`, apiError.response.data);
        }
        
        // Jika ada masalah dengan API asli, coba fallback ke API lokal
        if (OCR_API_ENDPOINT !== FALLBACK_OCR_API_ENDPOINT) {
          console.log(`[Queue:${fileId}] Trying fallback OCR API: ${FALLBACK_OCR_API_ENDPOINT}`);
          
          try {
            // Reset stream karena sudah dikonsumsi di attempt pertama
            formData.delete('file');
            const fileStream2 = fs.createReadStream(filePath);
            formData.append('file', fileStream2);
            
            const fallbackResponse = await axios.post(FALLBACK_OCR_API_ENDPOINT, formData, {
              headers: {
                ...formData.getHeaders(),
                'Authorization': OCR_API_TOKEN
              },
              timeout: 180000
            });
            
            // Fallback OCR API success
            let fallbackData = fallbackResponse.data;
            
            // Apply the same normalization as for the primary API
            if (!Array.isArray(fallbackData)) {
              fallbackData = [fallbackData];
            }
            
            let processedFallbackData;
            if (Array.isArray(fallbackData)) {
              // Find element with output property
              const outputItem = fallbackData.find(item => item.output);
              if (outputItem) {
                console.log(`[Queue:${fileId}] Found item with output property in array`);
                processedFallbackData = outputItem;
              } else {
                // Merge all array items into one object with output property
                console.log(`[Queue:${fileId}] Creating structured output from array items`);
                processedFallbackData = {
                  output: {
                    // Add essential properties if found in any array element
                    nomor_referensi: findPropertyInArray(fallbackData, 'nomor_referensi') || { value: `INV-${Date.now()}`, is_confident: false },
                    nama_supplier: findPropertyInArray(fallbackData, 'nama_supplier') || { value: "Unknown Supplier", is_confident: false },
                    tanggal_faktur: findPropertyInArray(fallbackData, 'tanggal_faktur') || { value: new Date().toISOString().split('T')[0], is_confident: false },
                    tgl_jatuh_tempo: findPropertyInArray(fallbackData, 'tgl_jatuh_tempo') || { value: "", is_confident: false },
                    items: []
                  }
                };
                
                // Add any properties from third element which typically has items
                if (fallbackData[2] && fallbackData[2].output && Array.isArray(fallbackData[2].output.items)) {
                  processedFallbackData.output.items = fallbackData[2].output.items;
                }
              }
            } else {
              // Process single object
              console.log(`[Queue:${fileId}] Processing single object response`);
              processedFallbackData = fallbackData;
            }

            // Ensure output property exists
            if (!processedFallbackData.output) {
              console.log(`[Queue:${fileId}] Adding missing output property`);
              processedFallbackData = {
                output: {
                  // Copy any properties from original data
                  ...(typeof processedFallbackData === 'object' ? processedFallbackData : {}),
                  // Ensure items array exists
                  items: []
                }
              };
            }

            // Ensure essential properties exist in output
            if (!processedFallbackData.output.nomor_referensi) {
              processedFallbackData.output.nomor_referensi = { 
                value: `INV-${Date.now()}`, 
                is_confident: true 
              };
            }

            if (!processedFallbackData.output.nama_supplier) {
              processedFallbackData.output.nama_supplier = { 
                value: "Unknown Supplier", 
                is_confident: false 
              };
            }

            if (!processedFallbackData.output.tanggal_faktur) {
              processedFallbackData.output.tanggal_faktur = { 
                value: new Date().toISOString().split('T')[0], 
                is_confident: false 
              };
            }

            // Ensure items array exists and is an array
            if (!Array.isArray(processedFallbackData.output.items)) {
              processedFallbackData.output.items = [];
            }

            clearInterval(progressInterval);
            
            // Update status with fallback results
            const fallbackResult = {
              id: fileId,
              filename: originalname,
              filePath: filePath,
              processedAt: new Date().toISOString(),
              ocrData: processedFallbackData,
              usedFallback: true
            };
            
            updateStatus(fileId, 'completed', fallbackResult, 100, fileInfo);
            cb(null, fallbackResult);
            
            // Successful fallback, so exit early
            return;
          } catch (fallbackError) {
            console.error(`[Queue:${fileId}] Fallback OCR API also failed:`, fallbackError.message);
            // Continue to fallback to mock data below
          }
        }
        
        // Jika masih gagal, gunakan mock data sebagai fallback terakhir
        if (IS_DEV_MODE) {
          console.log(`[Queue:${fileId}] Using mock data as last resort fallback`);
          const mockResult = createMockResult(fileId, originalname);
          clearInterval(progressInterval);
          updateStatus(fileId, 'completed', mockResult, 100, fileInfo);
          cb(null, mockResult);
        } else {
          // In prod, don't use mock data, just report the error
          clearInterval(progressInterval);
          updateStatus(fileId, 'error', { message: apiError.message }, 0);
          cb(apiError);
        }
      }
    
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

// Helper function to create mock OCR results
function createMockResult(fileId, filename) {
  console.log(`Creating mock OCR result for ${filename} with ID ${fileId}`);
  
  // Ensure proper structure with output property
  return {
    fileId: fileId,
    filename: filename,
    processedAt: new Date().toISOString(),
    ocrData: {
      output: {
        // Header fields
        nomor_referensi: { value: "INV-2023-001", is_confident: true },
        nama_supplier: { value: "PT Supplier Utama", is_confident: true },
        tgl_jatuh_tempo: { value: "2023-12-31", is_confident: true },
        tanggal_faktur: { value: "2023-11-15", is_confident: true },
        
        // Line items (ensure this is an array)
        items: [
          {
            kode_barang_invoice: { value: "ITM001", is_confident: true },
            nama_barang_invoice: { value: "Produk Sample 1", is_confident: false },
            qty: { value: 5, is_confident: true },
            satuan: { value: "PCS", is_confident: true },
            harga_satuan: { value: 100000, is_confident: true },
            jumlah_netto: { value: 500000, is_confident: true },
            bkp: { value: true, is_confident: true }
          },
          {
            kode_barang_invoice: { value: "ITM002", is_confident: true },
            nama_barang_invoice: { value: "Produk Sample 2", is_confident: true },
            qty: { value: 2, is_confident: true },
            satuan: { value: "BOX", is_confident: false },
            harga_satuan: { value: 250000, is_confident: true },
            jumlah_netto: { value: 500000, is_confident: true },
            bkp: { value: false, is_confident: true }
          }
        ],
        
        // Totals
        include_ppn: { value: true, is_confident: true },
        ppn_rate: { value: 11, is_confident: true, from_database: true },
        margin_threshold: { value: 15, is_confident: true, from_database: true },
        total_jumlah_netto: { value: "1000000", is_confident: true },
        total_ppn: { value: "55000", is_confident: true },
        total_faktur: { value: "1055000", is_confident: true }
      }
    }
  };
}

module.exports = {
  queueFile,
  getFileStatus,
  getAllStatuses
};
