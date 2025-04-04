import React, { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender
} from '@tanstack/react-table';
import Modal from 'react-modal';
import ProductForm from '../../components/forms/ProductForm';
import { debounce } from 'lodash';
import { productItemApi } from '../../services/api';
import Papa from 'papaparse';

// Set appElement for react-modal
Modal.setAppElement('#root');

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export default function ProductsPage() {
  // State for data loading
  const [productData, setProductData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalItems, setTotalItems] = useState(0);
  const [sorting, setSorting] = useState([{ id: 'Kode_Item', desc: false }]);

  // Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'delete', 'import'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');

  // State for product import
  const [importFile, setImportFile] = useState(null);
  const [importFileType, setImportFileType] = useState(null);
  const [importValidation, setImportValidation] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Data loading function
  const fetchProducts = async () => {
    setIsLoading(true);
    
    try {
      let response;
      
      if (USE_MOCK_DATA) {
        // Simulate network delay in development
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use mock data for development - restore mock data structure
        response = {
          data: [
            {
              ID_Produk: 1,
              Kode_Item: 'P001',
              Nama_Item: 'Indomie Goreng',
              Jenis: 'Mie Instan',
              variants: [
                { ID_Varian: 1, Deskripsi: 'Original' },
                { ID_Varian: 2, Deskripsi: 'Pedas' }
              ],
              units: [
                { ID_Satuan: 1, Nama_Satuan: 'pcs', Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: 'piece', Threshold_Margin: 20.0 },
                { ID_Satuan: 2, Nama_Satuan: 'dus', Jumlah_Dalam_Satuan_Dasar: 40, Satuan_Supplier: 'box', Threshold_Margin: 25.0 }
              ],
              prices: [
                { ID_Satuan: 1, Harga_Pokok: 8000, Harga_Pokok_Sebelumnya: 7500, Harga_Jual: 10000 },
                { ID_Satuan: 2, Harga_Pokok: 320000, Harga_Pokok_Sebelumnya: 300000, Harga_Jual: 400000 }
              ],
              stocks: [
                { ID_Satuan: 1, Jumlah_Stok: 120 },
                { ID_Satuan: 2, Jumlah_Stok: 3 }
              ]
            },
            {
              ID_Produk: 2,
              Kode_Item: 'P002',
              Nama_Item: 'Beras Pandan Wangi',
              Jenis: 'Beras',
              variants: [],
              units: [
                { ID_Satuan: 3, Nama_Satuan: 'kg', Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: 'kilo', Threshold_Margin: 15.0 },
                { ID_Satuan: 4, Nama_Satuan: 'karung', Jumlah_Dalam_Satuan_Dasar: 25, Satuan_Supplier: 'bag', Threshold_Margin: 22.0 }
              ],
              prices: [
                { ID_Satuan: 3, Harga_Pokok: 12000, Harga_Pokok_Sebelumnya: 11500, Harga_Jual: 15000 },
                { ID_Satuan: 4, Harga_Pokok: 300000, Harga_Pokok_Sebelumnya: 287500, Harga_Jual: 375000 }
              ],
              stocks: [
                { ID_Satuan: 3, Jumlah_Stok: 75 },
                { ID_Satuan: 4, Jumlah_Stok: 3 }
              ]
            },
            {
              ID_Produk: 3,
              Kode_Item: '123ABC',
              Nama_Item: 'Numeric First Product',
              Jenis: 'Test',
              variants: [],
              units: [
                { ID_Satuan: 5, Nama_Satuan: 'pcs', Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: 'piece', Threshold_Margin: 33.0 }
              ],
              prices: [
                { ID_Satuan: 5, Harga_Pokok: 5000, Harga_Pokok_Sebelumnya: 4800, Harga_Jual: 7500 }
              ],
              stocks: [
                { ID_Satuan: 5, Jumlah_Stok: 50 }
              ]
            },
            {
              ID_Produk: 4,
              Kode_Item: '#Special',
              Nama_Item: 'Special Char First',
              Jenis: 'Test',
              variants: [],
              units: [
                { ID_Satuan: 6, Nama_Satuan: 'pcs', Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: 'item', Threshold_Margin: 28.0 }
              ],
              prices: [
                { ID_Satuan: 6, Harga_Pokok: 9000, Harga_Pokok_Sebelumnya: 8500, Harga_Jual: 12000 }
              ],
              stocks: [
                { ID_Satuan: 6, Jumlah_Stok: 25 }
              ]
            }
          ],
          total: 4,
          page: 1,
          limit: 10
        };
        
        let productsData = Array.isArray(response.data) ? response.data : [];
        
        // Apply client-side sorting
        if (sorting.length > 0) {
          const sort = sorting[0];
          productsData = sortProducts(productsData, sort.id, sort.desc ? 'desc' : 'asc');
        } else {
          // Default sort by Kode_Item using alphanumeric order
          productsData = sortProducts(productsData, 'Kode_Item', 'asc');
        }
        
        // Apply search filter
        if (searchTerm && searchTerm.trim() !== '') {
          const query = searchTerm.toLowerCase();
          productsData = productsData.filter(product => 
            product.Kode_Item.toLowerCase().includes(query) || 
            product.Nama_Item.toLowerCase().includes(query)
          );
        }
        
        setProductData(productsData);
        setTotalItems(response.total || productsData.length);
      } else {
        // Build query parameters for pagination, sorting and filtering
        const params = new URLSearchParams();
        params.append('page', pagination.pageIndex + 1); // API uses 1-based indexing
        params.append('limit', pagination.pageSize);
        
        if (searchTerm && searchTerm.trim() !== '') {
          params.append('search', searchTerm);
        }
        
        if (sorting.length > 0) {
          const sort = sorting[0];
          params.append('sortField', sort.id);
          params.append('sortOrder', sort.desc ? 'DESC' : 'ASC');
        } else {
          // Default sort by Kode_Item using alphanumeric order
          params.append('sortField', 'Kode_Item');
          params.append('sortOrder', 'ASC');
        }
        
        response = await productItemApi.getAllProducts(params);
        console.log('API Response:', response);
        
        // Check if response has data property
        let productsData = [];
        let total = 0;
        
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            productsData = response.data;
            total = response.total || productsData.length;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            productsData = response.data.data;
            total = response.data.total || productsData.length;
          }
        } else if (Array.isArray(response)) {
          productsData = response;
          total = productsData.length;
        }
        
        // Apply client-side alphanumeric sorting for the Kode_Item field
        if ((!sorting.length || sorting[0].id === 'Kode_Item') && productsData.length > 0) {
          productsData = sortProducts(productsData, 'Kode_Item', sorting.length ? (sorting[0].desc ? 'desc' : 'asc') : 'asc');
        }
        
        setProductData(productsData);
        setTotalItems(total);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(`Failed to load products: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Alphanumeric sort function that puts numbers and special characters before letters
  const alphanumericSort = (a, b) => {
    // Handle null values
    if (!a) return -1;
    if (!b) return 1;
    
    // Convert to strings
    const strA = String(a);
    const strB = String(b);
    
    // Split strings into segments of letters and digits
    const segmentsA = strA.match(/[0-9]+|[^0-9]+/g) || [];
    const segmentsB = strB.match(/[0-9]+|[^0-9]+/g) || [];
    
    const minLength = Math.min(segmentsA.length, segmentsB.length);
    
    // Compare each segment
    for (let i = 0; i < minLength; i++) {
      const segA = segmentsA[i];
      const segB = segmentsB[i];
      
      // Check if both segments are numeric
      const isNumA = /^[0-9]+$/.test(segA);
      const isNumB = /^[0-9]+$/.test(segB);
      
      if (isNumA && isNumB) {
        // If both are numbers, compare numerically
        const numA = parseInt(segA, 10);
        const numB = parseInt(segB, 10);
        if (numA !== numB) {
          return numA - numB;
        }
      } else if (isNumA) {
        // If A is number and B is not, A comes first
        return -1;
      } else if (isNumB) {
        // If B is number and A is not, B comes first
        return 1;
      } else {
        // For non-numeric segments, compare as strings
        // Handle special characters by keeping their ASCII order (which is before alphabetic chars)
        if (segA !== segB) {
          return segA.localeCompare(segB);
        }
      }
    }
    
    // If all compared segments are equal, shorter string comes first
    return segmentsA.length - segmentsB.length;
  };

  // Helper function to sort products
  const sortProducts = (products, field, direction) => {
    if (!Array.isArray(products) || products.length === 0) return products;
    
    const sortedProducts = [...products];
    const directionMultiplier = direction === 'asc' ? 1 : -1;
    
    sortedProducts.sort((a, b) => {
      if (field === 'Kode_Item') {
        return directionMultiplier * alphanumericSort(a[field], b[field]);
      }
      
      // Default string comparison for other fields
      if (a[field] < b[field]) return -1 * directionMultiplier;
      if (a[field] > b[field]) return 1 * directionMultiplier;
      return 0;
    });
    
    return sortedProducts;
  };

  // Table columns definition 
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper();
    
    return [
      // Expander column
      columnHelper.display({
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              {...{
                onClick: row.getToggleExpandedHandler(),
                className: 'px-2 py-1 bg-gray-100 rounded-md',
              }}
            >
              {row.getIsExpanded() ? 
                <ChevronUpIcon className="w-4 h-4" /> : 
                <ChevronDownIcon className="w-4 h-4" />
              }
            </button>
          ) : null;
        },
        enableSorting: false,
      }),
      
      columnHelper.accessor('Kode_Item', {
        header: 'Kode Item',
        cell: info => {
          // Handle scientific notation by converting to string
          const value = info.getValue();
          
          // If the value is a number and would be displayed in scientific notation, format it
          let displayValue = value;
          
          if (typeof value === 'number' || !isNaN(Number(value))) {
            // Check if it's a large number that might be formatted as scientific notation
            const numValue = Number(value);
            if (numValue > 1e10) { // Scientific notation usually kicks in around 10^10
              displayValue = numValue.toString();
            }
          }
          
          return <div className="font-medium text-gray-900">{displayValue}</div>;
        },
        sortingFn: 'alphanumeric' // Use the custom alphanumeric sorting function
      }),
      {
        accessorKey: 'Nama_Item',
        header: 'Nama Item',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original.Nama_Item}</div>
        ),
      },
      {
        accessorKey: 'Jenis',
        header: 'Jenis',
        cell: ({ row }) => (
          <div className="px-2 py-1 bg-gray-100 rounded text-center">
            {row.original.Jenis || '-'}
          </div>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier Code',
        cell: ({ row }) => (
          <div>{row.original.Supplier_Code || '-'}</div>
        ),
      },
      {
        id: 'supplierName',
        header: 'Supplier Name',
        cell: ({ row }) => (
          <div>{row.original.Supplier_Name || '-'}</div>
        ),
      },
      {
        id: 'baseUnit',
        header: 'Base Unit',
        cell: ({ row }) => {
          const units = row.original.units || [];
          const baseUnit = units.find(unit => unit.Jumlah_Dalam_Satuan_Dasar === 1) || units[0];
          return (
            <div>
              {baseUnit ? (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {baseUnit.Nama_Satuan}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'basePrice',
        header: 'Base Price',
        cell: ({ row }) => {
          const units = row.original.units || [];
          const prices = row.original.prices || [];
          
          // Find the base unit (with conversion of 1)
          const baseUnit = units.find(unit => unit.Jumlah_Dalam_Satuan_Dasar === 1) || units[0];
          
          if (!baseUnit) return <span className="text-gray-400">-</span>;
          
          // Find the price for the base unit
          const price = prices.find(p => 
            p.unitName === baseUnit.Nama_Satuan || p.ID_Satuan === baseUnit.ID_Satuan
          );
          
          return (
            <div>
              {price ? (
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID').format(price.Harga_Pokok)}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'baseStock',
        header: 'Stock',
        cell: ({ row }) => {
          const units = row.original.units || [];
          const stocks = row.original.stocks || [];
          
          // Find the base unit (with conversion of 1)
          const baseUnit = units.find(unit => unit.Jumlah_Dalam_Satuan_Dasar === 1) || units[0];
          
          if (!baseUnit) return <span className="text-gray-400">-</span>;
          
          // Find the stock for the base unit
          const stock = stocks.find(s => 
            s.unitName === baseUnit.Nama_Satuan || s.ID_Satuan === baseUnit.ID_Satuan
          );
          
          const stockLevel = stock ? parseFloat(stock.Jumlah_Stok) : 0;
          
          // Determine color based on stock level
          let colorClass = 'text-red-600';
          if (stockLevel > 10) {
            colorClass = 'text-green-600';
          } else if (stockLevel > 0) {
            colorClass = 'text-orange-500';
          }
          
          return (
            <div>
              {stock ? (
                <span className={`font-medium ${colorClass}`}>
                  {new Intl.NumberFormat('id-ID').format(stock.Jumlah_Stok)}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'lastUpdated',
        header: 'Last Updated',
        cell: ({ row }) => {
          if (!row.original.updatedAt && !row.original.updated_at) return <span className="text-gray-400">-</span>;
          
          const date = new Date(row.original.updatedAt || row.original.updated_at);
          const now = new Date();
          const diffTime = Math.abs(now - date);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          let dateFormat = date.toLocaleDateString();
          
          // If less than 7 days, show relative time
          if (diffDays < 7) {
            if (diffDays === 0) {
              dateFormat = 'Today';
            } else if (diffDays === 1) {
              dateFormat = 'Yesterday';
            } else {
              dateFormat = `${diffDays} days ago`;
            }
          }
          
          return (
            <div className="text-sm text-gray-600">
              {dateFormat}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          return (
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditProduct(row.original)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded-md"
                title="Edit"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeleteProduct(row.original)}
                className="p-1 text-red-600 hover:bg-red-100 rounded-md"
                title="Delete"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ];
  }, []);

  // Define a rendering component for expanded rows
  const renderSubComponent = useCallback(({ row }) => {
    const product = row.original;
    
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Info */}
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Product ID:</span>
                <span className="font-medium text-gray-800">{product.ID_Produk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="font-medium text-gray-800">
                  {product.createdAt || product.created_at 
                    ? new Date(product.createdAt || product.created_at).toLocaleString() 
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="font-medium text-gray-800">
                  {product.updatedAt || product.updated_at 
                    ? new Date(product.updatedAt || product.updated_at).toLocaleString() 
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier Code:</span>
                <span className="font-medium text-gray-800">{product.Supplier_Code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier Name:</span>
                <span className="font-medium text-gray-800">{product.Supplier_Name || '-'}</span>
              </div>
            </div>
          </div>
          
          {/* Variants */}
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Variants</h3>
            {product.variants && product.variants.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {product.variants.map((variant, idx) => (
                  <div key={idx} className="px-3 py-2 bg-gray-100 rounded-md flex justify-between">
                    <span className="font-medium text-gray-800">{variant.Deskripsi}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No variants available</p>
            )}
          </div>
          
          {/* Units */}
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Units</h3>
            {product.units && product.units.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Unit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {product.units.map((unit, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                          {unit.Nama_Satuan}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                          {unit.Jumlah_Dalam_Satuan_Dasar === 1 ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Base
                            </span>
                          ) : (
                            <span>
                              {unit.Jumlah_Dalam_Satuan_Dasar || 1}x base
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                          {unit.Satuan_Supplier || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No units available</p>
            )}
          </div>
          
          {/* Prices */}
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Prices</h3>
            {product.prices && product.prices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {product.prices.map((price, idx) => {
                      const costPrice = parseFloat(price.Harga_Pokok) || 0;
                      const prevCostPrice = parseFloat(price.Harga_Pokok_Sebelumnya) || 0;
                      const sellPrice = parseFloat(price.Harga_Jual) || 0;
                      const margin = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0;
                      
                      // Find matching unit to get threshold margin
                      const unitItem = product.units && product.units.find(u => u.ID_Satuan === price.ID_Satuan);
                      const thresholdMargin = unitItem && unitItem.Threshold_Margin !== undefined ? 
                        parseFloat(unitItem.Threshold_Margin) : null;
                      
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                            {price.unitName || 
                              (product.units && product.units.find(u => u.ID_Satuan === price.ID_Satuan)?.Nama_Satuan) || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                            {costPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                            {prevCostPrice > 0 ? prevCostPrice.toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                            {sellPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {thresholdMargin !== null ? 
                              <span className={thresholdMargin >= 30 ? 'text-green-600' : thresholdMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                                {thresholdMargin.toFixed(1)}%
                              </span> : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No prices available</p>
            )}
          </div>
        </div>
      </div>
    );
  }, []);

  // Set up the table instance
  const table = useReactTable({
    data: productData,
    columns,
    pageCount: Math.ceil(totalItems / pagination.pageSize) || 1,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    getRowCanExpand: (row) => {
      const hasVariants = row.original.variants && row.original.variants.length > 0;
      const hasUnits = row.original.units && row.original.units.length > 0;
      return hasVariants || hasUnits;
    },
    sortingFns: {
      alphanumeric: (rowA, rowB, columnId) => {
        return alphanumericSort(rowA.getValue(columnId), rowB.getValue(columnId));
      }
    },
  });

  // Load data on initial render and when pagination or sorting changes
  useEffect(() => {
    fetchProducts();
  }, [pagination, sorting, searchTerm]);

  // Handle search with debounce
  const handleSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Handle adding a new product
  const handleAddProduct = () => {
    setModalMode('add');
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  // Handle editing a product
  const handleEditProduct = (product) => {
    // Make sure to deeply clone the product to avoid direct state modification
    const productToEdit = structuredClone(product);
    
    // Check if we have all related data, fetch if needed
    const fetchMissingData = async () => {
      try {
        // If we're in mock mode or if the ID doesn't exist, just use what we have
        if (USE_MOCK_DATA || !productToEdit.ID_Produk) {
          prepareProductForEdit(productToEdit);
          return;
        }
        
        // Fetch complete product data to ensure we have all related info
        const completeProduct = await productItemApi.getProductById(productToEdit.ID_Produk);
        prepareProductForEdit(completeProduct);
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Could not load product details. Using partial data.');
        prepareProductForEdit(productToEdit);
      }
    };
    
    const prepareProductForEdit = (data) => {
      // Ensure all related data is properly formatted for the form
      if (!data.units || !Array.isArray(data.units)) data.units = [];
      if (!data.variants || !Array.isArray(data.variants)) data.variants = [];
      if (!data.prices || !Array.isArray(data.prices)) data.prices = [];
      if (!data.stocks || !Array.isArray(data.stocks)) data.stocks = [];
      
      // Set the selected product and modal mode
      setSelectedProduct(data);
      setModalMode('edit');
      setIsProductModalOpen(true);
    };
    
    fetchMissingData();
  };

  // Handle deleting a product
  const handleDeleteProduct = async (product) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        if (USE_MOCK_DATA) {
          // Simulate delete in mock mode
          setProductData((prev) => prev.filter((p) => p.ID_Produk !== product.ID_Produk));
          toast.success('Product deleted successfully');
        } else {
          await productItemApi.deleteProduct(product.ID_Produk);
          toast.success('Product deleted successfully');
          fetchProducts(); // Refresh the list
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    setIsProductModalOpen(false);
    fetchProducts(); // Refresh the list
  };

  // Handle importing products
  const handleImportProducts = () => {
    setIsImporting(false);
    setImportFile(null);
    setImportValidation(null);
    setImportStats(null);
    setImportProgress(0); 
    setImportError(null);
    setIsImportModalOpen(true);
  };

  // Handle exporting products
  const handleExportProducts = async (format = 'json') => {
    setIsLoading(true);
    try {
      await productItemApi.exportProducts(format);
      toast.success(`Products exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle downloading sample JSON structure
  const handleDownloadSampleJson = () => {
    // Sample JSON structure for product import
    const sampleJson = {
      products: [
        {
          product: {
            Kode_Item: "SAMPLE001",
            Nama_Item: "Sample Product 1",
            Jenis: "Sample Category"
          },
          variants: [
            { Deskripsi: "Variant 1" },
            { Deskripsi: "Variant 2" }
          ],
          units: [
            { Nama_Satuan: "pcs", Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: "piece", Threshold_Margin: 20.0 },
            { Nama_Satuan: "box", Jumlah_Dalam_Satuan_Dasar: 12, Satuan_Supplier: "carton", Threshold_Margin: 25.0 }
          ],
          prices: [
            { unitName: "pcs", Minimal_Qty: 1, Maksimal_Qty: 11, Harga_Pokok: 8000, Harga_Pokok_Sebelumnya: 7800, Harga_Jual: 10000 },
            { unitName: "pcs", Minimal_Qty: 12, Maksimal_Qty: null, Harga_Pokok: 7500, Harga_Pokok_Sebelumnya: 7200, Harga_Jual: 9000 },
            { unitName: "box", Minimal_Qty: 1, Maksimal_Qty: null, Harga_Pokok: 90000, Harga_Pokok_Sebelumnya: 86400, Harga_Jual: 108000 }
          ],
          stocks: [
            { unitName: "pcs", Jumlah_Stok: 120 },
            { unitName: "box", Jumlah_Stok: 10 }
          ]
        },
        {
          product: {
            Kode_Item: "SAMPLE002",
            Nama_Item: "Sample Product 2",
            Jenis: "Another Category"
          },
          variants: [],
          units: [
            { Nama_Satuan: "kg", Jumlah_Dalam_Satuan_Dasar: 1, Satuan_Supplier: "kilo", Threshold_Margin: 15.0 },
            { Nama_Satuan: "sack", Jumlah_Dalam_Satuan_Dasar: 25, Satuan_Supplier: "bag", Threshold_Margin: 18.0 }
          ],
          prices: [
            { unitName: "kg", Minimal_Qty: 1, Maksimal_Qty: 24, Harga_Pokok: 25000, Harga_Pokok_Sebelumnya: 24000, Harga_Jual: 30000 },
            { unitName: "sack", Minimal_Qty: 1, Maksimal_Qty: null, Harga_Pokok: 290000, Harga_Pokok_Sebelumnya: 280000, Harga_Jual: 350000 }
          ],
          stocks: [
            { unitName: "kg", Jumlah_Stok: 75 },
            { unitName: "sack", Jumlah_Stok: 3 }
          ]
        }
      ]
    };

    // Create a Blob from the JSON data
    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: 'application/json' });

    // Create a download link and trigger the download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_sample.json';
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Sample JSON structure downloaded');
  };

  // Handle downloading sample CSV
  const handleDownloadSampleCsv = () => {
    // Create CSV header with new fields
    const csvHeader = 'Kode_Item,Nama_Item,Jenis,Supplier_Code,Unit_1,Unit_2,Unit_3,Unit_1_Supplier,Unit_2_Supplier,Unit_3_Supplier,Unit_1_Qty,Unit_2_Qty,Unit_3_Qty,Unit_1_Price,Unit_2_Price,Unit_3_Price,Unit_1_PrevPrice,Unit_2_PrevPrice,Unit_3_PrevPrice,Unit_1_Threshold,Unit_2_Threshold,Unit_3_Threshold,Unit_1_Stock,Unit_2_Stock,Unit_3_Stock\n';

    // Create sample data rows with new fields
    const sampleRows = [
      '010101001S,"Cimory UHT 125ml Chocolate (40)",Susu,SUP001,pcs,lsn,krt,piece,dozen,carton,1,12,40,3000,32500,107000,2850,31000,102000,20,22,25,150,12.5,3.75',
      '010102002X,"Cimory UHT 125ml Strawberry (40)",Susu,SUP001,pcs,lsn,krt,piece,dozen,carton,1,12,40,3000,32500,107000,2900,31500,104000,18,20,23,200,16.67,5',
      '010103003K,"Cimory UHT 125ml Vanilla (40)",Susu,SUP001,pcs,lsn,krt,piece,dozen,carton,1,12,40,3000,32500,107000,2950,32000,106000,15,18,20,148,12.33,3.7'
    ].join('\n');

    // Combine header and rows
    const csvContent = csvHeader + sampleRows;

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_products_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Sample CSV template downloaded');
  };

  // Handle deleting all products
  const handleDeleteAllProducts = () => {
    // Generate a random confirmation code
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setConfirmationCode(randomCode);
    setConfirmationInput('');
    setIsDeleteModalOpen(true);
  };

  // Handle confirmation of deleting all products
  const handleConfirmDeleteAll = async () => {
    const expectedConfirmation = `${confirmationCode} DELETE-ALL-PRODUCTS-CONFIRM`;
    
    if (confirmationInput !== expectedConfirmation) {
      toast.error('Invalid confirmation code. Please try again.');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      if (USE_MOCK_DATA) {
        setProductData([]);
        toast.success('All products deleted successfully.');
      } else {
        await productItemApi.deleteAllProducts(confirmationCode, confirmationInput);
        toast.success('All products deleted successfully.');
        fetchProducts();
      }
      
      setIsDeleteModalOpen(false);
      setConfirmationInput('');
      // Generate a new confirmation code for next time
      setConfirmationCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    } catch (error) {
      console.error('Error deleting all products:', error);
      toast.error(`Failed to delete all products: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle importing products from a file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type 
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'json' && fileExtension !== 'csv') {
      toast.error('Please upload a JSON or CSV file.');
      return;
    }
    
    setImportFile(file);
    setImportFileType(fileExtension);
    setImportValidation(null);
    setImportStats(null);
    setImportProgress(0);
    setImportError(null);
  };

  // Handle file validation
  const validateFile = async () => {
    if (!importFile) {
      toast.error('Please upload a file first');
      return;
    }
    
    setIsValidating(true);
    
    try {
      // Parse the file based on type
      let data;
      
      if (importFileType === 'json') {
        data = await parseJsonFile(importFile);
      } else if (importFileType === 'csv') {
        data = await parseCsvFile(importFile);
      } else {
        toast.error('Unsupported file format');
        setIsValidating(false);
        return;
      }
      
      // Validate the structure
      if (!data || !data.products || !Array.isArray(data.products)) {
        setImportValidation({
          isValid: false,
          totalItems: 0,
          validItems: 0,
          invalidItems: 0,
          issues: [{
            item: null,
            reason: 'File format is invalid. The file must contain a "products" array.'
          }]
        });
        setIsValidating(false);
        return;
      }
      
      // Validate each product
      const products = data.products;
      const issues = [];
      const validItems = [];
      
      for (let i = 0; i < products.length; i++) {
        const item = products[i];
        
        // Check for required fields
        if (!item.product || !item.product.Kode_Item) {
          issues.push({
            item: item,
            reason: `Product at index ${i} is missing required field: Kode_Item`
          });
          continue;
        }
        
        if (!item.product.Nama_Item) {
          issues.push({
            item: item,
            reason: `Product at index ${i} is missing required field: Nama_Item`
          });
          continue;
        }
        
        // Check units
        if (!item.units || !Array.isArray(item.units) || item.units.length === 0) {
          issues.push({
            item: item,
            reason: `Product "${item.product.Kode_Item}" must have at least one unit`
          });
          continue;
        }
        
        // Check if at least one unit has base conversion = 1
        const hasBaseUnit = item.units.some(unit => 
          unit.Jumlah_Dalam_Satuan_Dasar === 1 || 
          parseFloat(unit.Jumlah_Dalam_Satuan_Dasar) === 1
        );
        
        if (!hasBaseUnit) {
          issues.push({
            item: item,
            reason: `Product "${item.product.Kode_Item}" must have at least one unit with base conversion = 1`
          });
          continue;
        }
        
        // Check product code length
        if (item.product.Kode_Item.length > 100) {
          issues.push({
            item: item,
            reason: `Product code "${item.product.Kode_Item}" exceeds maximum length of 100 characters`
          });
          continue;
        }
        
        // Item passes validation
        validItems.push(item);
      }
      
      // Build validation result
      setImportValidation({
        isValid: issues.length === 0,
        totalItems: products.length,
        validItems: validItems.length,
        invalidItems: issues.length,
        issues: issues,
        validProducts: validItems
      });
      
    } catch (error) {
      console.error('Error validating file:', error);
      setImportError(`Error validating file: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Parse CSV text into array of objects
  const parseCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            // Group the parsed products by product code
            const groupedProducts = {};
            
            results.data.forEach(row => {
              if (!row.Kode_Item) return; // Skip rows without product code
              
              if (!groupedProducts[row.Kode_Item]) {
                groupedProducts[row.Kode_Item] = {
                  product: {
                    Kode_Item: row.Kode_Item,
                    Nama_Item: row.Nama_Item,
                    Jenis: row.Jenis || '',
                    Supplier_Code: row.Supplier_Code || ''
                  },
                  variants: [],
                  units: [],
                  prices: [],
                  stocks: []
                };
              }
              
              // Add unit if provided
              if (row.Nama_Satuan) {
                // Check if this unit already exists
                const existingUnit = groupedProducts[row.Kode_Item].units.find(
                  u => u.Nama_Satuan === row.Nama_Satuan
                );
                
                if (!existingUnit) {
                  groupedProducts[row.Kode_Item].units.push({
                    Nama_Satuan: row.Nama_Satuan,
                    Jumlah_Dalam_Satuan_Dasar: parseFloat(row.Jumlah_Dalam_Satuan_Dasar || 1),
                    Satuan_Supplier: row.Satuan_Supplier || '',
                    Threshold_Margin: parseFloat(row.Threshold_Margin || 0)
                  });
                }
                
                // Add price if provided
                if (row.Harga_Jual) {
                  groupedProducts[row.Kode_Item].prices.push({
                    unitName: row.Nama_Satuan,
                    Harga_Pokok: parseFloat(row.Harga_Pokok || row.Harga_Jual * 0.8),
                    Harga_Pokok_Sebelumnya: parseFloat(row.Harga_Pokok_Sebelumnya || (row.Harga_Pokok ? row.Harga_Pokok * 0.95 : row.Harga_Jual * 0.76)),
                    Harga_Jual: parseFloat(row.Harga_Jual)
                  });
                }
                
                // Add stock if provided
                if (row.Jumlah_Stok) {
                  groupedProducts[row.Kode_Item].stocks.push({
                    unitName: row.Nama_Satuan,
                    Jumlah_Stok: parseFloat(row.Jumlah_Stok)
                  });
                }
              }
              
              // Add variant if provided
              if (row.Deskripsi_Varian) {
                // Check if this variant already exists
                const existingVariant = groupedProducts[row.Kode_Item].variants.find(
                  v => v.Deskripsi === row.Deskripsi_Varian
                );
                
                if (!existingVariant) {
                  groupedProducts[row.Kode_Item].variants.push({
                    Deskripsi: row.Deskripsi_Varian
                  });
                }
              }
            });
            
            // Convert the grouped products to an array
            const products = Object.values(groupedProducts);
            
            resolve({ products });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  // Handle actions dropdown
  const handleActions = (action) => {
    if (action === 'import') {
      setIsImporting(false);
      setImportFile(null);
      setImportValidation(null);
      setImportStats(null);
      setImportProgress(0); 
      setImportError(null);
      setIsImportModalOpen(true);
    } else if (action === 'export') {
      // Handle export
      handleExportProducts();
    } else if (action === 'delete-all') {
      handleDeleteAllProducts();
    }
  };

  // Parse JSON text into array of objects
  const parseJsonFile = async (file) => {
    try {
      const reader = new FileReader();
      const jsonData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      const data = JSON.parse(jsonData);
      
      // Process the data to ensure new fields are handled
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach(item => {
          // Handle units - add Satuan_Supplier and Threshold_Margin if they don't exist
          if (item.units && Array.isArray(item.units)) {
            item.units.forEach(unit => {
              if (unit.Satuan_Supplier === undefined) unit.Satuan_Supplier = '';
              if (unit.Threshold_Margin === undefined) unit.Threshold_Margin = 0;
            });
          }
          
          // Handle prices - add Harga_Pokok_Sebelumnya if it doesn't exist
          if (item.prices && Array.isArray(item.prices)) {
            item.prices.forEach(price => {
              if (price.Harga_Pokok_Sebelumnya === undefined) {
                // Default to 95% of Harga_Pokok or 76% of Harga_Jual if Harga_Pokok is missing
                price.Harga_Pokok_Sebelumnya = price.Harga_Pokok 
                  ? price.Harga_Pokok * 0.95 
                  : (price.Harga_Jual ? price.Harga_Jual * 0.76 : 0);
              }
            });
          }
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error parsing JSON file:', error);
      throw error;
    }
  };

  // Generate and download a sample CSV file
  const downloadSampleCsv = () => {
    // Create headers
    const headers = [
      'Kode_Item',
      'Nama_Item',
      'Jenis',
      'Supplier_Code',
      'Nama_Satuan',
      'Jumlah_Dalam_Satuan_Dasar',
      'Harga_Pokok',
      'Harga_Jual',
      'Jumlah_Stok',
      'Deskripsi_Varian'
    ];
    
    // Create sample data rows
    const rows = [
      // Base unit for first product
      ['PRD001', 'Sample Product 1', 'Category A', 'SUP001', 'pcs', '1', '8000', '10000', '120', 'Original'],
      // Additional unit for first product
      ['PRD001', 'Sample Product 1', 'Category A', '', 'box', '12', '90000', '115000', '10', ''],
      // Another variant for first product
      ['PRD001', 'Sample Product 1', 'Category A', '', '', '', '', '', '', 'Large'],
      // Base unit for second product
      ['PRD002', 'Sample Product 2', 'Category B', '', 'kg', '1', '25000', '30000', '50', ''],
    ];
    
    // Combine headers and rows
    const csvData = [headers, ...rows];
    
    // Convert to CSV string
    const csvString = Papa.unparse(csvData);
    
    // Create a blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'sample_products.csv';
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Sample CSV template downloaded');
  };

  // Cancel import
  const cancelImport = () => {
    setImportFile(null);
    setImportFileType(null);
    setImportValidation(null);
    setImportStats(null);
    setImportProgress(0);
    setImportError(null);
    setIsImportModalOpen(false);
  };

  // Helper function to handle importing products
  const handleImport = async () => {
    if (!importValidation || !importValidation.validProducts) {
      toast.error("Please validate the file first");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStats(null);
    setImportError(null);

    try {
      const totalProducts = importValidation.validProducts.length;
      let processedCount = 0;
      
      // Create a progress tracker by splitting into batches
      const batchSize = 10; // Process in small batches to show progress
      const batches = [];
      
      // Split the validated products into batches
      for (let i = 0; i < totalProducts; i += batchSize) {
        const batchProducts = importValidation.validProducts.slice(i, i + batchSize);
        batches.push({ products: batchProducts });
      }
      
      // Process batches sequentially to track progress
      const results = { imported: 0, failed: 0, failedItems: [], importedItems: [] };
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Send batch for import
        const batchResponse = await productItemApi.importProducts(batch);
        
        // Update progress
        processedCount += batch.products.length;
        const progress = Math.round((processedCount / totalProducts) * 100);
        setImportProgress(progress);
        
        // Aggregate results
        results.imported += batchResponse.imported;
        results.failed += batchResponse.failed;
        results.failedItems = [...results.failedItems, ...batchResponse.failedItems];
        results.importedItems = [...results.importedItems, ...batchResponse.importedItems];
        
        // Update stats after each batch
        setImportStats({...results});
      }
      
      toast.success(`Successfully imported ${results.imported} products`);
      
      // Refresh product list after import
      fetchProducts();
      
    } catch (error) {
      console.error("Error importing products:", error);
      setImportError("Error importing products: " + (error.response?.data?.error?.message || error.message));
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  // Initialize confirmation code when component mounts
  useEffect(() => {
    // Generate a random confirmation code
    setConfirmationCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Products</h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Add Product Button */}
            <button 
              className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
              onClick={handleAddProduct}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Product
            </button>
            
            {/* Import Button */}
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
              onClick={() => setIsImportModalOpen(true)}
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Import Products
            </button>
            
            {/* Export Button */}
            <button 
              className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center"
              onClick={() => handleExportProducts()}
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Products
            </button>
            
            {/* Delete All Button */}
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete All
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative mt-1 flex w-full items-center">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ChevronUpIcon className="w-4 h-4 ml-1" />,
                          desc: <ChevronDownIcon className="w-4 h-4 ml-1" />,
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr className={row.getIsExpanded() ? 'bg-blue-50' : ''}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>
                      {renderSubComponent({ row })}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {isLoading && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  <div className="flex justify-center items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && productData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-700">Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="border border-gray-300 rounded-md text-sm p-1"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Page{' '}
            <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> of{' '}
            <span className="font-medium">{table.getPageCount()}</span>
            {' '} ({totalItems} items)
          </span>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className={`p-1 border rounded-md ${
              !table.getCanPreviousPage()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className={`p-1 border rounded-md ${
              !table.getCanNextPage()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal for adding/editing products */}
      <Modal
        isOpen={isProductModalOpen}
        onRequestClose={() => setIsProductModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '0',
            border: '1px solid #ccc',
            borderRadius: '8px'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }
        }}
        contentLabel="Product Form"
        ariaHideApp={false}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
            </h3>
            <button 
              className="text-gray-400 hover:text-gray-500"
              onClick={() => {
                setIsProductModalOpen(false);
                setSelectedProduct(null);
              }}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <ProductForm
            product={selectedProduct}
            onSuccess={(data) => {
              if (modalMode === 'add') {
                toast.success('Product added successfully');
              } else {
                toast.success('Product updated successfully');
              }
              setIsProductModalOpen(false);
              setSelectedProduct(null);
              fetchProducts(); // Refresh list
            }}
            onCancel={() => {
              setIsProductModalOpen(false);
              setSelectedProduct(null);
            }}
          />
        </div>
      </Modal>

      {/* Delete All Products Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '0',
            border: '1px solid #ccc',
            borderRadius: '8px'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }
        }}
        contentLabel="Delete Products"
        ariaHideApp={false}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Delete All Products</h3>
            <button 
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p className="font-bold">Warning!</p>
              <p>This action will delete ALL products and cannot be undone.</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation Code
              </label>
              <div className="p-3 bg-gray-100 rounded-md mb-2 font-mono text-center text-lg select-all">
                {confirmationCode}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Please enter the confirmation code above followed by the text "DELETE-ALL-PRODUCTS-CONFIRM" to confirm deletion.
              </p>
              <p className="text-sm text-gray-500 mb-4 font-medium">
                Example: {confirmationCode} DELETE-ALL-PRODUCTS-CONFIRM
              </p>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`${confirmationCode} DELETE-ALL-PRODUCTS-CONFIRM`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300"
                disabled={isDeleting || confirmationInput.trim() === ''}
              >
                {isDeleting ? 'Deleting...' : 'Delete All Products'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Import Products Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onRequestClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
            cancelImport();
          }
        }}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '0',
            border: '1px solid #ccc',
            borderRadius: '8px'
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }
        }}
        contentLabel="Import Products"
        ariaHideApp={false}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Import Products</h3>
            <button 
              className="text-gray-400 hover:text-gray-500"
              onClick={() => {
                if (!isImporting) {
                  setIsImportModalOpen(false);
                  cancelImport();
                }
              }}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Instructions */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Instructions</h4>
            <p className="text-sm text-blue-700 mb-2">
              Import your products using a JSON or CSV file. Each product must have:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 mb-2">
              <li>Product code (Kode_Item)</li>
              <li>Product name (Nama_Item)</li>
              <li>At least one unit with conversion rate of 1</li>
            </ul>
            <p className="text-sm text-blue-700">
              Download a sample file below to see the expected format.
            </p>
          </div>
          
          {/* File Upload */}
          <div className="mb-6">
            <div className="flex flex-col items-center justify-center w-full">
              <label 
                htmlFor="file-upload" 
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">JSON or CSV file</p>
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept=".json,.csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isImporting || isValidating}
                />
              </label>
            </div>
            
            {importFile && (
              <div className="mt-4 flex items-center justify-between bg-gray-100 p-2 rounded">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium">{importFile.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({Math.round(importFile.size / 1024)} KB)
                  </span>
                </div>
                <button 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    setImportFile(null);
                    setImportValidation(null);
                    setImportProgress(0);
                    setImportError(null);
                  }}
                  disabled={isImporting || isValidating}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Sample Download */}
          <div className="flex items-center justify-between space-x-4 mb-6">
            <button 
              className="px-4 py-2 text-sm font-medium text-blue-600 underline" 
              onClick={downloadSampleCsv}
            >
              Download CSV Sample
            </button>
            <button 
              className="px-4 py-2 text-sm font-medium text-blue-600 underline" 
              onClick={() => {
                // Generate sample JSON
                const sampleData = {
                  products: [
                    {
                      product: {
                        Kode_Item: "PRD001",
                        Nama_Item: "Sample Product 1",
                        Jenis: "Sample Category"
                      },
                      variants: [
                        { Deskripsi: "Original" },
                        { Deskripsi: "Large" }
                      ],
                      units: [
                        { Nama_Satuan: "pcs", Jumlah_Dalam_Satuan_Dasar: 1 },
                        { Nama_Satuan: "box", Jumlah_Dalam_Satuan_Dasar: 12 }
                      ],
                      prices: [
                        { unitName: "pcs", Harga_Pokok: 8000, Harga_Jual: 10000 },
                        { unitName: "box", Harga_Pokok: 90000, Harga_Jual: 115000 }
                      ],
                      stocks: [
                        { unitName: "pcs", Jumlah_Stok: 120 },
                        { unitName: "box", Jumlah_Stok: 10 }
                      ]
                    },
                    {
                      product: {
                        Kode_Item: "PRD002",
                        Nama_Item: "Sample Product 2",
                        Jenis: "Another Category"
                      },
                      units: [
                        { Nama_Satuan: "kg", Jumlah_Dalam_Satuan_Dasar: 1 }
                      ],
                      prices: [
                        { unitName: "kg", Harga_Pokok: 25000, Harga_Jual: 30000 }
                      ],
                      stocks: [
                        { unitName: "kg", Jumlah_Stok: 50 }
                      ]
                    }
                  ]
                };

                // Convert to JSON string with formatting
                const jsonString = JSON.stringify(sampleData, null, 2);
                
                // Create a blob and download
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.download = 'sample_products.json';
                a.href = url;
                a.click();
                URL.revokeObjectURL(url);
                
                toast.success('Sample JSON structure downloaded');
              }}
            >
              Download JSON Sample
            </button>
          </div>
          
          {/* Error Message */}
          {importError && (
            <div className="mb-6 bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Error</h3>
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}
          
          {/* Validation Results */}
          {importValidation && (
            <div className="mb-6 bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Validation Results</h3>
              <div className="text-sm">
                <p className="text-yellow-700">
                  Total products found: <span className="font-medium">{importValidation.totalItems}</span>
                </p>
                <p className="text-green-700">
                  Valid products: <span className="font-medium">{importValidation.validItems}</span>
                </p>
                {importValidation.invalidItems > 0 && (
                  <div>
                    <p className="text-orange-700 mt-2">
                      Invalid products: <span className="font-medium">{importValidation.invalidItems}</span>
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left py-1 text-black">Product Code</th>
                            <th className="text-left py-1 text-black">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importValidation.issues.map((item, idx) => (
                            <tr key={idx} className="border-t border-orange-200">
                              <td className="py-1 text-black">{item.item?.product?.Kode_Item || 'Unknown'}</td>
                              <td className="py-1 text-black">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Progress Indicator */}
          {isImporting && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Importing products...</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600 text-right">{importProgress}%</p>
            </div>
          )}
          
          {/* Import Stats */}
          {importStats && (
            <div className="mb-6 bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Import Results</h3>
              <div className="text-sm">
                <p className="text-green-700">
                  Successfully imported: <span className="font-medium">{importStats.imported}</span> products
                </p>
                {importStats.failed > 0 && (
                  <div>
                    <p className="text-orange-700 mt-2">
                      Failed to import: <span className="font-medium">{importStats.failed}</span> products
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left py-1">Product Code</th>
                            <th className="text-left py-1">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importStats.failedItems.map((item, idx) => (
                            <tr key={idx} className="border-t border-orange-200">
                              <td className="py-1">{item.Kode_Item || 'Unknown'}</td>
                              <td className="py-1">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end items-center space-x-3">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200"
              onClick={() => {
                setIsImportModalOpen(false);
                cancelImport();
              }}
              disabled={isImporting}
            >
              Cancel
            </button>
            
            {importValidation ? (
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                onClick={handleImport}
                disabled={isImporting || !importValidation.isValid}
              >
                {isImporting ? 'Importing...' : `Import ${importValidation.validItems} Products`}
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                onClick={validateFile}
                disabled={isValidating || !importFile}
              >
                {isValidating ? 'Validating...' : 'Validate File'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
