import React, { memo } from 'react';
import { safeGet, getCellBackgroundColor } from '../utils/dataHelpers';
import { formatCurrency, parseNumber } from '../utils/dataFormatters';
import { EditableCell } from './UIComponents';

/**
 * A memoized table row component for displaying item data
 */
const ItemsTableRow = memo(({ 
  item, 
  rowIndex, 
  columns, 
  columnWidths, 
  handleItemChange, 
  searchStatus, 
  handleProductCellClick,
  handleUnitChange,
  renderDatePicker,
  renderBooleanField,
  handleBKPChange
}) => {
  return (
    <tr className="hover:bg-gray-100 group">
      {columns.map((column, colIndex) => {
        // Handle index column separately
        if (column.id === 'index') {
          return (
            <td 
              key={colIndex} 
              className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
              style={{ 
                width: `${columnWidths[column.id]}px`,
                ...(column.sticky ? { left: `${column.left}px`, backgroundColor: 'white' } : {})
              }}
            >
              {rowIndex + 1}
            </td>
          );
        }
        
        const cellData = safeGet(item, column.id, { value: '', is_confident: false });
        const cellBgColor = getCellBackgroundColor(cellData);
        const bgColorMap = {
          'bg-red-100': '#fee2e2',
          'bg-orange-100': '#fed7aa',
          'bg-green-100': '#d1fae5',
          'bg-green-50': '#ecfdf5',
          '': 'white'
        };
        
        // Handle suggestion columns
        if (column.special === 'suggestion') {
          return (
            <td 
              key={colIndex} 
              className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
              style={{ 
                width: `${columnWidths[column.id]}px`,
                backgroundColor: '#ecfdf5',
                ...(column.sticky ? { left: `${column.left}px` } : {})
              }}
            >
              -
            </td>
          );
        }
        
        // Handle database columns with no data
        if (column.special === 'database' && (!cellData || cellData.value === 0)) {
          return (
            <td 
              key={colIndex} 
              className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
              style={{ 
                width: `${columnWidths[column.id]}px`,
                backgroundColor: '#d1fae5',
                ...(column.sticky ? { left: `${column.left}px` } : {})
              }}
            >
              <span className="italic text-gray-500">From DB</span>
            </td>
          );
        }
        
        // Determine cell class based on alignment and special properties
        let cellClass = "px-3 py-3 whitespace-nowrap text-sm text-gray-900 hover-highlight ";
        if (column.align === 'right') cellClass += "text-right ";
        if (column.align === 'center') cellClass += "text-center ";
        if (column.special === 'suggestion') cellClass += "";
        if (column.sticky) cellClass += "sticky z-10 ";
        
        // Add a special class for cells that are product searchable
        if (column.id === 'kode_barang_main' || column.id === 'nama_barang_main') {
          const needsManualSearch = searchStatus[rowIndex] === 'not_found' || searchStatus[rowIndex] === 'error';
          
          cellClass += needsManualSearch ? 'bg-yellow-100 ' : '';
        }
        
        return (
          <td 
            key={colIndex} 
            className={`${cellClass} border-b border-gray-100 border-r border-gray-50`}
            style={{ 
              width: `${columnWidths[column.id]}px`,
              backgroundColor: bgColorMap[cellBgColor] || 'white',
              ...(column.sticky ? { left: `${column.left}px` } : {})
            }}
          >
            {renderEditableCell(
              cellData, 
              rowIndex,
              column,
              handleItemChange,
              handleProductCellClick,
              handleUnitChange,
              renderDatePicker,
              renderBooleanField,
              handleBKPChange,
              searchStatus
            )}
          </td>
        );
      })}
    </tr>
  );
});

/**
 * Renders an editable cell based on type and column
 */
const renderEditableCell = (
  item, 
  rowIndex, 
  column,
  handleItemChange,
  handleProductCellClick,
  handleUnitChange,
  renderDatePicker,
  renderBooleanField,
  handleBKPChange,
  searchStatus
) => {
  if (!item) return null;
  
  const columnId = column.id;
  const type = column.type;
  const onChange = (value) => handleItemChange(rowIndex, columnId, value);
  const cellClass = getCellBackgroundColor(item);
  
  // Special handling for product search cells
  if (columnId === 'kode_barang_main' || columnId === 'nama_barang_main') {
    // Determine if this cell needs manual search
    const needsManualSearch = searchStatus[rowIndex] === 'not_found' || searchStatus[rowIndex] === 'error';
    const isSearching = searchStatus[rowIndex] === 'searching';
    const isEmpty = !item.value || item.value === '';
    
    return (
      <div 
        id={`cell-${columnId}-${rowIndex}`}
        className={`w-full cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
        onClick={() => handleProductCellClick(columnId, rowIndex)}
      >
        {isSearching ? (
          <div className="flex items-center justify-center space-x-1">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <span>Searching...</span>
          </div>
        ) : isEmpty ? (
          needsManualSearch ? "tidak ditemukan, cari..." : "Click to search"
        ) : (
          item.value
        )}
      </div>
    );
  }
  
  // Special handling for unit selection dropdown if available_units exists
  if (columnId === 'satuan_main' && item.available_units && item.available_units.length > 0) {
    return (
      <select 
        className={`w-full py-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${cellClass}`}
        value={item.value || ''}
        onChange={(e) => handleUnitChange(rowIndex, e.target.value)}
      >
        {item.available_units.map((unit, idx) => (
          <option key={`unit-${idx}`} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    );
  }
  
  // Handle different field types based on the type parameter
  switch (type) {
    case 'date':
      return renderDatePicker(item, (date) => onChange(date));
    
    case 'boolean':
      return renderBooleanField(
        item,
        (value) => {
          if (columnId === 'bkp') {
            handleBKPChange(rowIndex, value);
          } else {
            onChange(value);
          }
        }
      );
      
    case 'currency':
      return (
        <input
          type="text"
          value={item.value !== null && item.value !== undefined ? formatCurrency(item.value) : ''}
          onChange={(e) => {
            const val = parseNumber(e.target.value);
            onChange(val);
          }}
          className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-right ${cellClass}`}
        />
      );
      
    case 'percentage':
      return (
        <input
          type="text"
          value={typeof item.value === 'number' ? item.value.toString().replace('.', ',') : (item.value || '')}
          onChange={(e) => {
            // Allow only numbers and one comma as decimal separator
            let val = e.target.value.replace(/[^0-9,]/g, '');
            // Ensure only one comma
            const parts = val.split(',');
            if (parts.length > 2) {
              val = `${parts[0]},${parts.slice(1).join('')}`;
            }
            // Convert to number format (replace comma with dot for JS number)
            const numericValue = val ? parseFloat(val.replace(',', '.')) : 0;
            onChange(isNaN(numericValue) ? 0 : numericValue);
          }}
          className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-right ${cellClass}`}
        />
      );
      
    case 'number':
      return (
        <input
          type="text"
          value={item.value !== null && item.value !== undefined ? item.value : ''}
          onChange={(e) => {
            // Allow only numbers, commas, and dots
            const re = /^[0-9,.]*$/;
            if (re.test(e.target.value) || e.target.value === '') {
              onChange(e.target.value);
            }
          }}
          className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none ${column.align === 'right' ? 'text-right' : ''} ${cellClass}`}
        />
      );
      
    default:
      return (
        <input
          type="text"
          value={item.value !== undefined && item.value !== null ? item.value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none ${cellClass}`}
        />
      );
  }
};

export default ItemsTableRow; 