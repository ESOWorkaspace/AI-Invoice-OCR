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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses in development
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API endpoints for processed invoices
export const invoiceApi = {
  // Get all invoices with optional pagination and filtering
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      return mockData.processed_invoices || [];
    }
    
    try {
      const response = await api.get('/api/invoices/', { params });
      return response.data;
    } catch (error) {
      return mockData.processed_invoices || [];
    }
  },
  
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      return mockData.processed_invoices.find(item => item.id === id);
    }
    
    try {
      const response = await api.get(`/api/invoices/${id}`);
      return response.data;
    } catch (error) {
      return mockData.processed_invoices.find(item => item.id === id);
    }
  },
  
  create: async (data) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.post('/api/invoices/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, data) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.put(`/api/invoices/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      const index = mockData.processed_invoices.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.processed_invoices.splice(index, 1);
        return true;
      }
      throw new Error('Invoice not found');
    }
    
    try {
      const response = await api.delete(`/api/invoices/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// API endpoints for raw OCR data
export const rawOcrApi = {
  // Get all raw OCR data with optional pagination
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      return mockData.raw_ocr_data || [];
    }
    
    try {
      const response = await api.get('/api/raw-ocr/', { params });
      return response.data;
    } catch (error) {
      return mockData.raw_ocr_data || [];
    }
  },
  
  // Get a single raw OCR data by ID
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      return mockData.raw_ocr_data.find(item => item.id === id);
    }
    
    try {
      const response = await api.get(`/api/raw-ocr/${id}`);
      return response.data;
    } catch (error) {
      return mockData.raw_ocr_data.find(item => item.id === id);
    }
  },
  
  // Get raw OCR data by invoice number
  getByInvoiceNumber: async (invoiceNumber) => {
    if (USE_MOCK_DATA) {
      return mockData.raw_ocr_data.find(item => item.invoice_number === invoiceNumber);
    }
    
    try {
      const response = await api.get(`/api/raw-ocr/by-invoice/${invoiceNumber}`);
      return response.data;
    } catch (error) {
      return mockData.raw_ocr_data.find(item => item.invoice_number === invoiceNumber);
    }
  },
  
  // Create new raw OCR data
  create: async (ocrData) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.post('/api/raw-ocr/', ocrData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update existing raw OCR data
  update: async (id, ocrData) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.put(`/api/raw-ocr/${id}`, ocrData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Delete raw OCR data
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      const index = mockData.raw_ocr_data.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.raw_ocr_data.splice(index, 1);
        return true;
      }
      throw new Error('OCR data not found');
    }
    
    try {
      const response = await api.delete(`/api/raw-ocr/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// API endpoints for products
export const productApi = {
  // Get all products with optional pagination and filtering
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      return mockData.products || [];
    }
    
    try {
      const response = await api.get('/api/products/', { params });
      return response.data;
    } catch (error) {
      return mockData.products || [];
    }
  },
  
  // Get a single product by ID
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      return mockData.products.find(item => item.id === id);
    }
    
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      return mockData.products.find(item => item.id === id);
    }
  },
  
  // Get a product by product code
  getByCode: async (productCode) => {
    if (USE_MOCK_DATA) {
      return mockData.products.find(item => item.product_code === productCode);
    }
    
    try {
      const response = await api.get(`/api/products/by-code/${productCode}`);
      return response.data;
    } catch (error) {
      return mockData.products.find(item => item.product_code === productCode);
    }
  },
  
  // Search products by name or code
  search: async (query, params = {}) => {
    if (USE_MOCK_DATA) {
      const filteredProducts = mockData.products.filter(product => 
        product.product_name?.toLowerCase().includes(query.toLowerCase()) || 
        product.product_code?.toLowerCase().includes(query.toLowerCase()) ||
        product.supplier_code?.toLowerCase().includes(query.toLowerCase())
      );
      return filteredProducts;
    }
    
    try {
      const response = await api.get('/api/products/search', {
        params: { search: query, ...params }
      });
      return response.data;
    } catch (error) {
      const filteredProducts = mockData.products.filter(product => 
        product.product_name?.toLowerCase().includes(query.toLowerCase()) || 
        product.product_code?.toLowerCase().includes(query.toLowerCase()) ||
        product.supplier_code?.toLowerCase().includes(query.toLowerCase())
      );
      return filteredProducts;
    }
  },
  
  // Get product by supplier code
  getBySupplierCode: async (supplierCode) => {
    if (USE_MOCK_DATA) {
      const product = mockData.products.find(product => 
        product.supplier_code?.toLowerCase() === supplierCode.toLowerCase()
      );
      return product;
    }
    
    try {
      const response = await api.get(`/api/products/supplier/${supplierCode}`);
      return response.data;
    } catch (error) {
      const product = mockData.products.find(product => 
        product.supplier_code?.toLowerCase() === supplierCode.toLowerCase()
      );
      return product;
    }
  },
  
  // Create a new product
  create: async (productData) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.post('/api/product-items/', productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update an existing product
  update: async (id, productData) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.put(`/api/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Create new product with all related data (variants, units, prices)
  createProduct: async (formData) => {
    if (USE_MOCK_DATA) {
      const newProductId = mockData.products.length > 0 
        ? Math.max(...mockData.products.map(p => p.id)) + 1 
        : 1;
      
      const newProduct = {
        id: newProductId,
        ...formData.product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: formData.variants || [],
        units: formData.units || [],
        prices: formData.prices || [],
        stocks: formData.stocks || []
      };
      
      mockData.products.push(newProduct);
      return newProduct;
    }
    
    try {
      const response = await api.post('/api/product-items/', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update product with all related data (variants, units, prices)
  updateProduct: async (id, formData) => {
    if (USE_MOCK_DATA) {
      const index = mockData.products.findIndex(item => item.id === Number(id));
      if (index !== -1) {
        mockData.products[index] = {
          ...mockData.products[index],
          ...formData.product,
          updated_at: new Date().toISOString(),
          variants: formData.variants || mockData.products[index].variants || [],
          units: formData.units || mockData.products[index].units || [],
          prices: formData.prices || mockData.products[index].prices || [],
          stocks: formData.stocks || mockData.products[index].stocks || []
        };
        return mockData.products[index];
      }
      throw new Error('Product not found');
    }
    
    try {
      const response = await api.put(`/api/product-items/${id}`, formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update product stock
  updateStock: async (id, quantityChange) => {
    if (USE_MOCK_DATA) {
      const index = mockData.products.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.products[index].stock += quantityChange;
        mockData.products[index].updated_at = new Date().toISOString();
        return mockData.products[index];
      }
      throw new Error('Product not found');
    }
    
    try {
      const response = await api.patch(`/api/products/${id}/stock`, { quantity_change: quantityChange });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Delete a product
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      const index = mockData.products.findIndex(item => item.id === id);
      if (index !== -1) {
        mockData.products.splice(index, 1);
        return true;
      }
      throw new Error('Product not found');
    }
    
    try {
      const response = await api.delete(`/api/products/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  // Get available units for product form
  getAvailableUnits: async () => {
    if (USE_MOCK_DATA) {
      return {
        units: [
          'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
          'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML'
        ],
        supplierUnits: [
          'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
          'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML',
          'CTN', 'CARTON', 'BTL', 'BTG', 'CRT'
        ]
      };
    }
    
    try {
      const response = await api.get('/api/units');
      if (response.data && (Array.isArray(response.data.units) || Array.isArray(response.data))) {
        return response.data;
      } else {
        return {
          units: [
            'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
            'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML'
          ],
          supplierUnits: [
            'PCS', 'BOX', 'PACK', 'DUS', 'ROLL', 'LUSIN', 'RIM', 'SET', 
            'UNIT', 'LEMBAR', 'METER', 'CM', 'KG', 'GRAM', 'LITER', 'ML',
            'CTN', 'CARTON', 'BTL', 'BTG', 'CRT'
          ]
        };
      }
    } catch (error) {
      throw error;
    }
  }
};

// API endpoints for the new product management system
export const productItemApi = {
  // Get all products with optional pagination and filtering
  getAllProducts: async (params = {}) => {
    if (USE_MOCK_DATA) {
      return mockData.products;
    }
    
    try {
      const response = await api.get('/api/product-items', { params });
      return response.data;
    } catch (error) {
      return mockData.products;
    }
  },
  
  // Get product by ID with all related data
  getProductById: async (id) => {
    if (USE_MOCK_DATA) {
      return mockData.productItems.find(item => item.ID_Produk === Number(id));
    }
    
    try {
      const response = await api.get(`/api/product-items/${id}`);
      return response.data;
    } catch (error) {
      return mockData.productItems.find(item => item.ID_Produk === Number(id));
    }
  },
  
  // Get product by supplier code
  getProductBySupplierCode: async (supplierCode) => {
    if (USE_MOCK_DATA) {
      const mockResponse = {
        success: true,
        data: {
          ID_Produk: 123,
          Kode_Item: 'MOCK_ITEM_001',
          Nama_Item: `Mock Product for ${supplierCode}`,
          Units: [
            {
              Nama_Satuan: 'CTN',
              Is_Base: 1,
              Satuan_Supplier: 'CTN',
              prices: [
                {
                  Harga_Pokok: '95570',
                  Harga_Jual: '100000'
                }
              ]
            },
            {
              Nama_Satuan: 'PCS',
              Is_Base: 0,
              Satuan_Supplier: 'PIECE'
            }
          ],
          Prices: [
            {
              Nama_Satuan: 'CTN',
              Harga_Pokok: '95570'
            },
            {
              Nama_Satuan: 'PCS',
              Harga_Pokok: '8000'
            }
          ],
          supplier_units: {
            'CTN': 'CARTON',
            'PCS': 'PIECE'
          }
        }
      };
      
      return mockResponse;
    }
    
    try {
      const response = await api.get(`/api/products/invoice`, { 
        params: { invoiceCode: supplierCode },
        timeout: 10000
      });
      
      if (response.data && response.data.success && response.data.data) {
        const product = response.data.data;
        
        const productArray = Array.isArray(product) ? product : [product];
        
        productArray.forEach(prod => {
          if (!prod.units && prod.Units) {
            prod.units = prod.Units;
          } else if (!prod.units) {
            prod.units = [];
          }
          
          if (Array.isArray(prod.units) && prod.units.length > 0 && typeof prod.units[0] === 'object') {
            prod.units = prod.units.map(u => u.Nama_Satuan || u.nama || u.name || '');
          }
          
          if (!prod.supplier_units && Array.isArray(prod.units) && prod.units.length > 0) {
            prod.supplier_units = {};
            
            prod.units.forEach(unit => {
              if (typeof unit === 'string') {
                prod.supplier_units[unit] = unit;
              }
            });
          }
          
          if (!prod.unit_prices) {
            prod.unit_prices = {};
            
            if (prod.prices && Array.isArray(prod.prices)) {
              prod.prices.forEach(price => {
                const unit = price.unit || price.Nama_Satuan || '';
                const value = price.value || price.Harga_Pokok || price.price || 0;
                if (unit) {
                  prod.unit_prices[unit] = value;
                }
              });
            } else if (prod.price || prod.harga_pokok) {
              const defaultPrice = prod.price || prod.harga_pokok || 0;
              if (prod.units && prod.units.length > 0) {
                prod.unit_prices[prod.units[0]] = defaultPrice;
              }
            }
          }
        });
      }
      
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'UNKNOWN'
      };
    }
  },
  
  // Create new product with all related data
  createProduct: async (data) => {
    if (USE_MOCK_DATA) {
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
      const response = await api.post('/api/product-items/', data);
      
      return response.data;
    } catch (error) {
      console.error(`Error creating product item: ${error.message}`);
      throw error;
    }
  },
  
  // Update product and related data
  updateProduct: async (id, data) => {
    if (USE_MOCK_DATA) {
      
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
      
      // Update units if provided, including supplier_units
      if (data.units) {
        mockData.productItems[index].units = data.units.map((unit, idx) => ({
          ID_Satuan: unit.ID_Satuan || mockData.productItems.flatMap(p => p.units).length + idx + 1,
          ID_Produk: Number(id),
          ...unit,
          // Ensure Satuan_Supplier is included
          Satuan_Supplier: unit.Satuan_Supplier || ''
        }));
      }
      
      // Update prices and map to the correct units
      if (data.prices) {
        const unitMap = {};
        mockData.productItems[index].units.forEach(unit => {
          unitMap[unit.Nama_Satuan] = unit.ID_Satuan;
        });
        
        mockData.productItems[index].prices = data.prices.map((price, idx) => {
          const unitId = unitMap[price.unitName];
          if (!unitId) {
            console.warn(`Unit ${price.unitName} not found for price mapping`);
          }
          return {
            ID_Harga: price.ID_Harga || mockData.productItems.flatMap(p => p.prices || []).length + idx + 1,
            ID_Produk: Number(id),
            ID_Satuan: unitId,
            Minimal_Qty: price.Minimal_Qty,
            Maksimal_Qty: price.Maksimal_Qty,
            Harga_Pokok: price.Harga_Pokok,
            Harga_Jual: price.Harga_Jual
          };
        });
      }
      
      // Update stocks and map to correct units
      if (data.stocks) {
        const unitMap = {};
        mockData.productItems[index].units.forEach(unit => {
          unitMap[unit.Nama_Satuan] = unit.ID_Satuan;
        });
        
        mockData.productItems[index].stocks = data.stocks.map((stock, idx) => {
          const unitId = unitMap[stock.unitName];
          if (!unitId) {
            console.warn(`Unit ${stock.unitName} not found for stock mapping`);
          }
          return {
            ID_Stok: stock.ID_Stok || mockData.productItems.flatMap(p => p.stocks || []).length + idx + 1,
            ID_Produk: Number(id),
            ID_Satuan: unitId,
            Jumlah_Stok: stock.Jumlah_Stok
          };
        });
      }
      
      return mockData.productItems[index];
    }
    
    try {
      
      
      // Make sure all units data includes supplier_units
      if (data.units) {
        data.units = data.units.map(unit => ({
          ...unit,
          Satuan_Supplier: unit.Satuan_Supplier || ''
        }));
      }
      
      // Format prices to have the correct unit IDs
      if (data.prices && data.units) {
        const unitMap = {};
        data.units.forEach(unit => {
          if (unit.ID_Satuan) {
            unitMap[unit.Nama_Satuan] = unit.ID_Satuan;
          }
        });
        
        // If we have IDs for the units, update the prices to reference them
        if (Object.keys(unitMap).length > 0) {
          data.prices = data.prices.map(price => {
            if (unitMap[price.unitName]) {
              return {
                ...price,
                ID_Satuan: unitMap[price.unitName]
              };
            }
            return price;
          });
        }
      }
      
      const response = await api.put(`/api/product-items/${id}`, data);
      
      return response.data;
    } catch (error) {
      console.error(`Error updating product item ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete product and all related data
  deleteProduct: async (id) => {
    if (USE_MOCK_DATA) {
      
      const index = mockData.productItems.findIndex(item => item.ID_Produk === Number(id));
      
      if (index === -1) {
        throw new Error(`Product item with ID ${id} not found`);
      }
      
      mockData.productItems.splice(index, 1);
      return { success: true };
    }
    
    try {
      
      const response = await api.delete(`/api/product-items/${id}`);
     
      return response.data;
    } catch (error) {
      console.error(`Error deleting product item ${id}: ${error.message}`);
      throw error;
    }
  },
  
  // Delete all products with confirmation code
  deleteAllProducts: async (confirmationCode, confirmationText) => {
    if (USE_MOCK_DATA) {
      return { success: true, message: 'All products would be deleted in production mode' };
    }
    
    try {
      
      const response = await api.delete('/api/product-items/delete-all/confirm', {
        data: { 
          confirmationCode,
          confirmationText
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error deleting all products: ${error.message}`);
      throw error;
    }
  },
  
  // Import products in bulk
  importProducts: async (data) => {
    if (USE_MOCK_DATA) {

      // Handle import logic for mock data if needed
      return { imported: data.products ? data.products.length : 0, failed: 0 };
    }
    
    try {
     
      const response = await api.post('/api/product-items/import', data);
      
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Export all products
  exportProducts: async (format = 'json') => {
    if (USE_MOCK_DATA) {
   
      return mockData.products;
    }
    
    try {
      
      
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

      // Handle import logic for mock data if needed
      return { imported: data.products ? data.products.length : 0, failed: 0 };
    }
    
    try {
      
      const response = await api.post('/api/product-items/import', data);
      
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

      const response = await api.get('/api/database/info');
      return response.data;
    } catch (error) {
      console.error(`Error fetching database info: ${error.message}`);
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

      const tableData = mockData[tableName] || [];
      return {
        name: tableName,
        records: tableData.length,
        lastUpdated: new Date().toISOString(),
        description: `Table for ${tableName}`
      };
    }
    
    try {
      const response = await api.get(`/api/database/tables/${tableName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching table ${tableName} info: ${error.message}`);
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

      const response = await api.get('/api/database/tables');

      return response.data;
    } catch (error) {
      console.error(`Error fetching all tables info: ${error.message}`);
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
