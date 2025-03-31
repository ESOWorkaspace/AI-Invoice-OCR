import axios from 'axios';

// Get environment variables
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';

// Mock data for testing
const mockData = {
  processed_invoices: [
    { 
      id: 1, 
      invoice_number: 'INV-2025-001', 
      document_type: 'Invoice', 
      supplier_name: 'PT Sukses Sejati', 
      invoice_date: '2025-03-15', 
      due_date: '2025-04-15',
      payment_type: 'Credit',
      include_tax: true,
      salesman: 'John Doe',
      tax_rate: 11.0,
      items: JSON.stringify([
        {
          product_code: 'P001',
          product_name: 'MILO ACTIV-GO UHT Cabk 110ml/36',
          quantity: 5,
          unit: 'pcs',
          price: 95570,
          total: 477850
        }
      ]),
      created_at: '2025-03-15T10:30:00Z',
      updated_at: '2025-03-15T10:30:00Z'
    },
    { 
      id: 2, 
      invoice_number: 'INV-2025-002', 
      document_type: 'Invoice', 
      supplier_name: 'CV Mitra Abadi', 
      invoice_date: '2025-03-16', 
      due_date: '2025-04-16',
      payment_type: 'Cash',
      include_tax: false,
      salesman: 'Jane Smith',
      tax_rate: 0.0,
      items: JSON.stringify([
        {
          product_code: 'P002',
          product_name: 'MILO ACTIV-GO UHT Cabk 180ml/36',
          quantity: 3,
          unit: 'pcs',
          price: 163490,
          total: 490470
        }
      ]),
      created_at: '2025-03-16T11:45:00Z',
      updated_at: '2025-03-16T11:45:00Z'
    }
  ],
  raw_ocr_data: [
    { 
      id: 1, 
      invoice_number: 'INV-2025-001', 
      invoice_date: '2025-03-15',
      raw_data: JSON.stringify({
        text: "Invoice\nPT Sukses Sejati\nInvoice #: INV-2025-001\nDate: 15/03/2025\nDue: 15/04/2025\nItems:\n- MILO ACTIV-GO UHT Cabk 110ml/36 x 5 = Rp 477.850\nSubtotal: Rp 477.850\nTax (11%): Rp 52.563\nTotal: Rp 530.413",
        confidence: 0.92,
        boxes: [[10, 10, 100, 30], [10, 40, 200, 60]]
      }),
      created_at: '2025-03-15T10:30:00Z',
      updated_at: '2025-03-15T10:30:00Z'
    },
    { 
      id: 2, 
      invoice_number: 'INV-2025-002', 
      invoice_date: '2025-03-16',
      raw_data: JSON.stringify({
        text: "Invoice\nCV Mitra Abadi\nInvoice #: INV-2025-002\nDate: 16/03/2025\nDue: 16/04/2025\nItems:\n- MILO ACTIV-GO UHT Cabk 180ml/36 x 3 = Rp 490.470\nSubtotal: Rp 490.470\nTax (0%): Rp 0\nTotal: Rp 490.470",
        confidence: 0.89,
        boxes: [[15, 15, 105, 35], [15, 45, 205, 65]]
      }),
      created_at: '2025-03-16T11:45:00Z',
      updated_at: '2025-03-16T11:45:00Z'
    }
  ],
  products: [
    { 
      id: 1, 
      product_code: 'P001', 
      product_name: 'MILO ACTIV-GO UHT Cabk 110ml/36', 
      category: 'Beverages', 
      unit: 'pcs', 
      price: 95570, 
      stock: 120,
      supplier_code: 'SUP001',
      barcode: '8901234567890',
      min_stock: 20,
      created_at: '2025-03-01T09:00:00Z',
      updated_at: '2025-03-01T09:00:00Z'
    },
    { 
      id: 2, 
      product_code: 'P002', 
      product_name: 'MILO ACTIV-GO UHT Cabk 180ml/36', 
      category: 'Beverages', 
      unit: 'pcs', 
      price: 163490, 
      stock: 85,
      supplier_code: 'SUP001',
      barcode: '8901234567891',
      min_stock: 15,
      created_at: '2025-03-01T09:15:00Z',
      updated_at: '2025-03-01T09:15:00Z'
    }
  ]
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to log requests in development
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses in development
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  }
);

// API endpoints for processed invoices
export const invoiceApi = {
  // Get all invoices with optional pagination and filtering
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for processed_invoices');
      return mockData.processed_invoices || [];
    }
    
    try {
      console.log('Fetching processed invoices from API');
      const response = await api.get('/api/invoices/', { params });
      console.log('Processed invoices API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoices: ${error.message}`);
      console.log('Falling back to mock data for processed_invoices');
      return mockData.processed_invoices || [];
    }
  },
  
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for invoice ${id}`);
      return mockData.processed_invoices.find(item => item.id === id);
    }
    
    try {
      console.log(`Fetching invoice ${id} from API`);
      const response = await api.get(`/api/invoices/${id}`);
      console.log(`Invoice ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoice ${id}: ${error.message}`);
      console.log(`Falling back to mock data for invoice ${id}`);
      return mockData.processed_invoices.find(item => item.id === id);
    }
  },
  
  create: async (data) => {
    if (USE_MOCK_DATA) {
      console.log('Creating mock invoice');
      const newInvoice = {
        id: mockData.processed_invoices.length + 1,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.processed_invoices.push(newInvoice);
      return newInvoice;
    }
    
    try {
      console.log('Creating invoice via API');
      const response = await api.post('/api/invoices/', data);
      console.log('Create invoice API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error creating invoice: ${error.message}`);
      throw error;
    }
  },
  
  update: async (id, data) => {
    if (USE_MOCK_DATA) {
      console.log(`Updating mock invoice ${id}`);
      const index = mockData.processed_invoices.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.processed_invoices[index] = {
          ...mockData.processed_invoices[index],
          ...data,
          updated_at: new Date().toISOString()
        };
        return mockData.processed_invoices[index];
      }
      throw new Error('Invoice not found');
    }
    
    try {
      console.log(`Updating invoice ${id} via API`);
      const response = await api.put(`/api/invoices/${id}`, data);
      console.log(`Update invoice ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error updating invoice ${id}: ${error.message}`);
      throw error;
    }
  },
  
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Deleting mock invoice ${id}`);
      const index = mockData.processed_invoices.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.processed_invoices.splice(index, 1);
        return true;
      }
      throw new Error('Invoice not found');
    }
    
    try {
      console.log(`Deleting invoice ${id} via API`);
      const response = await api.delete(`/api/invoices/${id}`);
      console.log(`Delete invoice ${id} API response:`, response);
      return true;
    } catch (error) {
      console.error(`Error deleting invoice ${id}: ${error.message}`);
      throw error;
    }
  }
};

// API endpoints for raw OCR data
export const rawOcrApi = {
  // Get all raw OCR data with optional pagination
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for raw_ocr_data');
      return mockData.raw_ocr_data || [];
    }
    
    try {
      console.log('Fetching raw OCR data from API');
      const response = await api.get('/api/raw-ocr/', { params });
      console.log('Raw OCR data API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching raw OCR data: ${error.message}`);
      console.log('Falling back to mock data for raw_ocr_data');
      return mockData.raw_ocr_data || [];
    }
  },
  
  // Get a single raw OCR data by ID
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for raw OCR data ${id}`);
      return mockData.raw_ocr_data.find(item => item.id === id);
    }
    
    try {
      console.log(`Fetching raw OCR data ${id} from API`);
      const response = await api.get(`/api/raw-ocr/${id}`);
      console.log(`Raw OCR data ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching raw OCR data ${id}: ${error.message}`);
      console.log(`Falling back to mock data for raw OCR data ${id}`);
      return mockData.raw_ocr_data.find(item => item.id === id);
    }
  },
  
  // Get raw OCR data by invoice number
  getByInvoiceNumber: async (invoiceNumber) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for raw OCR data by invoice number ${invoiceNumber}`);
      return mockData.raw_ocr_data.find(item => item.invoice_number === invoiceNumber);
    }
    
    try {
      console.log(`Fetching raw OCR data by invoice number ${invoiceNumber} from API`);
      const response = await api.get(`/api/raw-ocr/by-invoice/${invoiceNumber}`);
      console.log(`Raw OCR data by invoice number ${invoiceNumber} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching raw OCR data by invoice number ${invoiceNumber}: ${error.message}`);
      console.log(`Falling back to mock data for raw OCR data by invoice number ${invoiceNumber}`);
      return mockData.raw_ocr_data.find(item => item.invoice_number === invoiceNumber);
    }
  },
  
  // Create new raw OCR data
  create: async (ocrData) => {
    if (USE_MOCK_DATA) {
      console.log('Creating mock raw OCR data');
      const newOcrData = {
        id: mockData.raw_ocr_data.length + 1,
        ...ocrData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.raw_ocr_data.push(newOcrData);
      return newOcrData;
    }
    
    try {
      console.log('Creating raw OCR data via API');
      const response = await api.post('/api/raw-ocr/', ocrData);
      console.log('Create raw OCR data API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error creating raw OCR data: ${error.message}`);
      throw error;
    }
  },
  
  // Update existing raw OCR data
  update: async (id, ocrData) => {
    if (USE_MOCK_DATA) {
      console.log(`Updating mock raw OCR data ${id}`);
      const index = mockData.raw_ocr_data.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.raw_ocr_data[index] = {
          ...mockData.raw_ocr_data[index],
          ...ocrData,
          updated_at: new Date().toISOString()
        };
        return mockData.raw_ocr_data[index];
      }
      throw new Error('OCR data not found');
    }
    
    try {
      console.log(`Updating raw OCR data ${id} via API`);
      const response = await api.put(`/api/raw-ocr/${id}`, ocrData);
      console.log(`Update raw OCR data ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error updating raw OCR data ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete raw OCR data
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Deleting mock raw OCR data ${id}`);
      const index = mockData.raw_ocr_data.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.raw_ocr_data.splice(index, 1);
        return true;
      }
      throw new Error('OCR data not found');
    }
    
    try {
      console.log(`Deleting raw OCR data ${id} via API`);
      const response = await api.delete(`/api/raw-ocr/${id}`);
      console.log(`Delete raw OCR data ${id} API response:`, response);
      return true;
    } catch (error) {
      console.error(`Error deleting raw OCR data ${id}: ${error.message}`);
      throw error;
    }
  }
};

// API endpoints for products
export const productApi = {
  // Get all products with optional pagination and filtering
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for products');
      return mockData.products || [];
    }
    
    try {
      console.log('Fetching products from API');
      const response = await api.get('/api/products/', { params });
      console.log('Products API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching products: ${error.message}`);
      console.log('Falling back to mock data for products');
      return mockData.products || [];
    }
  },
  
  // Get a single product by ID
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for product ${id}`);
      return mockData.products.find(item => item.id === id);
    }
    
    try {
      console.log(`Fetching product ${id} from API`);
      const response = await api.get(`/api/products/${id}`);
      console.log(`Product ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${id}: ${error.message}`);
      console.log(`Falling back to mock data for product ${id}`);
      return mockData.products.find(item => item.id === id);
    }
  },
  
  // Get a product by product code
  getByCode: async (productCode) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for product by code ${productCode}`);
      return mockData.products.find(item => item.product_code === productCode);
    }
    
    try {
      console.log(`Fetching product by code ${productCode} from API`);
      const response = await api.get(`/api/products/by-code/${productCode}`);
      console.log(`Product by code ${productCode} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product by code ${productCode}: ${error.message}`);
      console.log(`Falling back to mock data for product by code ${productCode}`);
      return mockData.products.find(item => item.product_code === productCode);
    }
  },
  
  // Search products by name or code
  search: async (query, params = {}) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for product search ${query}`);
      const lowercaseQuery = query.toLowerCase();
      return mockData.products.filter(product => 
        product.product_name.toLowerCase().includes(lowercaseQuery) || 
        product.product_code.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    try {
      console.log(`Searching products by ${query} via API`);
      const response = await api.get('/api/products/search', { 
        params: { query, ...params } 
      });
      console.log(`Search products by ${query} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error searching products by ${query}: ${error.message}`);
      console.log(`Falling back to mock data for product search ${query}`);
      const lowercaseQuery = query.toLowerCase();
      return mockData.products.filter(product => 
        product.product_name.toLowerCase().includes(lowercaseQuery) || 
        product.product_code.toLowerCase().includes(lowercaseQuery)
      );
    }
  },
  
  // Create a new product
  create: async (productData) => {
    if (USE_MOCK_DATA) {
      console.log('Creating mock product');
      const newProduct = {
        id: mockData.products.length + 1,
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.products.push(newProduct);
      return newProduct;
    }
    
    try {
      console.log('Creating product via API');
      const response = await api.post('/api/products/', productData);
      console.log('Create product API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error creating product: ${error.message}`);
      throw error;
    }
  },
  
  // Update an existing product
  update: async (id, productData) => {
    if (USE_MOCK_DATA) {
      console.log(`Updating mock product ${id}`);
      const index = mockData.products.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.products[index] = {
          ...mockData.products[index],
          ...productData,
          updated_at: new Date().toISOString()
        };
        return mockData.products[index];
      }
      throw new Error('Product not found');
    }
    
    try {
      console.log(`Updating product ${id} via API`);
      const response = await api.put(`/api/products/${id}`, productData);
      console.log(`Update product ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error updating product ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Update product stock
  updateStock: async (id, quantityChange) => {
    if (USE_MOCK_DATA) {
      console.log(`Updating mock product stock ${id}`);
      const index = mockData.products.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.products[index].stock += quantityChange;
        mockData.products[index].updated_at = new Date().toISOString();
        return mockData.products[index];
      }
      throw new Error('Product not found');
    }
    
    try {
      console.log(`Updating product stock ${id} via API`);
      const response = await api.patch(`/api/products/${id}/stock`, { quantity_change: quantityChange });
      console.log(`Update product stock ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error updating product stock ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete a product
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Deleting mock product ${id}`);
      const index = mockData.products.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.products.splice(index, 1);
        return true;
      }
      throw new Error('Product not found');
    }
    
    try {
      console.log(`Deleting product ${id} via API`);
      const response = await api.delete(`/api/products/${id}`);
      console.log(`Delete product ${id} API response:`, response);
      return true;
    } catch (error) {
      console.error(`Error deleting product ${id}: ${error.message}`);
      throw error;
    }
  }
};

// General database API
export const databaseApi = {
  // Get database information
  getInfo: async () => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for database info');
      return {
        name: 'invoice_ocr_db',
        type: 'PostgreSQL',
        version: '14.5',
        size: '256 MB',
        tables: 3,
        records: mockData.processed_invoices.length + mockData.raw_ocr_data.length + mockData.products.length,
        lastBackup: '2025-03-30T02:15:00Z',
        status: 'Connected',
        uptime: '15 days, 7 hours'
      };
    }
    
    try {
      console.log('Fetching database info from API');
      const response = await api.get('/api/database/info');
      console.log('Database info API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching database info: ${error.message}`);
      console.log('Falling back to mock data for database info');
      return {
        name: 'invoice_ocr_db',
        type: 'PostgreSQL',
        version: '14.5',
        size: '256 MB',
        tables: 3,
        records: mockData.processed_invoices.length + mockData.raw_ocr_data.length + mockData.products.length,
        lastBackup: '2025-03-30T02:15:00Z',
        status: 'Connected',
        uptime: '15 days, 7 hours'
      };
    }
  },
  
  // Get table information
  getTableInfo: async (tableName) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for table ${tableName}`);
      const tableData = mockData[tableName] || [];
      return {
        name: tableName,
        records: tableData.length,
        lastUpdated: new Date().toISOString(),
        description: `Table for ${tableName}`
      };
    }
    
    try {
      console.log(`Fetching table ${tableName} info from API`);
      const response = await api.get(`/api/database/tables/${tableName}`);
      console.log(`Table ${tableName} info API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching table ${tableName} info: ${error.message}`);
      console.log(`Falling back to mock data for table ${tableName}`);
      const tableData = mockData[tableName] || [];
      return {
        name: tableName,
        records: tableData.length,
        lastUpdated: new Date().toISOString(),
        description: `Table for ${tableName}`
      };
    }
  },
  
  // Get all tables information
  getAllTables: async () => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for all tables');
      return [
        { 
          id: 'processed_invoices', 
          name: 'Processed Invoices', 
          records: mockData.processed_invoices.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Stores processed and edited invoice data from OCR'
        },
        { 
          id: 'raw_ocr_data', 
          name: 'Raw OCR Data', 
          records: mockData.raw_ocr_data.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Stores raw OCR data in JSON format'
        },
        { 
          id: 'products', 
          name: 'Products', 
          records: mockData.products.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Product master database with pricing information'
        }
      ];
    }
    
    try {
      console.log('Fetching all tables info from API');
      const response = await api.get('/api/database/tables');
      console.log('All tables info API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching all tables info: ${error.message}`);
      console.log('Falling back to mock data for all tables');
      return [
        { 
          id: 'processed_invoices', 
          name: 'Processed Invoices', 
          records: mockData.processed_invoices.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Stores processed and edited invoice data from OCR'
        },
        { 
          id: 'raw_ocr_data', 
          name: 'Raw OCR Data', 
          records: mockData.raw_ocr_data.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Stores raw OCR data in JSON format'
        },
        { 
          id: 'products', 
          name: 'Products', 
          records: mockData.products.length, 
          lastUpdated: new Date().toISOString(),
          description: 'Product master database with pricing information'
        }
      ];
    }
  }
};

export default {
  invoiceApi,
  rawOcrApi,
  productApi,
  databaseApi
};
