import React, { useState, useEffect, useRef, useMemo } from 'react';
import ItemsTableRow from './ItemsTableRow';
import { DatePickerComponent, BooleanField } from './UIComponents';
import { safeGet } from '../utils/dataHelpers';

/**
 * Component for displaying the items table
 */
const ItemsTable = ({
  editableData,
  handleItemChange,
  searchStatus,
  handleProductCellClick,
  handleUnitChange,
  handleBKPChange
}) => {
  // State for column widths
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(null);
  const [initialWidth, setInitialWidth] = useState(null);
  
  // Setup column definitions
  const columns = useMemo(() => [
    { id: 'index', header: '#', width: 40, sticky: true, left: 0 },
    { id: 'kode_barang_invoice', header: 'Kode Invoice', width: 110 },
    { id: 'nama_barang_invoice', header: 'Nama Invoice', width: 200 },
    { id: 'qty', header: 'Qty', width: 70, type: 'number', align: 'right' },
    { id: 'satuan', header: 'Satuan', width: 90 },
    { id: 'harga_satuan', header: 'Harga Satuan', width: 120, type: 'currency', align: 'right' },
    { id: 'harga_bruto', header: 'Harga Bruto', width: 120, type: 'currency', align: 'right' },
    { id: 'diskon_persen', header: 'Disc %', width: 70, type: 'percentage', align: 'right' },
    { id: 'diskon_rp', header: 'Disc Rp', width: 90, type: 'currency', align: 'right' },
    { id: 'jumlah_netto', header: 'Jumlah Netto', width: 115, type: 'currency', align: 'right' },
    { id: 'bkp', header: 'BKP', width: 70, type: 'boolean' },
    { id: 'ppn', header: 'PPN', width: 100, type: 'currency', align: 'right' },
    { id: 'kode_barang_main', header: 'Kode Main', width: 140, type: 'text', special: 'database' },
    { id: 'nama_barang_main', header: 'Nama Main', width: 200, type: 'text', special: 'database' },
    { id: 'satuan_main', header: 'Satuan Main', width: 120, type: 'text', special: 'database' },
    { id: 'harga_dasar_main', header: 'Harga Dasar', width: 130, type: 'currency', align: 'right', special: 'database' },
    { id: 'perbedaan_persen', header: 'Perbedaan %', width: 130, type: 'difference_percent', align: 'right' },
    { id: 'perbedaan_rp', header: 'Perbedaan Rp', width: 130, type: 'difference_amount', align: 'right' }
  ], []);
  
  // Initialize column widths on mount
  useEffect(() => {
    const initialWidths = {};
    columns.forEach(column => {
      initialWidths[column.id] = column.width || 100;
    });
    setColumnWidths(initialWidths);
  }, [columns]);
  
  // Start resizing
  const startResize = (e, columnId) => {
    e.preventDefault();
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setInitialWidth(columnWidths[columnId]);
    
    // Use functions that will be bound with actual event handlers
    const handleResize = (moveEvent) => handleMouseMove(moveEvent);
    const handleResizeEnd = () => handleMouseUp();
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Store the handlers to be able to remove them later
    window.resizeHandlers = {
      move: handleResize,
      up: handleResizeEnd
    };
  };
  
  // Handle mouse move during resizing
  const handleMouseMove = (e) => {
    if (resizingColumn === null) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(50, initialWidth + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  };
  
  // Handle mouse up to stop resizing
  const handleMouseUp = () => {
    if (resizingColumn === null) return;
    
    setResizingColumn(null);
    
    // Remove event listeners using the stored handlers
    if (window.resizeHandlers) {
      document.removeEventListener('mousemove', window.resizeHandlers.move);
      document.removeEventListener('mouseup', window.resizeHandlers.up);
      window.resizeHandlers = null;
    }
  };
  
  // Manage unit change and update price data accordingly
  const handleUnitChangeInternal = (rowIndex, newUnit) => {
    console.log(`ItemsTable: Changing unit for row ${rowIndex} to ${newUnit}`);
    
    // Make sure editableData and required structure exists
    if (!editableData || !editableData.output || !Array.isArray(editableData.output.items)) {
      console.error(`ItemsTable: Invalid data structure - editableData.output.items is not available`);
      console.debug('ItemsTable: editableData structure:', editableData);
      
      // Still call parent handler to maintain expected behavior
      if (handleUnitChange) {
        handleUnitChange(rowIndex, newUnit);
      }
      return;
    }
    
    // Check if rowIndex is valid
    if (rowIndex < 0 || rowIndex >= editableData.output.items.length) {
      console.error(`ItemsTable: Row index ${rowIndex} is out of bounds (items length: ${editableData.output.items.length})`);
      
      // Still call parent handler to maintain expected behavior
      if (handleUnitChange) {
        handleUnitChange(rowIndex, newUnit);
      }
      return;
    }
    
    // Get item data for the row
    const item = editableData.output.items[rowIndex];
    if (!item) {
      console.error(`ItemsTable: Item not found at row ${rowIndex} even though index is within bounds`);
      
      // Still call parent handler to maintain expected behavior
      if (handleUnitChange) {
        handleUnitChange(rowIndex, newUnit);
      }
      return;
    }
    
    // Log detailed debug info for troubleshooting
    console.log(`ItemsTable: Processing unit change for row ${rowIndex}:`, {
      newUnit,
      item: JSON.stringify(item, null, 2)
    });
    
    if ('satuan_main' in item) {
      // Get available units and unit prices
      const availableUnits = item.satuan_main.available_units || [];
      const unitPrices = item.satuan_main.unit_prices || {};
      
      console.log(`ItemsTable: Available units (${availableUnits.length}):`, availableUnits);
      console.log(`ItemsTable: Unit prices available:`, unitPrices);
      console.log(`ItemsTable: Units with prices (${Object.keys(unitPrices).length}):`, Object.keys(unitPrices));
      
      // Dump each unit price for clarity
      for (const unit in unitPrices) {
        console.log(`ItemsTable: Unit [${unit}] price: ${unitPrices[unit]}`);
      }
      
      // Update unit value first through parent handler
      if (handleUnitChange) {
        console.log(`ItemsTable: Calling parent handleUnitChange with unit [${newUnit}]`);
        handleUnitChange(rowIndex, newUnit);
      }
      
      // Process unit price changes after a short delay to ensure unit update is processed
      setTimeout(() => {
        // Check if we have unit-specific prices
        if (unitPrices && typeof unitPrices === 'object' && Object.keys(unitPrices).length > 0) {
          console.log(`ItemsTable: Processing price for unit [${newUnit}]`);
          
          let newBasePrice = null;
          
          // Check if the selected unit has a specific price
          if (newUnit in unitPrices) {
            newBasePrice = parseFloat(unitPrices[newUnit]) || 0;
            console.log(`ItemsTable: Found specific price ${newBasePrice} for unit [${newUnit}]`);
          } else {
            console.log(`ItemsTable: No specific price found for unit [${newUnit}]`);
            
            // Fallback to default or first available price
            if ('default' in unitPrices) {
              newBasePrice = parseFloat(unitPrices.default) || 0;
              console.log(`ItemsTable: Using default price ${newBasePrice}`);
            } else if (Object.keys(unitPrices).length > 0) {
              const firstUnit = Object.keys(unitPrices)[0];
              newBasePrice = parseFloat(unitPrices[firstUnit]) || 0;
              console.log(`ItemsTable: Using fallback price ${newBasePrice} from unit [${firstUnit}]`);
            }
          }
          
          // Update the base price if we have a valid price
          if (newBasePrice !== null && 'harga_dasar_main' in item) {
            const currentPrice = parseFloat(safeGet(item, 'harga_dasar_main.value', 0));
            console.log(`ItemsTable: Updating harga_dasar_main from ${currentPrice} to ${newBasePrice}`);
            
            // Update the base price value
            handleItemChange(rowIndex, 'harga_dasar_main', newBasePrice);
            
            // Also update margins if needed
            if ('margin_persen' in item && 'harga_jual_main' in item) {
              const hargaJual = parseFloat(safeGet(item, 'harga_jual_main.value', 0));
              if (hargaJual > 0 && newBasePrice > 0) {
                const marginPersen = ((hargaJual - newBasePrice) / newBasePrice) * 100;
                const marginRp = hargaJual - newBasePrice;
                
                handleItemChange(rowIndex, 'margin_persen', marginPersen);
                handleItemChange(rowIndex, 'margin_rp', marginRp);
                
                console.log(`ItemsTable: Updated margins - ${marginPersen.toFixed(2)}% (${marginRp.toFixed(2)} Rp)`);
              }
            }
          } else {
            console.warn(`ItemsTable: Could not update price - newBasePrice=${newBasePrice}, has_harga_dasar_main=${('harga_dasar_main' in item)}`);
          }
        } else {
          console.log(`ItemsTable: No unit prices available for price updating`);
        }
      }, 100); // Increased delay to ensure unit change is fully processed
    } else {
      console.warn(`ItemsTable: satuan_main field not found in item at row ${rowIndex}`);
      
      // Still call parent handler to update the unit value
      if (handleUnitChange) {
        handleUnitChange(rowIndex, newUnit);
      }
    }
  };
  
  // Utility function to render date picker
  const renderDatePicker = (data, onChange) => {
    return (
      <DatePickerComponent
        data={data}
        onChange={onChange}
      />
    );
  };
  
  // Utility function to render boolean field
  const renderBooleanField = (data, onChange, options = ['Ya', 'Tidak']) => {
    return (
      <BooleanField
        data={data}
        onChange={onChange}
        options={options}
      />
    );
  };
  
  return (
    <div className="mt-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Items</h2>
        </div>
        <div className="p-4">
          <div className="border border-gray-200 rounded-md overflow-auto">
            <style>{`
              .hover-highlight:hover {
                background-color: #f9fafb;
              }
              
              /* Custom scrollbar styles */
              .table-container {
                overflow-x: auto;
                scrollbar-width: thin;
              }
              
              /* Scrollbar styles */
              .table-container::-webkit-scrollbar {
                height: 8px;
                width: 8px;
              }
              
              .table-container::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 4px;
              }
              
              .table-container::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
              }
              
              .table-container::-webkit-scrollbar-thumb:hover {
                background: #555;
              }
              
              /* Sticky columns */
              .sticky {
                position: sticky;
                z-index: 1;
              }
              
              /* Highlight row on hover */
              tr:hover td:not(.sticky) {
                background-color: #f9fafb !important;
              }
              
              /* Resizer */
              .resizer {
                position: absolute;
                right: -8px;
                top: 0;
                height: 100%;
                width: 16px;
                cursor: col-resize;
                user-select: none;
                touch-action: none;
                z-index: 10;
                background: transparent;
              }

              .resizer:hover,
              .resizer.isResizing {
                background: rgba(0, 0, 0, 0.5);
                width: 4px;
                right: -2px;
              }
              
              th {
                position: relative;
                overflow: visible;
              }
              
              .resizable-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                table-layout: fixed;
              }
            `}</style>
            <div className="table-container">
              <table className="resizable-table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column, index) => (
                      <th 
                        key={index} 
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 border-r border-gray-50 relative ${column.sticky ? 'sticky z-10' : ''}`}
                        style={{ 
                          width: `${columnWidths[column.id]}px`,
                          ...(column.sticky ? { left: `${column.left}px`, backgroundColor: '#f9fafb' } : {})
                        }}
                      >
                        <div className="flex items-center w-full h-full">
                          <span className="truncate">{column.header}</span>
                        </div>
                        {column.id !== 'index' && (
                          <div 
                            className="resizer"
                            onMouseDown={(e) => startResize(e, column.id)}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {safeGet(editableData, 'output.items', []).map((item, rowIndex) => (
                    <ItemsTableRow 
                      key={rowIndex} 
                      item={item} 
                      rowIndex={rowIndex} 
                      columns={columns} 
                      columnWidths={columnWidths} 
                      handleItemChange={handleItemChange} 
                      searchStatus={searchStatus} 
                      handleProductCellClick={handleProductCellClick}
                      handleUnitChange={handleUnitChangeInternal}
                      renderDatePicker={renderDatePicker}
                      renderBooleanField={renderBooleanField}
                      handleBKPChange={handleBKPChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsTable;