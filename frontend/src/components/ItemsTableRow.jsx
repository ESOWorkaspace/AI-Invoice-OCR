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
          const isSearching = rowSearchStatus === 'searching' || rowSearchStatus === 'loading';
          const needsManualSearch = rowSearchStatus === 'not_found' || rowSearchStatus === 'error' || rowSearchStatus === 'notfound';
          const isEmpty = !item.value || item.value === '';
          const hasValue = item.value && item.value !== '';
          const isSuccess = rowSearchStatus === 'success';
          const isCached = rowSearchStatus === 'cached';
          
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
    const rowSearchStatus = searchStatus && searchStatus[rowIndex] ? searchStatus[rowIndex] : null;
    const isSearching = rowSearchStatus === 'searching' || rowSearchStatus === 'loading';
    const needsManualSearch = rowSearchStatus === 'not_found' || rowSearchStatus === 'error' || rowSearchStatus === 'notfound';
    const isEmpty = !item.value || item.value === '';
    const hasValue = item.value && item.value !== '';
    const isSuccess = rowSearchStatus === 'success';
    const isCached = rowSearchStatus === 'cached';
    
    return (
      <div 
        id={`cell-${columnId}-${rowIndex}`}
        className={`w-full cursor-pointer text-sm overflow-hidden ${isEmpty ? 'text-gray-400 italic' : ''}`}
        onClick={() => handleProductCellClick(columnId, rowIndex)}
      >
        {isSearching ? (
          <div className="flex items-center justify-center space-x-1">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <span>Searching...</span>
          </div>
        ) : needsManualSearch && isEmpty ? (
          <span className="text-orange-700">tidak ditemukan, cari...</span>
        ) : isEmpty ? (
          <span className="text-gray-400 italic">Click to search</span>
        ) : isSuccess || isCached ? (
          <span className="text-green-700">{item.value}</span>
        ) : (
          <span>{item.value}</span>
        )}
      </div>
    );
  }
  
  // Special handling for unit selection dropdown if available_units exists
  if (columnId === 'satuan_main' && (
    // Check multiple possible locations for available units
    (Array.isArray(parentItem.satuan_main?.available_units) && parentItem.satuan_main?.available_units.length > 0) || 
    (Array.isArray(parentItem.satuan_main?.units) && parentItem.satuan_main?.units.length > 0) ||
    (parentItem.satuan_main?.supplier_units && Object.keys(parentItem.satuan_main?.supplier_units).length > 0)
  )) {
    // Get current value from the parentItem (full row data) which should be up-to-date
    const currentValue = safeGet(parentItem, 'satuan_main.value', '');
    
    // Get available units from the enhanced data structure
    let availableUnits = [];
    
    // Check for properly formatted available_units array (objects with name property)
    if (Array.isArray(parentItem.satuan_main?.available_units)) {
      if (parentItem.satuan_main.available_units.length > 0) {
        // Check if the first item is an object with a name property
        if (typeof parentItem.satuan_main.available_units[0] === 'object' && 
            parentItem.satuan_main.available_units[0].name) {
          // Extract just the names for the dropdown
          availableUnits = parentItem.satuan_main.available_units.map(unit => unit.name);
        } else {
          // Use the array directly if they're not objects
          availableUnits = parentItem.satuan_main.available_units;
        }
      }
    } 
    // Fallback to other unit sources if available
    else if (Array.isArray(parentItem.satuan_main?.units)) {
      availableUnits = parentItem.satuan_main.units;
    }
    else if (parentItem.satuan_main?.supplier_units) {
      availableUnits = Object.keys(parentItem.satuan_main.supplier_units);
    }
    // If unit_prices exist, use their keys as available units
    else if (parentItem.satuan_main?.unit_prices && Object.keys(parentItem.satuan_main.unit_prices).length > 0) {
      availableUnits = Object.keys(parentItem.satuan_main.unit_prices);
    }
    
    // If we have a product object and it has units, use those
    if (availableUnits.length === 0 && parentItem.product) {
      if (parentItem.product.Units && Array.isArray(parentItem.product.Units)) {
        availableUnits = parentItem.product.Units.map(u => 
          typeof u === 'string' ? u : (u.Nama_Satuan || '')
        ).filter(Boolean);
      } else if (parentItem.product.units && Array.isArray(parentItem.product.units)) {
        availableUnits = parentItem.product.units.map(u => 
          typeof u === 'string' ? u : (u.Nama_Satuan || '')
        ).filter(Boolean);
      }
    }
    
    // Deduplicate the units
    availableUnits = [...new Set(availableUnits)];

    // Get supplier units metadata if available
    const supplierUnits = safeGet(parentItem, 'satuan_main.supplier_units', {});
    
    // Pass the full cell data object for background calculation
    const cellBgColorClass = getCellBackgroundColor(safeGet(parentItem, 'satuan_main')); 

    // Provide both dropdown and manual input options
    return (
      <div className="relative flex flex-row items-stretch w-full">
        <span className="text-xs text-gray-500 self-center">{safeGet(parentItem, 'satuan_main.invoice_unit', '')} {'= '} </span>
        <select 
          id={`satuan-main-select-${rowIndex}`}
          className="w-full py-1 px-2 border-none focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm bg-white"
          style={{
            backgroundColor: 'white' // Explicitly set background to white
          }}
          value={currentValue} // Use value from parentItem state
          onChange={(e) => {
            // Get the selected unit from dropdown
            const selectedUnit = e.target.value;
            
            // Call handleUnitChange with the row index and selected unit
            if (handleUnitChange) {
              handleUnitChange(rowIndex, selectedUnit);
            } else {
              console.error('ItemsTableRow: handleUnitChange prop is not provided');
            }
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
      </div>
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
          // Special handling for discount fields
          if (columnId === 'diskon_persen' || columnId === 'diskon_rp') {
            // For discount fields, check if the input field is currently focused
            const inputId = `discount-field-${rowIndex}-${columnId}`;
            if (document.activeElement === document.getElementById(inputId)) {
              // If focused, preserve the exact string format from the input
              const inputEl = document.getElementById(inputId);
              if (inputEl) {
                displayValueInInput = inputEl.value;
              } else {
                // If element not found, fall back to formatted value
                const numValue = parseFloat(item.value);
                displayValueInInput = !isNaN(numValue) ? 
                  numValue.toLocaleString('id-ID', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                    useGrouping: false
                  }).replace('.', ',') : '';
              }
            } else {
              // Not focused, format the number normally
              const numValue = parseFloat(item.value);
              if (!isNaN(numValue)) {
                // Check if the value has decimal places
                const hasDecimal = numValue !== Math.floor(numValue);
                
                // Format with appropriate decimal places
                displayValueInInput = numValue.toLocaleString('id-ID', {
                  minimumFractionDigits: hasDecimal ? 2 : 0,
                  maximumFractionDigits: 2,
                  useGrouping: columnId === 'diskon_rp'
                }).replace('.', ',');
              } else {
                displayValueInInput = '';
              }
            }
          } else if (type === 'percentage') {
            // For percentage fields, especially discount percentage
            // Only show decimal places if needed (not for whole numbers)
            const numValue = parseFloat(item.value);
            if (!isNaN(numValue)) {
              // Check if the value has decimal places
              const hasDecimal = numValue !== Math.floor(numValue);
              
              // Format with appropriate decimal places
              displayValueInInput = numValue.toLocaleString('id-ID', {
                minimumFractionDigits: hasDecimal ? 2 : 0,
                maximumFractionDigits: 2,
                useGrouping: false
              }).replace('.', ',');
              
              // If user is currently editing this field and it ends with comma or period,
              // preserve that so they can continue typing the decimal part
              if (document.activeElement === document.querySelector(`#discount-field-${rowIndex}-${columnId}`)) {
                const inputEl = document.querySelector(`#discount-field-${rowIndex}-${columnId}`);
                if (inputEl && (inputEl.value.endsWith(',') || inputEl.value.endsWith('.'))) {
                  displayValueInInput = displayValueInInput + ',';
                }
              }
            } else {
              displayValueInInput = '';
            }
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
            id={`discount-field-${rowIndex}-${columnId}`}
            type="text" 
            inputMode="decimal"
            value={displayValueInInput}
            step={step}
            onChange={(e) => {
              let val = e.target.value;
              
              if (columnId === 'diskon_persen' || columnId === 'diskon_rp') {
                // For discount fields, we want to:
                // 1. Preserve the exact string input for display
                // 2. Convert to float for calculations and state
                
                // First, validate that it contains valid characters
                if (/^[0-9.,]*$/.test(val)) {
                  // Handle conversion to float for calculation
                  let floatValue = 0;
                  
                  if (val !== '' && val !== '.' && val !== ',') {
                    // Normalize to use period as decimal separator for parseFloat
                    const lastCommaIndex = val.lastIndexOf(',');
                    const lastPeriodIndex = val.lastIndexOf('.');
                    
                    if (lastCommaIndex !== -1 || lastPeriodIndex !== -1) {
                      // If we have a decimal separator
                      const lastSepIndex = Math.max(lastCommaIndex, lastPeriodIndex);
                      const wholePart = val.substring(0, lastSepIndex).replace(/[,.]/g, '');
                      const decimalPart = val.substring(lastSepIndex + 1);
                      
                      // Build properly formatted number for parsing
                      const parseReady = `${wholePart}.${decimalPart}`;
                      floatValue = parseFloat(parseReady);
                    } else {
                      // No decimal separator
                      floatValue = parseFloat(val.replace(/[,.]/g, ''));
                    }
                    
                    // If parsing failed for some reason, default to 0
                    if (isNaN(floatValue)) floatValue = 0;
                  }
                  
                  // Update the state with the floating point value
                  onChange(floatValue);
                }
                // If input contains invalid chars, don't update
              } else if (type === 'percentage') {
                // Allow direct input of numbers, comma and period for decimal separator
                // First, remove any non-number, non-separator characters
                val = val.replace(/[^0-9,.]/g, ''); // Only allow comma as decimal in diskon_persen
                
                // For diskon_persen, allow both comma and period as decimal separator
                // First, normalize both to use a standard separator (period) for parsing
                const lastCommaIndex = val.lastIndexOf(',');
                const lastPeriodIndex = val.lastIndexOf('.');
                
                if (lastCommaIndex !== -1 || lastPeriodIndex !== -1) {
                  // Determine which separator was used last
                  const lastSeparatorIndex = Math.max(lastCommaIndex, lastPeriodIndex);
                  
                  // Split the value into whole and decimal parts
                  const wholePart = val.substring(0, lastSeparatorIndex).replace(/[,.]/g, '');
                  const decimalPart = val.substring(lastSeparatorIndex + 1);
                  
                  // Rebuild with period for parseFloat
                  val = `${wholePart}.${decimalPart}`;
                }
                
                // Parse value
                const numericValue = parseFloat(val);
                
                // Update if it's a valid number
                if (!isNaN(numericValue)) {
                  // Limit to 2 decimal places
                  const roundedValue = parseFloat(numericValue.toFixed(2));
                  onChange(roundedValue);
                } else if (val === '' || val === '.' || val === ',') {
                  // Empty or just separator - set to 0
                  onChange(0);
                } else {
                  // Keep the current input while editing, even if not a valid number yet
                  onChange(item.value);
                }
              } else {
                // Standard handling for other numeric fields
                val = val.replace(/[^0-9.,]/g, '');
                const numericValue = parseNumber(val);
                onChange(isNaN(numericValue) ? 0 : numericValue);
              }
            }}
            className={`w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${column.align === 'right' ? 'text-right' : ''} ${cellBgColor}`}
          />
        );
      } else {
        return <span className="px-1 truncate">{formatCellValue(item.value, columnId)}</span>;
      }
      
    case 'difference_percent':
      // The parentItem contains the whole row data
      
      // Extract the harga_dasar_main and harga_satuan values directly from the row data
      const hargaDasarObj = parentItem.harga_dasar_main || {};
      const hargaSatuanObj = parentItem.harga_satuan || {};
      
      // Safely get the values, defaulting to 0 if they don't exist
      const hargaDasar = parseFloat(hargaDasarObj.value || 0);
      const hargaSatuan = parseFloat(hargaSatuanObj.value || 0);
      
      
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

      // Extract prices directly from the parent row data
      const baseObj = parentItem.harga_dasar_main || {};
      const invoiceObj = parentItem.harga_satuan || {};
      
      // Safely get the values, defaulting to 0 if they don't exist
      const basePriceDiff = parseFloat(baseObj.value || 0);
      const invoicePriceDiff = parseFloat(invoiceObj.value || 0);
      
      
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