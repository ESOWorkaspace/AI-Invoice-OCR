import { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Format currency (Moved outside formatValue for general use)
const formatCurrencyGlobal = (amount) => {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0); 
  } catch (error) {
    console.warn('Error formatting currency:', amount, error);
    return String(amount || 0);
  }
};

// Helper function to check if a string is valid JSON (Kept for general use)
const isJsonString = (str) => {
  if (typeof str !== 'string') return false;
  try {
    const result = JSON.parse(str);
    return typeof result === 'object' && result !== null;
  } catch (e) {
    return false;
  }
};

export default function DatabaseTable({ 
  data, 
  schema, 
  isLoading,
  searchTerm,
  itemsPerPage,
  currentPage,
  setCurrentPage,
  onSave,
  onDelete,
  onEdit
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [filterConfig, setFilterConfig] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Reset editing state when data changes
  useEffect(() => {
    setEditingRow(null);
    setEditedData({});
    setSelectedRows([]);
    setIsAllSelected(false);
  }, [data]);

  // Handle sort
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (a[sortConfig.key] === null) return 1;
    if (b[sortConfig.key] === null) return -1;
    
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // Filter data
  const filteredData = sortedData.filter(item => {
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = Object.keys(item).some(key => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return value.toString().toLowerCase().includes(searchLower);
      });
      
      if (!matchesSearch) return false;
    }
    
    // Apply column filters
    for (const [key, filterValue] of Object.entries(filterConfig)) {
      if (!filterValue) continue;
      
      const itemValue = item[key];
      if (itemValue === null || itemValue === undefined) return false;
      
      const filterLower = filterValue.toLowerCase();
      if (!itemValue.toString().toLowerCase().includes(filterLower)) {
        return false;
      }
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Determine cell background color based on value (null/undefined = red)
  const getCellBackgroundColor = (value) => {
    if (value === null || value === undefined) {
      return 'bg-red-100'; // Use a light red for null/undefined
    }
    return 'bg-white'; // Default white background
  };

  // Format value based on type (Removed row parameter)
  const formatValue = (value, type, name) => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    switch (type) {
      case 'date':
        try {
          return format(new Date(value), 'dd/MM/yyyy');
        } catch (error) {
          console.warn('Error formatting date:', value, error);
          return value || '-';
        }
      case 'datetime':
        try {
          return format(new Date(value), 'dd/MM/yyyy HH:mm:ss');
        } catch (error) {
          console.warn('Error formatting datetime:', value, error);
          return value || '-';
        }
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'currency':
        // Use the global helper function
        return formatCurrencyGlobal(value);
      case 'number':
      case 'integer':
        try {
        return new Intl.NumberFormat('id-ID').format(value);
        } catch (error) {
          console.warn('Error formatting number:', value, error);
          return value || '-';
        }
      case 'json':
        try {
          if (name === 'raw_data') {
            return "[JSON Data]"; 
          }

          // Parse JSON if it's a string
          const jsonData = typeof value === 'string' ? JSON.parse(value) : value;
          
          if (jsonData === null || jsonData === undefined) {
            return '-';
          }

          // Special handling for 'items' field if it's an array
          if (name === 'items' && Array.isArray(jsonData)) {
            // Check if array contains items with expected structure
             const isInvoiceItems = jsonData.length > 0 && (
               Object.prototype.hasOwnProperty.call(jsonData[0], 'product_code') ||
               Object.prototype.hasOwnProperty.call(jsonData[0], 'product_name')
             );

            if (isInvoiceItems) {
              return (
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Kode</th>
                        <th className="px-2 py-1 border">Nama Barang</th>
                        <th className="px-2 py-1 border text-right">Qty</th>
                        <th className="px-2 py-1 border">Satuan</th>
                        <th className="px-2 py-1 border text-right">Harga</th>
                        <th className="px-2 py-1 border text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50">
                          <td className="px-2 py-1 border">{item.product_code ?? '-'}</td>
                          <td className="px-2 py-1 border">{item.product_name ?? '-'}</td>
                          <td className="px-2 py-1 border text-right">
                            {item.quantity !== null && item.quantity !== undefined 
                              ? new Intl.NumberFormat('id-ID').format(item.quantity)
                              : '-'
                            }
                          </td>
                          <td className="px-2 py-1 border">{item.unit ?? '-'}</td>
                          <td className="px-2 py-1 border text-right">
                            {item.price !== null && item.price !== undefined
                              ? formatCurrencyGlobal(item.price)
                              : '-'
                            }
                          </td>
                          <td className="px-2 py-1 border text-right">
                             {item.total !== null && item.total !== undefined
                               ? formatCurrencyGlobal(item.total)
                               : '-'
                             }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            }
            
          // Fallback for other JSON arrays or objects
          if (Array.isArray(jsonData)) {
            return (
              <div className="max-h-32 overflow-y-auto">
                <ul className="list-disc pl-4">
                  {jsonData.map((item, index) => (
                    <li key={index}>{item === null || item === undefined ? '-' : (typeof item === 'object' ? JSON.stringify(item) : item)}</li>
                  ))}
                </ul>
              </div>
            );
          }
          else if (typeof jsonData === 'object') {
          return (
            <div className="max-h-32 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          );
          }
          return value ?? '-';

        } catch (error) {
          console.warn('Error processing JSON value:', value, error);
          return (typeof value === 'string' ? value : JSON.stringify(value)) ?? '-'; 
        }
      default:
        return value ?? '-';
    }
  };

  // Handle edit start
  const handleEditStart = (row) => {
    if (onEdit) {
      onEdit(row);
    } else {
      setEditingRow(row.id);
      setEditedData({ ...row });
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingRow(null);
    setEditedData({});
  };

  // Handle edit save
  const handleEditSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setEditingRow(null);
    setEditedData({});
  };

  // Handle field change
  const handleFieldChange = (key, value) => {
    setEditedData(prev => {
      // Special handling for JSON fields
      if (key === 'items' || typeof prev[key] === 'string' && isJsonString(prev[key])) {
        try {
          // If the current value is a JSON string
          if (typeof prev[key] === 'string' && isJsonString(prev[key])) {
            // If the new value is also a string, just use it directly
            if (typeof value === 'string') {
              return {
                ...prev,
                [key]: value
              };
            }
            
            // If the new value is an object, stringify it
            if (typeof value === 'object') {
              return {
                ...prev,
                [key]: JSON.stringify(value)
              };
            }
          }
          
          // If the current value is an object
          if (typeof prev[key] === 'object' && prev[key] !== null) {
            // If the new value is a string and looks like JSON, parse it
            if (typeof value === 'string' && isJsonString(value)) {
              return {
                ...prev,
                [key]: JSON.parse(value)
              };
            }
            
            // If the new value is an object, use it directly
            if (typeof value === 'object') {
              return {
                ...prev,
                [key]: value
              };
            }
          }
        } catch (e) {
          console.error('Error handling JSON field:', e);
        }
      }
      
      // Default handling for non-JSON fields
      return {
        ...prev,
        [key]: value
      };
    });
  };

  // Handle delete
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      if (onDelete) {
        onDelete(id);
      }
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} records?`)) {
      if (onDelete) {
        selectedRows.forEach(id => onDelete(id));
      }
      setSelectedRows([]);
    }
  };

  // Handle row selection
  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(row => row.id));
    }
    setIsAllSelected(!isAllSelected);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilterConfig(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Toggle filters
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterConfig({});
    setCurrentPage(1);
  };

  // Handle input change within the items table
  const handleItemInputChange = (index, field, value) => {
    // console.log(`Item Change: Index ${index}, Field ${field}, Value ${value}`);
    setEditedData(prev => {
      let currentItems = [];
      const itemsSource = prev.items; // Get current items from state
      try {
        if (typeof itemsSource === 'string' && itemsSource.trim() !== '') {
          currentItems = JSON.parse(itemsSource);
        } else if (Array.isArray(itemsSource)) {
          currentItems = itemsSource;
        } else {
          currentItems = [];
        }
        if (!Array.isArray(currentItems)) currentItems = [];
      } catch (e) {
        console.error("Error parsing items data during update:", e);
        currentItems = [];
      }
      
      // Create a deep copy to avoid modifying state directly
      const updatedItems = JSON.parse(JSON.stringify(currentItems)); 

      // Ensure the target item exists
      if (updatedItems[index]) {
        // Update the specific field
        updatedItems[index][field] = value;

        // Optionally recalculate total if price or quantity changes (simple example)
        if (field === 'price' || field === 'quantity') {
           const price = parseFloat(updatedItems[index].price) || 0;
           const quantity = parseFloat(updatedItems[index].quantity) || 0;
           // Assuming no discount calculation needed *during* edit for simplicity here
           updatedItems[index].total = price * quantity; 
        }
      }
      
      return { ...prev, items: updatedItems }; // Return updated state object
    });
  };

  // Handle adding a new item row
  const handleAddItem = () => {
    // console.log('Add Item clicked');
     setEditedData(prev => {
      let currentItems = [];
      const itemsSource = prev.items;
      try {
        if (typeof itemsSource === 'string' && itemsSource.trim() !== '') {
          currentItems = JSON.parse(itemsSource);
        } else if (Array.isArray(itemsSource)) {
          currentItems = itemsSource;
        } else {
          currentItems = [];
        }
        if (!Array.isArray(currentItems)) currentItems = [];
      } catch (e) {
        console.error("Error parsing items data before adding:", e);
        currentItems = [];
      }

      // Define a new empty item structure
      const newItem = {
        id: `new_${Date.now()}`,
        product_code: '',
        product_name: '',
        quantity: 0,
        unit: '',
        price: 0,
        total: 0,
        // Add other fields expected by display/save logic, defaulting to empty/null/zero
        is_confident: {} // Assuming an empty object is okay if needed
      };

      // Return updated state with the new item appended
      return { ...prev, items: [...currentItems, newItem] }; 
    });
  };

  // Handle deleting an item row
  const handleDeleteItem = (index) => {
    // console.log(`Delete Item clicked: Index ${index}`);
    setEditedData(prev => {
      let currentItems = [];
      const itemsSource = prev.items;
      try {
        if (typeof itemsSource === 'string' && itemsSource.trim() !== '') {
          currentItems = JSON.parse(itemsSource);
        } else if (Array.isArray(itemsSource)) {
          currentItems = itemsSource;
        } else {
          currentItems = [];
        }
        if (!Array.isArray(currentItems)) currentItems = [];
      } catch (e) {
        console.error("Error parsing items data before deleting:", e);
        currentItems = [];
      }
      
      // Create a new array excluding the item at the specified index
      const updatedItems = currentItems.filter((_, i) => i !== index);
      
      // Return updated state
      return { ...prev, items: updatedItems };
    });
  };

  // Render cell content
  const renderCellContent = (row, column) => {
    const { name, type, editable } = column;
    const value = row[name];
    const formattedValue = formatValue(value, type, name); 
    
    if (editingRow === row.id && editable) {
      let editValue = editedData[name] !== undefined ? editedData[name] : value;

      // == Special Handling for 'items' field in Edit Mode ==
      if (name === 'items') {
        let currentItems = [];
        try {
          if (typeof editValue === 'string' && editValue.trim() !== '') {
            currentItems = JSON.parse(editValue);
          } else if (Array.isArray(editValue)) {
            currentItems = editValue;
          } else {
             currentItems = [];
          }
          if (!Array.isArray(currentItems)) currentItems = [];
        } catch (e) {
          console.error("Error parsing items data for editing:", e);
          currentItems = [];
        }

        return (
          <div className="w-full">
            <table className="min-w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border border-gray-300">Kode</th>
                  <th className="px-2 py-1 border border-gray-300">Nama Barang</th>
                  <th className="px-2 py-1 border border-gray-300 text-right">Qty</th>
                  <th className="px-2 py-1 border border-gray-300">Satuan</th>
                  <th className="px-2 py-1 border border-gray-300 text-right">Harga</th>
                  <th className="px-2 py-1 border border-gray-300">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id || index}> 
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        value={item.product_code || ''}
                        onChange={(e) => handleItemInputChange(index, 'product_code', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        value={item.product_name || ''}
                        onChange={(e) => handleItemInputChange(index, 'product_name', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.quantity || 0}
                        onChange={(e) => handleItemInputChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-0.5 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        value={item.unit || ''}
                        onChange={(e) => handleItemInputChange(index, 'unit', e.target.value)}
                        className="w-12 px-1 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.price || 0}
                        onChange={(e) => handleItemInputChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-1 py-0.5 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                     <td className="border border-gray-300 p-1 text-center">
                       <button 
                         onClick={() => handleDeleteItem(index)} 
                         className="text-red-500 hover:text-red-700 text-xs px-1 py-0.5"
                         title="Hapus Item"
                       >
                         X 
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              onClick={handleAddItem}
              className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              + Tambah Item
            </button>
          </div>
        );
      } 
      // == End Special Handling for 'items' ==
      // Moved special handling for payment/document type outside switch for clarity
      else if (name === 'payment_type' || name === 'document_type') {
          return (
            <input
              type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editValue ?? ''} 
              onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
      }
      // Default handling using switch for other types
      else {
        switch (type) {
          case 'string':
          return (
            <input
                  type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded"
                  value={editValue ?? ''} 
                  onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
          case 'integer':
          case 'number':
        case 'currency':
          return (
            <input
              type="number"
              className="w-full px-2 py-1 border border-gray-300 rounded"
                  value={editValue ?? 0} 
                  onChange={(e) => handleFieldChange(name, e.target.value === '' ? null : parseFloat(e.target.value) || 0)} 
            />
          );
        case 'date':
              let dateValue = '';
             if (editValue) {
               try {
                 dateValue = new Date(editValue).toISOString().split('T')[0];
               } catch (e) {
                 console.warn("Invalid date for input:", editValue);
               }
             }
          return (
            <input
              type="date"
              className="w-full px-2 py-1 border border-gray-300 rounded"
                 value={dateValue}
                 onChange={(e) => handleFieldChange(name, e.target.value ? new Date(e.target.value).toISOString() : null)} 
               />
             );
          case 'json': // Handles other JSON fields (NOT items, NOT payment/doc type)
              let jsonString = '';
             if (editValue !== null && editValue !== undefined) {
                try {
                  jsonString = typeof editValue === 'object' ? JSON.stringify(editValue, null, 2) : String(editValue);
                } catch (e) {
                  jsonString = String(editValue); 
                }
             }
             return (
               <textarea
                 className="w-full px-2 py-1 border border-gray-300 rounded h-20" 
                 value={jsonString}
              onChange={(e) => handleFieldChange(name, e.target.value)}
                 readOnly={name === 'raw_data'} 
            />
          );
        default:
          return (
            <input
              type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded"
                  value={editValue ?? ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
      }
      }
    }
    
    return formattedValue; 
  };

  return (
    <div>
      {/* Filter Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={toggleFilters}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {Object.keys(filterConfig).length > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>
        
        {selectedRows.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete Selected ({selectedRows.length})
          </button>
        )}
      </div>
      
      {/* Column Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Column Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {schema.map(column => (
              <div key={column.name} className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">{column.name}</label>
                <input
                  type="text"
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder={`Filter ${column.name}...`}
                  value={filterConfig[column.name] || ''}
                  onChange={(e) => handleFilterChange(column.name, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              {schema.map(column => (
                <th
                  key={column.name}
                  className={`px-3 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.type === 'number' || column.type === 'integer' || column.type === 'currency' 
                      ? 'text-right' 
                      : 'text-left'
                  }`}
                  onClick={() => handleSort(column.name)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.name}</span>
                    {sortConfig.key === column.name && (
                      <span>
                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={schema.length + 2} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={schema.length + 2} className="px-6 py-4 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map(row => (
                <tr 
                  key={row.id}
                  className={`${editingRow === row.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  {schema.map(field => (
                    <td 
                      key={field.name} 
                      className={`px-3 py-4 whitespace-nowrap text-sm text-black ${
                        field.type === 'number' || field.type === 'integer' || field.type === 'currency' 
                          ? 'text-right' 
                          : 'text-left'
                      } ${
                        editingRow === row.id && field.editable ? '' : 
                        getCellBackgroundColor(row[field.name])
                      }`}
                    >
                      {renderCellContent(row, field)}
                    </td>
                  ))}
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingRow === row.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleEditSave}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditStart(row)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Calculate page numbers to show (always show 5 pages if possible)
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                className={`px-3 py-1 border ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} rounded`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button 
            className={`px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
