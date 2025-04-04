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
  ],
  productItems: [
    {
      ID_Produk: 1,
      Kode_Item: 'M001',
      Nama_Item: 'Indomie Goreng',
      Jenis: 'Mie Instan',
      created_at: '2025-03-01T09:00:00Z',
      updated_at: '2025-03-01T09:00:00Z',
      variants: [
        { ID_Varian: 1, ID_Produk: 1, Deskripsi: 'Original' },
        { ID_Varian: 2, ID_Produk: 1, Deskripsi: 'Pedas' }
      ],
      units: [
        { ID_Satuan: 1, ID_Produk: 1, Nama_Satuan: 'pcs', Jumlah_Dalam_Satuan_Dasar: 1 },
        { ID_Satuan: 2, ID_Produk: 1, Nama_Satuan: 'dus', Jumlah_Dalam_Satuan_Dasar: 40 }
      ]
    },
    {
      ID_Produk: 2,
      Kode_Item: 'B001',
      Nama_Item: 'Beras Pandan Wangi',
      Jenis: 'Beras',
      created_at: '2025-03-01T09:15:00Z',
      updated_at: '2025-03-01T09:15:00Z',
      variants: [],
      units: [
        { ID_Satuan: 3, ID_Produk: 2, Nama_Satuan: 'kg', Jumlah_Dalam_Satuan_Dasar: 1 },
        { ID_Satuan: 4, ID_Produk: 2, Nama_Satuan: 'karung', Jumlah_Dalam_Satuan_Dasar: 25 }
      ]
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
      console.log('Mock mode: Creating product', productData);
      const newProduct = {
        id: Math.floor(Math.random() * 10000),
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.products.push(newProduct);
      return newProduct;
    }
    
    try {
      console.log('Creating product via API');
      const response = await api.post('/api/product-items/', productData);
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

// API endpoints for the new product management system
export const productItemApi = {
  // Get all products with optional pagination and filtering
  getAllProducts: async (params = {}) => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for productItems');
      return { data: mockData.productItems || [] };
    }
    
    try {
      console.log('Fetching product items from API');
      const response = await api.get('/api/product-items/', { params });
      console.log('Product items API response:', response);
      return response;
    } catch (error) {
      console.error(`Error fetching product items: ${error.message}`);
      console.log('Falling back to mock data for productItems');
      return { data: mockData.productItems || [] };
    }
  },
  
  // Get product by ID with all related data
  getProductById: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for product item ${id}`);
      return mockData.productItems.find(item => item.ID_Produk === Number(id));
    }
    
    try {
      console.log(`Fetching product item ${id} from API`);
      const response = await api.get(`/api/product-items/${id}`);
      console.log(`Product item ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product item ${id}: ${error.message}`);
      console.log(`Falling back to mock data for product item ${id}`);
      return mockData.productItems.find(item => item.ID_Produk === Number(id));
    }
  },
  
  // Create new product with all related data
  createProduct: async (data) => {
    if (USE_MOCK_DATA) {
      console.log('Creating mock product item');
      const newProductId = mockData.productItems.length > 0 
        ? Math.max(...mockData.productItems.map(p => p.ID_Produk)) + 1 
        : 1;
      
      const newProduct = {
        ID_Produk: newProductId,
        ...data.product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: data.variants ? data.variants.map((variant, index) => ({
          ID_Varian: mockData.productItems.flatMap(p => p.variants).length + index + 1,
          ID_Produk: newProductId,
          ...variant
        })) : [],
        units: data.units ? data.units.map((unit, index) => ({
          ID_Satuan: mockData.productItems.flatMap(p => p.units).length + index + 1,
          ID_Produk: newProductId,
          ...unit
        })) : []
      };
      
      mockData.productItems.push(newProduct);
      return newProduct;
    }
    
    try {
      console.log('Creating new product item via API');
      const response = await api.post('/api/product-items/', data);
      console.log('Create product item API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error creating product item: ${error.message}`);
      throw error;
    }
  },
  
  // Update product and related data
  updateProduct: async (id, data) => {
    if (USE_MOCK_DATA) {
      console.log(`Updating mock product item ${id}`);
      const index = mockData.productItems.findIndex(item => item.ID_Produk === Number(id));
      
      if (index === -1) {
        throw new Error(`Product item with ID ${id} not found`);
      }
      
      // Update main product data
      mockData.productItems[index] = {
        ...mockData.productItems[index],
        ...data.product,
        updated_at: new Date().toISOString()
      };
      
      // Update variants if provided
      if (data.variants) {
        mockData.productItems[index].variants = data.variants.map((variant, idx) => ({
          ID_Varian: variant.ID_Varian || mockData.productItems.flatMap(p => p.variants).length + idx + 1,
          ID_Produk: Number(id),
          ...variant
        }));
      }
      
      // Update units if provided
      if (data.units) {
        mockData.productItems[index].units = data.units.map((unit, idx) => ({
          ID_Satuan: unit.ID_Satuan || mockData.productItems.flatMap(p => p.units).length + idx + 1,
          ID_Produk: Number(id),
          ...unit
        }));
      }
      
      return mockData.productItems[index];
    }
    
    try {
      console.log(`Updating product item ${id} via API`);
      const response = await api.put(`/api/product-items/${id}`, data);
      console.log(`Update product item ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error updating product item ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete product and all related data
  deleteProduct: async (id) => {
    if (USE_MOCK_DATA) {
      console.log(`Deleting mock product item ${id}`);
      const index = mockData.productItems.findIndex(item => item.ID_Produk === Number(id));
      
      if (index === -1) {
        throw new Error(`Product item with ID ${id} not found`);
      }
      
      mockData.productItems.splice(index, 1);
      return { success: true };
    }
    
    try {
      console.log(`Deleting product item ${id} via API`);
      const response = await api.delete(`/api/product-items/${id}`);
      console.log(`Delete product item ${id} API response:`, response);
      return response.data;
    } catch (error) {
      console.error(`Error deleting product item ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete all products with confirmation code
  deleteAllProducts: async (confirmationCode, confirmationText) => {
    if (USE_MOCK_DATA) {
      console.log('Mock mode: Would delete all products with confirmation code');
      return { success: true, message: 'All products would be deleted in production mode' };
    }
    
    try {
      console.log('Deleting all products with confirmation code');
      const response = await api.delete('/api/product-items/delete-all/confirm', {
        data: { 
          confirmationCode,
          confirmationText
        }
      });
      console.log('Delete all products API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error deleting all products: ${error.message}`);
      throw error;
    }
  },
  
  // Import products in bulk
  importProducts: async (data) => {
    if (USE_MOCK_DATA) {
      console.log('Importing mock product items');
      // Handle import logic for mock data if needed
      return { imported: data.products ? data.products.length : 0, failed: 0 };
    }
    
    try {
      console.log('Importing product items via API');
      const response = await api.post('/api/product-items/import', data);
      console.log('Import product items API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error importing product items: ${error.message}`);
      throw error;
    }
  },
  
  // Export all products
  exportProducts: async (format = 'json') => {
    if (USE_MOCK_DATA) {
      console.log('Mock mode: Would export products in ' + format + ' format');
      return mockData.products;
    }
    
    try {
      console.log(`Exporting products in ${format} format`);
      
      if (format === 'csv') {
        // For CSV, we need to use a different approach to handle the file download
        const response = await api.get('/api/product-items/export/all', {
          params: { format: 'csv' },
          responseType: 'blob' // Important for handling file downloads
        });
        
        // Create a download link and trigger it
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'products-export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        return { success: true, message: 'CSV downloaded successfully' };
      } else {
        // For JSON, we can just return the data
        const response = await api.get('/api/product-items/export/all');
        return response.data;
      }
    } catch (error) {
      console.error(`Error exporting products: ${error.message}`);
      throw error;
    }
  },
  
  // Import products in bulk
  importProducts: async (data) => {
    if (USE_MOCK_DATA) {
      console.log('Importing mock product items');
      // Handle import logic for mock data if needed
      return { imported: data.products ? data.products.length : 0, failed: 0 };
    }
    
    try {
      console.log('Importing product items via API');
      const response = await api.post('/api/product-items/import', data);
      console.log('Import product items API response:', response);
      return response.data;
    } catch (error) {
      console.error(`Error importing product items: ${error.message}`);
      throw error;
    }
  },
  
  bulkDeleteProducts: async (ids) => {
    try {
      // Send an array of product IDs to delete in bulk
      const response = await api.post('/api/product-items/bulk-delete', { ids });
      return response.data;
    } catch (error) {
      console.error(`Error deleting products in bulk: ${error.message}`);
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
  productItemApi,
  databaseApi
};
