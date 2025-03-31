import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
    if (value === null || value === undefined) {
      return '-';
    }
    
    switch (type) {
      case 'date':
        return value ? format(new Date(value), 'dd/MM/yyyy') : '-';
      case 'datetime':
        return value ? format(new Date(value), 'dd/MM/yyyy HH:mm') : '-';
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'currency':
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
      case 'number':
      case 'integer':
        return new Intl.NumberFormat('id-ID').format(value);
      case 'json':
        try {
          // Parse JSON if it's a string
          const jsonData = typeof value === 'string' ? JSON.parse(value) : value;
          
          // If it's an array (like items in processed_invoices)
          if (Array.isArray(jsonData)) {
            // For items in processed invoices - check for invoice item structure
            if (jsonData.length > 0 && (
              jsonData[0].product_name || 
              jsonData[0].nama_barang_invoice || 
              jsonData[0].kode_barang_invoice
            )) {
              return (
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Kode</th>
                        <th className="px-2 py-1 border">Nama Barang</th>
                        <th className="px-2 py-1 border text-right">
                          Qty
                        </th>
                        <th className="px-2 py-1 border">Satuan</th>
                        <th className="px-2 py-1 border">Harga</th>
                        <th className="px-2 py-1 border">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-1 border">{item.kode_barang_invoice || item.product_code || '-'}</td>
                          <td className="px-2 py-1 border">{item.nama_barang_invoice || item.product_name || '-'}</td>
                          <td className="px-2 py-1 border text-right">
                            {(() => {
                              // Try all possible quantity field names
                              let quantity = null;
                              
                              if (typeof item.qty !== 'undefined' && item.qty !== null) {
                                quantity = item.qty;
                              } else if (typeof item.quantity !== 'undefined' && item.quantity !== null) {
                                quantity = item.quantity;
                              } else if (typeof item.kuantitas !== 'undefined' && item.kuantitas !== null) {
                                quantity = item.kuantitas;
                              } else {
                                quantity = 0;
                              }
                              
                              console.log(`Item ${index} quantity value:`, quantity);
                              return new Intl.NumberFormat('id-ID').format(quantity);
                            })()}
                          </td>
                          <td className="px-2 py-1 border">{item.satuan || item.unit || '-'}</td>
                          <td className="px-2 py-1 border text-right">
                            {new Intl.NumberFormat('id-ID').format(item.harga_satuan || item.price || 0)}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {new Intl.NumberFormat('id-ID').format(item.jumlah_netto || item.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            
            // For other arrays
            return (
              <div className="max-h-32 overflow-y-auto">
                <ul className="list-disc pl-4">
                  {jsonData.map((item, index) => (
                    <li key={index}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                  ))}
                </ul>
              </div>
            );
          }
          
          // For objects
          return (
            <div className="max-h-32 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          );
        } catch (error) {
          return <span className="text-red-500">Invalid JSON</span>;
        }
      default:
        return value;
    }
  };

  // Get cell background color based on confidence
  const getCellBackgroundColor = (value, confidence) => {
    if (value === null || value === undefined) {
      return 'bg-red-100'; // Red background for null/undefined values
    }
    
    if (confidence === false) {
      return 'bg-orange-100'; // Orange background for low confidence
    }
    
    return ''; // Default white background for confident data
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
  
  // Helper function to check if a string is valid JSON
  const isJsonString = (str) => {
    if (typeof str !== 'string') return false;
    try {
      const result = JSON.parse(str);
      return typeof result === 'object' && result !== null;
    } catch (e) {
      return false;
    }
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

  // Render cell content
  const renderCellContent = (row, column) => {
    const { name, type, editable } = column;
    const value = row[name];
    
    if (editingRow === row.id && editable) {
      switch (type) {
        case 'string':
          return (
            <input
              type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editedData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
        case 'integer':
          return (
            <input
              type="number"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editedData[name] || 0}
              onChange={(e) => handleFieldChange(name, parseInt(e.target.value, 10) || 0)}
            />
          );
        case 'currency':
          return (
            <input
              type="number"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editedData[name] || 0}
              onChange={(e) => handleFieldChange(name, parseInt(e.target.value, 10) || 0)}
            />
          );
        case 'date':
          return (
            <input
              type="date"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editedData[name] ? new Date(editedData[name]).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
        default:
          return (
            <input
              type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              value={editedData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
            />
          );
      }
    } else {
      return formatValue(value, type);
    }
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
                        getCellBackgroundColor(row[field.name], row[`${field.name}_is_confident`])
                      }`}
                    >
                      {editingRow === row.id && field.editable ? (
                        <input
                          type={field.type === 'number' || field.type === 'integer' || field.type === 'currency' ? 'number' : 'text'}
                          value={editedData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        formatValue(row[field.name], field.type)
                      )}
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
