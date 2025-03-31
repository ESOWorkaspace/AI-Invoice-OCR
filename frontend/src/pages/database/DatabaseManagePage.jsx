import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import DatabaseTable from '../../components/DatabaseTable';
import { invoiceApi, rawOcrApi, productApi, databaseApi } from '../../services/api';
import Modal from '../../components/Modal';
import ProcessedInvoiceForm from '../../components/forms/ProcessedInvoiceForm';
import RawOCRDataForm from '../../components/forms/RawOCRDataForm';
import ProductForm from '../../components/forms/ProductForm';

// Get environment variables
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Database information (will be replaced with API data)
const databaseInfo = {
  name: 'invoice_ocr_db',
  type: 'PostgreSQL',
  version: '14.5',
  size: '256 MB',
  tables: 3,
  records: 0, // Will be updated dynamically
  lastBackup: '2025-03-30T02:15:00Z',
  status: 'Connected',
  uptime: '15 days, 7 hours'
};

// Tables data (will be replaced with API data)
const tables = [
  { 
    id: 'processed_invoices', 
    name: 'Processed Invoices', 
    records: 0, // Will be updated dynamically
    lastUpdated: '2025-03-30T14:23:45Z',
    description: 'Stores processed and edited invoice data from OCR',
    apiService: invoiceApi
  },
  { 
    id: 'raw_ocr_data', 
    name: 'Raw OCR Data', 
    records: 0, // Will be updated dynamically
    lastUpdated: '2025-03-28T09:12:30Z',
    description: 'Stores raw OCR data in JSON format',
    apiService: rawOcrApi
  },
  { 
    id: 'products', 
    name: 'Products', 
    records: 0, // Will be updated dynamically
    lastUpdated: '2025-03-29T16:45:20Z',
    description: 'Product master database with pricing information',
    apiService: productApi
  }
];

// Mock data for tables (will be replaced with API calls)
const mockTableData = {
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

// Table schema definitions
const tableSchemas = {
  processed_invoices: [
    { name: 'id', type: 'integer', primary: true, editable: false },
    { name: 'invoice_number', type: 'string', primary: false, editable: true },
    { name: 'document_type', type: 'string', primary: false, editable: true },
    { name: 'supplier_name', type: 'string', primary: false, editable: true },
    { name: 'invoice_date', type: 'date', primary: false, editable: true },
    { name: 'due_date', type: 'date', primary: false, editable: true },
    { name: 'payment_type', type: 'string', primary: false, editable: true },
    { name: 'include_tax', type: 'boolean', primary: false, editable: true },
    { name: 'salesman', type: 'string', primary: false, editable: true },
    { name: 'tax_rate', type: 'number', primary: false, editable: true },
    { name: 'items', type: 'json', primary: false, editable: true },
    { name: 'created_at', type: 'datetime', primary: false, editable: false },
    { name: 'updated_at', type: 'datetime', primary: false, editable: false }
  ],
  raw_ocr_data: [
    { name: 'id', type: 'integer', primary: true, editable: false },
    { name: 'invoice_number', type: 'string', primary: false, editable: true },
    { name: 'invoice_date', type: 'date', primary: false, editable: true },
    { name: 'raw_data', type: 'json', primary: false, editable: true },
    { name: 'created_at', type: 'datetime', primary: false, editable: false },
    { name: 'updated_at', type: 'datetime', primary: false, editable: false }
  ],
  products: [
    { name: 'id', type: 'integer', primary: true, editable: false },
    { name: 'product_code', type: 'string', primary: false, editable: true },
    { name: 'product_name', type: 'string', primary: false, editable: true },
    { name: 'category', type: 'string', primary: false, editable: true },
    { name: 'unit', type: 'string', primary: false, editable: true },
    { name: 'price', type: 'currency', primary: false, editable: true },
    { name: 'stock', type: 'number', primary: false, editable: true },
    { name: 'supplier_code', type: 'string', primary: false, editable: true },
    { name: 'barcode', type: 'string', primary: false, editable: true },
    { name: 'min_stock', type: 'number', primary: false, editable: true },
    { name: 'created_at', type: 'datetime', primary: false, editable: false },
    { name: 'updated_at', type: 'datetime', primary: false, editable: false }
  ]
};

// API endpoints
const API_ENDPOINTS = {
  processed_invoices: '/api/invoices',
  raw_ocr_data: '/api/raw-ocr',
  products: '/api/products'
};

export default function DatabaseManagePage() {
  const [selectedTable, setSelectedTable] = useState('processed_invoices');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Fetch table data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const tableInfo = tables.find(table => table.id === selectedTable);
        const response = await tableInfo.apiService.getAll();
        
        // Handle data that might be returned directly or inside a data property
        const data = response && response.data ? response.data : response;
        
        console.log(`Fetched data for ${selectedTable}:`, data);
        
        setTableData(Array.isArray(data) ? data : []);
        setTotalRecords(Array.isArray(data) ? data.length : 0);
        
        // Update table records count
        tables.forEach(table => {
          if (table.id === selectedTable) {
            table.records = Array.isArray(data) ? data.length : 0;
          }
        });
        
        setIsLoading(false);
        setCurrentPage(1); // Reset to first page when changing tables
        setSearchTerm(''); // Clear search when changing tables
        setEditingRow(null); // Clear any editing state
        setEditedData({}); // Clear edited data
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTable]);
  
  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Format value based on type
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'date':
        return formatDate(value);
      case 'datetime':
        return format(new Date(value), 'dd-MM-yyyy HH:mm');
      case 'currency':
        return formatCurrency(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'json':
        try {
          const jsonObj = typeof value === 'string' ? JSON.parse(value) : value;
          return `[JSON Object]`;
        } catch (e) {
          return '[Invalid JSON]';
        }
      default:
        return value.toString();
    }
  };
  
  // Get current schema
  const currentSchema = tableSchemas[selectedTable] || [];
  
  // Get current table info
  const currentTableInfo = tables.find(table => table.id === selectedTable) || {};
  
  // Handle save record
  const handleSaveRecord = async (editedRecord) => {
    try {
      setIsLoading(true);
      
      // Create a deep copy of the record to modify
      const recordToUpdate = JSON.parse(JSON.stringify(editedRecord));
      
      // Process special fields like items that need JSON handling
      Object.keys(recordToUpdate).forEach(key => {
        // Handle items field specifically
        if (key === 'items') {
          try {
            // If items is a string, ensure it's valid JSON
            if (typeof recordToUpdate.items === 'string') {
              // Parse and stringify to validate JSON format
              const parsedItems = JSON.parse(recordToUpdate.items);
              
              // Log the parsed items for debugging
              console.log('Parsed items:', parsedItems);
              
              // Keep it as a string for the API
              recordToUpdate.items = JSON.stringify(parsedItems);
            } 
            // If items is already an object, stringify it for the API
            else if (typeof recordToUpdate.items === 'object' && recordToUpdate.items !== null) {
              recordToUpdate.items = JSON.stringify(recordToUpdate.items);
            }
          } catch (e) {
            console.error('Invalid JSON in items field:', e);
            toast.error('Invalid JSON format in items field');
            setIsLoading(false);
            return;
          }
        }
        
        // Handle other JSON string fields
        if (typeof recordToUpdate[key] === 'string') {
          try {
            // Check if the string is JSON
            JSON.parse(recordToUpdate[key]);
            // If it parses successfully, it's already in the correct format
          } catch (e) {
            // Not JSON, leave as is
          }
        }
      });
      
      console.log('Saving record:', recordToUpdate);
      
      const tableInfo = tables.find(table => table.id === selectedTable);
      const response = await tableInfo.apiService.update(recordToUpdate.id, recordToUpdate);
      
      console.log('Update response:', response);
      
      // Update local state with the response from the server
      setTableData(prev => 
        prev.map(record => 
          record.id === editedRecord.id ? response || editedRecord : record
        )
      );
      
      setIsLoading(false);
      toast.success('Record updated successfully');
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error(`Failed to update record: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };
  
  // Handle delete record
  const handleDeleteRecord = async (id) => {
    try {
      setIsLoading(true);
      
      const tableInfo = tables.find(table => table.id === selectedTable);
      
      if (USE_MOCK_DATA) {
        await tableInfo.apiService.delete(id);
        
        // Update local state
        setTableData(prev => prev.filter(record => record.id !== id));
        
        // Update table records count
        tables.forEach(table => {
          if (table.id === selectedTable) {
            table.records -= 1;
          }
        });
        
        setIsLoading(false);
        toast.success('Record deleted successfully');
        return;
      }
      
      // Real API call
      console.log(`Deleting record with ID ${id} from ${selectedTable}`);
      const response = await tableInfo.apiService.delete(id);
      console.log('Delete response:', response);
      
      // Update local state
      setTableData(prev => prev.filter(record => record.id !== id));
      
      // Update table records count
      tables.forEach(table => {
        if (table.id === selectedTable) {
          table.records -= 1;
        }
      });
      
      setIsLoading(false);
      toast.success('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error(`Failed to delete record: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
      
      // Refresh the data to ensure UI is in sync with backend
      const fetchData = async () => {
        try {
          const tableInfo = tables.find(table => table.id === selectedTable);
          const response = await tableInfo.apiService.getAll();
          
          // Handle data that might be returned directly or inside a data property
          const data = response && response.data ? response.data : response;
          
          console.log(`Refreshed data after delete error for ${selectedTable}:`, data);
          
          setTableData(Array.isArray(data) ? data : []);
          setTotalRecords(Array.isArray(data) ? data.length : 0);
        } catch (refreshError) {
          console.error('Error refreshing data after delete failure:', refreshError);
        }
      };
      
      fetchData();
    }
  };
  
  // Handle add new record
  const handleAddRecord = () => {
    setModalMode('add');
    setSelectedRecord(null);
    setIsModalOpen(true);
  };
  
  // Handle edit record
  const handleEditRecord = (record) => {
    setModalMode('edit');
    setSelectedRecord(record);
    setIsModalOpen(true);
  };
  
  // Handle form success
  const handleFormSuccess = (data) => {
    setIsModalOpen(false);
    
    // Refresh the table data
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const tableInfo = tables.find(table => table.id === selectedTable);
        const response = await tableInfo.apiService.getAll();
        
        // Handle data that might be returned directly or inside a data property
        const data = response && response.data ? response.data : response;
        
        console.log(`Refreshed data for ${selectedTable}:`, data);
        
        setTableData(Array.isArray(data) ? data : []);
        setTotalRecords(Array.isArray(data) ? data.length : 0);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  };
  
  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };
  
  // Get modal title based on table and mode
  const getModalTitle = () => {
    const action = modalMode === 'add' ? 'Add New' : 'Edit';
    const tableName = tables.find(table => table.id === selectedTable)?.name || '';
    return `${action} ${tableName.slice(0, -1)}`; // Remove 's' from the end
  };
  
  // Render form based on selected table
  const renderForm = () => {
    switch (selectedTable) {
      case 'processed_invoices':
        return (
          <ProcessedInvoiceForm 
            invoice={modalMode === 'edit' ? selectedRecord : null}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        );
      case 'raw_ocr_data':
        return (
          <RawOCRDataForm 
            ocrData={modalMode === 'edit' ? selectedRecord : null}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        );
      case 'products':
        return (
          <ProductForm 
            product={modalMode === 'edit' ? selectedRecord : null}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModal}
          />
        );
      default:
        return <p>No form available for this table</p>;
    }
  };
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setIsLoading(true);
    
    try {
      const tableInfo = tables.find(table => table.id === selectedTable);
      const response = await tableInfo.apiService.getAll();
      
      // Handle data that might be returned directly or inside a data property
      const data = response && response.data ? response.data : response;
      
      console.log(`Refreshed data for ${selectedTable}:`, data);
      
      setTableData(Array.isArray(data) ? data : []);
      setTotalRecords(Array.isArray(data) ? data.length : 0);
      
      setIsLoading(false);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to refresh data');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Database Management</h1>
        <p className="text-gray-600 mt-2">Manage database tables and records</p>
      </div>
      
      {/* Database Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Database Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Database</h3>
                <p className="text-lg font-semibold text-gray-800">{databaseInfo.name}</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="text-lg font-semibold text-gray-800">{databaseInfo.status}</p>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tables</h3>
                <p className="text-lg font-semibold text-gray-800">{databaseInfo.tables}</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
                <p className="text-lg font-semibold text-gray-800">{databaseInfo.records}</p>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Uptime</h3>
                <p className="text-lg font-semibold text-gray-800">{databaseInfo.uptime}</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-indigo-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Backup</h3>
                <p className="text-lg font-semibold text-gray-800">{formatDate(databaseInfo.lastBackup)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Backup Database
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
            Optimize Database
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
            Check Integrity
          </button>
        </div>
      </div>
      
      {/* Table Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Table</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tables.map(table => (
            <div 
              key={table.id}
              onClick={() => setSelectedTable(table.id)}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                selectedTable === table.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <h3 className="font-medium text-gray-800">{table.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{table.records} records</p>
              <p className="text-xs text-gray-400 mt-2">Last updated: {formatDate(table.lastUpdated)}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected Table Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{currentTableInfo.name} Table</h2>
            <p className="text-gray-600 mt-1">{currentTableInfo.description}</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={handleAddRecord}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Add New Record
            </button>
            <button 
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
            <button 
              onClick={() => toast.info('Export table functionality will be implemented soon')}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Export Table
            </button>
          </div>
        </div>
        
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Search ${currentTableInfo.name}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Items per page selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show</span>
            <select 
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
        </div>
        
        {/* Database Table Component */}
        <DatabaseTable 
          data={tableData}
          schema={currentSchema}
          isLoading={isLoading}
          searchTerm={searchTerm}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onSave={handleSaveRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleEditRecord}
        />
      </div>
      
      {/* Modal for adding/editing records */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
        size="lg"
        showFooter={false}
      >
        {renderForm()}
      </Modal>
    </div>
  );
}
