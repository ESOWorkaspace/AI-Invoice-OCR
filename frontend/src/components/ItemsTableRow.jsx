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
              searchStatus,
              item
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
  searchStatus,
  parentItem
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
        onChange={(e) => {
          const currentUnit = item.value;
          const selectedUnit = e.target.value;
          
          console.log(`ItemsTableRow: Unit change | Row: ${rowIndex} | From: [${currentUnit}] | To: [${selectedUnit}]`);
          
          // Log all available data for debugging
          console.log(`ItemsTableRow: Available units (${item.available_units.length}):`, item.available_units);
          
          // Log unit prices in detail if they exist
          if (item.unit_prices) {
            console.log(`ItemsTableRow: Unit prices available:`, item.unit_prices);
            
            // Log each unit price for easier debugging
            console.log('ItemsTableRow: Unit price details:');
            for (const unit in item.unit_prices) {
              console.log(`  • Unit [${unit}] price: ${item.unit_prices[unit]}`);
            }
            
            // Compare current and new prices
            const currentPrice = currentUnit ? item.unit_prices[currentUnit] : null;
            const newPrice = item.unit_prices[selectedUnit];
            
            console.log(`ItemsTableRow: Price change | From: ${currentPrice} (${currentUnit}) | To: ${newPrice} (${selectedUnit})`);
          } else {
            console.log(`ItemsTableRow: No unit prices available in the data`);
          }
          
          // First update the local UI directly to provide immediate feedback
          // This ensures the dropdown shows the selected value right away
          // even if the backend update takes time
          onChange(selectedUnit);
          
          // Also call the unit change handler with rowIndex and selected unit
          // This updates the data structure and triggers price updates
          console.log(`ItemsTableRow: Calling handleUnitChange(${rowIndex}, "${selectedUnit}")`);
          handleUnitChange(rowIndex, selectedUnit);
        }}
      >
        {item.available_units.map((unit, idx) => (
          <option key={`unit-${idx}`} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    );
  }
  
  // Add parent (row) reference to allow accessing other cells in the same row
  const itemWithParent = { ...item, parent: parentItem };
  
  // Handle different field types based on the type parameter
  switch (type) {
    case 'date':
      return renderDatePicker(itemWithParent, (date) => onChange(date));
    
    case 'boolean':
      return renderBooleanField(
        itemWithParent,
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
          value={itemWithParent.value !== null && itemWithParent.value !== undefined ? formatCurrency(itemWithParent.value) : ''}
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
          value={typeof itemWithParent.value === 'number' ? itemWithParent.value.toString().replace('.', ',') : (itemWithParent.value || '')}
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
      
    case 'difference_percent':
      // The parentItem contains the whole row data
      console.log('Row data for difference calculation:', parentItem);
      
      // Extract the harga_dasar_main and harga_satuan values directly from the row data
      const hargaDasarObj = parentItem.harga_dasar_main || {};
      const hargaSatuanObj = parentItem.harga_satuan || {};
      
      // Safely get the values, defaulting to 0 if they don't exist
      const hargaDasar = parseFloat(hargaDasarObj.value || 0);
      const hargaSatuan = parseFloat(hargaSatuanObj.value || 0);
      
      console.log(`Difference calculation - Row: ${rowIndex}, Column: ${columnId}`);
      console.log(`  - hargaDasar: ${hargaDasar}`);
      console.log(`  - hargaSatuan: ${hargaSatuan}`);
      
      // Calculate percentage difference
      let percentDiff = 0;
      if (hargaDasar > 0) {
        percentDiff = ((hargaSatuan - hargaDasar) / hargaDasar) * 100;
      }
      
      // Format and determine styling
      const isNegative = percentDiff < 0;
      const absPercentDiff = Math.abs(percentDiff).toFixed(2);
      const displayValue = `${absPercentDiff}%`;
      
      // Red for price increase (negative difference), green for price decrease (positive difference)
      const textColor = isNegative ? 'text-green-800' : 'text-red-600 ';
      const arrowIcon = isNegative 
        ? '↓' // down down for price increase
        : '↑'; // up up for price decrease
      
      return (
        <div className={`w-full flex items-center justify-end space-x-1 ${textColor}`}>
          <span className="font-bold">{arrowIcon}</span>
          <span>{displayValue}</span>
        </div>
      );
      
    case 'difference_amount':
      // Use the same approach as difference_percent
      console.log('Row data for amount difference calculation:', parentItem);
      
      // Extract prices directly from the parent row data
      const baseObj = parentItem.harga_dasar_main || {};
      const invoiceObj = parentItem.harga_satuan || {};
      
      // Safely get the values, defaulting to 0 if they don't exist
      const basePriceDiff = parseFloat(baseObj.value || 0);
      const invoicePriceDiff = parseFloat(invoiceObj.value || 0);
      
      console.log(`Amount difference calculation - Row: ${rowIndex}, Column: ${columnId}`);
      console.log(`  - basePriceDiff: ${basePriceDiff}`);
      console.log(`  - invoicePriceDiff: ${invoicePriceDiff}`);
      
      // Calculate absolute difference
      const amountDiff = invoicePriceDiff - basePriceDiff;
      
      // Format and determine styling
      const isAmountNegative = amountDiff < 0;
      const absAmountDiff = Math.abs(amountDiff);
      const displayAmountValue = formatCurrency(absAmountDiff);
      
      // Red for price increase (negative difference), green for price decrease (positive difference)
      const amountTextColor = isAmountNegative ? 'text-green-800' : 'text-red-600 ';
      const amountArrowIcon = isAmountNegative 
        ? '↓' // down arrow for price increase
        : '↑'; // up arrow for price decrease
      
      return (
        <div className={`w-full flex items-center justify-end space-x-1 ${amountTextColor}`}>
          <span className="font-bold">{amountArrowIcon}</span>
          <span>{displayAmountValue}</span>
        </div>
      );
      
    case 'number':
      return (
        <input
          type="text"
          value={itemWithParent.value !== null && itemWithParent.value !== undefined ? itemWithParent.value : ''}
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
          value={itemWithParent.value !== undefined && itemWithParent.value !== null ? itemWithParent.value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none ${cellClass}`}
        />
      );
  }
};

export default ItemsTableRow; 