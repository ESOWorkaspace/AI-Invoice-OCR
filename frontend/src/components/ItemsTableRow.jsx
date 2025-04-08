import React, { memo } from 'react';
import { safeGet, getCellBackgroundColor } from '../utils/dataHelpers';
import { formatCurrency, parseNumber, formatCellValue } from '../utils/dataFormatters';
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
  handleBKPChange,
  onDeleteItem
}) => {
  return (
    <tr className="hover:bg-gray-100 group">
      {columns.map((column, colIndex) => {
        // Special handling for the action column
        if (column.id === 'action') {
          return (
             <td 
              key={`${column.id}-${rowIndex}`} 
              className="px-1 py-0 whitespace-nowrap text-sm text-center border-b border-gray-100 border-r border-gray-50"
              style={{ 
                  width: `${columnWidths[column.id]}px`,
                  // Use a default background, or based on row hover maybe?
                  backgroundColor: 'white' 
              }}
             >
                <button
                    onClick={() => onDeleteItem(rowIndex)} // Call onDeleteItem with rowIndex
                    className="text-red-600 hover:text-red-800 text-xs font-semibold px-1 py-0.5"
                    title="Hapus Item"
                    disabled={!onDeleteItem} // Disable if handler not provided
                >
                    DEL
                </button>
             </td>
          );
        }

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
        
        const cellData = safeGet(item, column.id, { value: '', is_confident: false, from_database: false });
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
        let cellClass = "px-3 py-3 whitespace-nowrap text-gray-900 hover-highlight ";
        if (column.align === 'right') cellClass += "text-right ";
        if (column.align === 'center') cellClass += "text-center ";
        if (column.special === 'suggestion') cellClass += "";
        if (column.sticky) cellClass += "sticky z-10 ";
        
        // Add a special class for cells that are product searchable
        if (column.id === 'kode_barang_main' || column.id === 'nama_barang_main') {
          const rowSearchStatus = searchStatus && searchStatus[rowIndex] ? searchStatus[rowIndex] : null;
          const needsManualSearch = rowSearchStatus === 'not_found' || rowSearchStatus === 'error';
          
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
  const isEditable = column.editable;
  const onChange = (value) => handleItemChange(rowIndex, columnId, value);
  const cellBgColor = getCellBackgroundColor(item);
  
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
  if (columnId === 'satuan_main' && parentItem.satuan_main?.available_units?.length > 0) {
    // Get current value from the parentItem (full row data) which should be up-to-date
    const currentValue = safeGet(parentItem, 'satuan_main.value', '');
    const availableUnits = safeGet(parentItem, 'satuan_main.available_units', []);
    // Pass the full cell data object for background calculation
    const cellBgColorClass = getCellBackgroundColor(safeGet(parentItem, 'satuan_main')); 

    return (
      <select 
        className={`w-full py-1 px-2 border-none focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${cellBgColor}`}
        value={currentValue} // Use value from parentItem state
        onChange={(e) => {
          const selectedUnit = e.target.value;
          console.log(`ItemsTableRow: Unit changed for row ${rowIndex} from "${currentValue}" to "${selectedUnit}"`);
          // Call handleUnitChange with the row index and selected unit
          handleUnitChange(rowIndex, selectedUnit); 
        }}
      >
        {/* If dropdown is empty, show a placeholder */}
        {availableUnits.length === 0 && (
          <option value="">No units available</option>
        )}
        
        {/* Ensure the currently selected value is always an option */}
        {currentValue && !availableUnits.includes(currentValue) && (
          <option key={`current-${currentValue}`} value={currentValue}>
            {currentValue} (Current)
          </option>
        )}
        
        {/* Available units from the product */}
        {availableUnits.map((unit, idx) => (
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
      if (isEditable) {
        // For currency, display with formatting in edit mode
        const numValue = parseNumber(item.value || 0);
        const formattedValue = formatCurrency(numValue);
        
        return (
          <input
            type="text" 
            inputMode="decimal"
            value={formattedValue}
            onChange={(e) => {
              let val = e.target.value;
              // Remove all non-digit characters except decimal separator for input
              val = val.replace(/[^\d.,]/g, '');
              const numericValue = parseNumber(val);
              onChange(isNaN(numericValue) ? 0 : numericValue);
            }}
            className={`w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${column.align === 'right' ? 'text-right' : ''} ${cellBgColor}`}
          />
        );
      } else {
        return <span className="px-1 truncate">{formatCellValue(item.value, columnId)}</span>;
      }
      
    case 'number':
    case 'percentage':
      if (isEditable) {
        let step;
        if (type === 'percentage' || columnId === 'diskon_persen') step = '0.01';
        
        let displayValueInInput = '';
        if (item.value !== null && item.value !== undefined) {
          if (type === 'percentage' || columnId === 'diskon_persen') {
            displayValueInInput = String(item.value).replace('.', ',');
          } else {
            // For regular numbers, show with grouping separators
            const numValue = parseNumber(item.value || 0);
            displayValueInInput = numValue.toLocaleString('id-ID', {
              useGrouping: true,
              maximumFractionDigits: 0
            });
          }
        }

        return (
          <input
            type="text" 
            inputMode="decimal"
            value={displayValueInInput}
            step={step}
            onChange={(e) => {
              let val = e.target.value;
              let numericValue;
              if (type === 'percentage' || columnId === 'diskon_persen') {
                val = val.replace(/[^0-9,]/g, '');
                const parts = val.split(',');
                if (parts.length > 2) val = `${parts[0]},${parts.slice(1).join('')}`;
                numericValue = parseFloat(val.replace(',', '.') || 0);
              } else {
                val = val.replace(/[^0-9.,]/g, '');
                numericValue = parseNumber(val);
              }
              onChange(isNaN(numericValue) ? 0 : numericValue);
            }}
            className={`w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${column.align === 'right' ? 'text-right' : ''} ${cellBgColor}`}
          />
        );
      } else {
        return <span className="px-1 truncate">{formatCellValue(item.value, columnId)}</span>;
      }
      
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
      
    default:
       if (isEditable) {
          return (
            <input
              type="text"
              value={item.value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${cellBgColor}`}
            />
          );
       } else {
           return <span className="px-1 truncate">{item.value ?? '-'}</span>;
       }
  }
};

export default ItemsTableRow; 