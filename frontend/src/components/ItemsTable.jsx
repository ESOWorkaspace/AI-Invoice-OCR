import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import ItemsTableRow from './ItemsTableRow';
import { DatePickerComponent, BooleanField } from './UIComponents';
import { safeGet } from '../utils/dataHelpers';

/**
 * Component for displaying the items table
 */
const ItemsTable = memo(({
  editableData,
  handleItemChange,
  searchStatus,
  handleProductCellClick,
  handleUnitChange,
  handleBKPChange,
  onAddItem,
  onDeleteItem
}) => {
  // Get items from editableData
  const items = safeGet(editableData, 'output.items', []);

  // State for column widths
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(null);
  const [initialWidth, setInitialWidth] = useState(null);
  
  // State to track manually changed unit row index
  const [manuallyChangedUnitIndex, setManuallyChangedUnitIndex] = useState(null);
  
  // Setup column definitions
  const columns = useMemo(() => [
    { id: 'index', header: '#', width: 40, sticky: true, left: 0 },
    { id: 'kode_barang_invoice', header: 'Kode Invoice', width: 110, editable: true },
    { id: 'nama_barang_invoice', header: 'Nama Invoice', width: 190, editable: true },
    { id: 'qty', header: 'Qty', width: 60, type: 'number', align: 'right', editable: true },
    { id: 'satuan', header: 'Satuan', width: 80, editable: true },
    { id: 'harga_satuan', header: 'Harga Satuan', width: 110, type: 'currency', align: 'right', editable: true },
    { id: 'harga_bruto', header: 'Harga Bruto', width: 110, type: 'currency', align: 'right' , editable: true },
    { id: 'diskon_persen', header: 'Disc %', width: 60, type: 'percentage', align: 'right', editable: true },
    { id: 'diskon_rp', header: 'Disc Rp', width: 95, type: 'currency', align: 'right' , editable: true },
    { id: 'jumlah_netto', header: 'Jumlah Netto', width: 110, type: 'currency', align: 'right' , editable: true },
    { id: 'bkp', header: 'BKP', width: 60, type: 'boolean' },
    { id: 'ppn', header: 'PPN', width: 90, type: 'currency', align: 'right' },
    { id: 'kode_barang_main', header: 'Kode Main', width: 130, type: 'text', special: 'productSearch' },
    { id: 'nama_barang_main', header: 'Nama Main', width: 190, type: 'text', special: 'productSearch' },
    { id: 'satuan_main', header: 'Satuan Main', width: 110, type: 'text', special: 'unitSelect' },
    { id: 'harga_dasar_main', header: 'Harga Dasar', width: 120, type: 'currency', align: 'right', special: 'database' },
    { id: 'perbedaan_persen', header: 'Perbedaan % ', width: 120, type: 'difference_percent', align: 'right' },
    { id: 'perbedaan_rp', header: 'Perbedaan Rp', width: 120, type: 'difference_amount', align: 'right' },
    { id: 'action', header: 'Aksi', width: 50 }
  ], []);
  
  // Initialize column widths on mount
  useEffect(() => {
    const initialWidths = {};
    columns.forEach(column => {
      initialWidths[column.id] = column.width || 100;
    });
    setColumnWidths(initialWidths);
  }, [columns]);
  
  // Add useEffect to sync satuan_main with satuan_supplier when appropriate
  useEffect(() => {
    if (!items || !Array.isArray(items)) return;
    
    items.forEach((item, rowIndex) => {
      // Skip if this row was just manually changed
      if (rowIndex === manuallyChangedUnitIndex) {
        console.log(`ItemsTable: Skipping auto-sync for row ${rowIndex} - Manual change detected`);
        return;
      }
      
      if (!item.satuan || !item.satuan_main) return;
      
      const supplierUnit = safeGet(item, 'satuan.value', '');
      const mainUnit = safeGet(item, 'satuan_main.value', '');
      const availableUnits = safeGet(item, 'satuan_main.available_units', []);
      const unitPrices = safeGet(item, 'satuan_main.unit_prices', {});
      const storedSupplierUnit = safeGet(item, 'satuan_main.supplier_unit', '');
      const invoicePrice = parseFloat(safeGet(item, 'harga_satuan.value', 0));
      
      if (!supplierUnit) return;
      
      // Skip if current mainUnit is valid and available
      if (mainUnit && availableUnits.includes(mainUnit)) {
          return; // Skip auto-sync for this item, preserving manual selection
      }

      // Only proceed if we need to update (supplier unit changed OR main unit is invalid/empty)
      const needsUpdate = supplierUnit !== storedSupplierUnit || !mainUnit || !availableUnits.includes(mainUnit);
                         
      if (!needsUpdate) {
        return;
      }
      
      console.log(`ItemsTable: Syncing units for row ${rowIndex}. Supplier: ${supplierUnit}, Current Main: ${mainUnit}, Invoice Price: ${invoicePrice}`);
      
      // Check for supplier_units mapping (product.supplier_units format)
      const supplierUnits = {};
      
      // Convert available supplier units into a map if it's not already
      if (item.satuan_main.supplier_units && typeof item.satuan_main.supplier_units === 'object') {
        // Direct map: { mainUnit: supplierUnit }
        Object.entries(item.satuan_main.supplier_units).forEach(([main, supplier]) => {
          supplierUnits[main] = String(supplier);
        });
      }
      
      let newMainUnit = '';
      let matchReason = '';
      
      // PRIORITY 1: Find a main unit that maps to this supplier unit
      if (Object.keys(supplierUnits).length > 0) {
        console.log(`ItemsTable: Checking direct mapping for "${supplierUnit}" from:`, supplierUnits);
        
        for (const [main, mappedSupplierUnit] of Object.entries(supplierUnits)) {
          // Normalize both strings: trim whitespace and convert to lowercase
          const normalizedMapped = String(mappedSupplierUnit).toLowerCase().trim();
          const normalizedSupplier = String(supplierUnit).toLowerCase().trim();
          
          console.log(`  - Comparing "${mappedSupplierUnit}" with "${supplierUnit}"`);
          console.log(`  - Normalized: "${normalizedMapped}" vs "${normalizedSupplier}"`);
          
          // Check for exact match after normalization
          if (normalizedMapped === normalizedSupplier) {
            newMainUnit = main;
            matchReason = 'direct supplier mapping';
            console.log(`  ✓ MATCH FOUND: ${main}`);
            break;
          }
          
          // Also check if supplier unit is contained within mapped value (for partial matches)
          if (normalizedMapped.includes(normalizedSupplier) || normalizedSupplier.includes(normalizedMapped)) {
            newMainUnit = main;
            matchReason = 'partial supplier mapping';
            console.log(`  ✓ PARTIAL MATCH FOUND: ${main}`);
            // Don't break here - continue looking for exact match first
          }
        }
      }
      
      // PRIORITY 2: If we have an invoice price, find the unit with a matching price
      if (!newMainUnit && invoicePrice > 0 && Object.keys(unitPrices).length > 0) {
        for (const [unit, price] of Object.entries(unitPrices)) {
          const unitPrice = parseFloat(price) || 0;
          // Match within 1% to account for rounding differences
          if (Math.abs(unitPrice - invoicePrice) / invoicePrice < 0.01) {
            newMainUnit = unit;
            matchReason = 'price match';
            break;
          }
        }
      }
      
      // PRIORITY 3: If still no match, check if there's a previously confirmed mapping
      if (!newMainUnit && item.satuan_main.previous_mapping) {
        const previousMapping = item.satuan_main.previous_mapping;
        if (previousMapping[supplierUnit]) {
          newMainUnit = previousMapping[supplierUnit];
          matchReason = 'previous mapping';
        }
      }
      
      // PRIORITY 4: If no match found, use the first available unit that has a price
      if (!newMainUnit && availableUnits.length > 0 && Object.keys(unitPrices).length > 0) {
        for (const unit of availableUnits) {
          if (unit in unitPrices) {
            newMainUnit = unit;
            matchReason = 'first available with price';
            break;
          }
        }
      }
      
      // PRIORITY 5: If still no unit found, just use the first available unit
      if (!newMainUnit && availableUnits.length > 0) {
        newMainUnit = availableUnits[0];
        matchReason = 'first available';
      }
      
      console.log(`ItemsTable: Selected main unit "${newMainUnit}" (reason: ${matchReason})`);
      
      // If we found a main unit to use and it's different from the current one, update it
      if (newMainUnit && newMainUnit !== mainUnit) {
        console.log(`ItemsTable: Updating main unit from "${mainUnit}" to "${newMainUnit}" (reason: ${matchReason})`);
        
        // Update satuan_main with the correct main unit and store supplier unit
        item.satuan_main = {
          ...item.satuan_main,
          value: newMainUnit,
          is_confident: true,
          supplier_unit: supplierUnit,
          // Store this mapping for future reference
          previous_mapping: {
            ...(item.satuan_main.previous_mapping || {}),
            [supplierUnit]: newMainUnit
          }
        };
        
        // Use the parent handler to ensure all dependent calculations are performed
        if (handleUnitChange) {
          handleUnitChange(rowIndex, newMainUnit);
        }
        
        // Also update the base price directly if we have unit prices
        if (unitPrices && newMainUnit in unitPrices) {
          const newBasePrice = parseFloat(unitPrices[newMainUnit]) || 0;
          
          if (item.harga_dasar_main && newBasePrice > 0) {
            console.log(`ItemsTable: Updating base price from ${safeGet(item, 'harga_dasar_main.value', 0)} to ${newBasePrice}`);
            
            // Use handleItemChange to ensure proper state updates
            handleItemChange(rowIndex, 'harga_dasar_main', newBasePrice);
          }
        }
      }
    });
    
    // Reset manually changed index after processing all items
    if (manuallyChangedUnitIndex !== null) {
      setManuallyChangedUnitIndex(null);
    }
  }, [items, handleUnitChange, handleItemChange, manuallyChangedUnitIndex]);
  
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
                        {column.id !== 'index' && column.id !== 'action' && (
                          <div 
                            className={`resizer`}
                            onMouseDown={(e) => startResize(e, column.id)}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, rowIndex) => (
                    <ItemsTableRow 
                      key={item.id || `item-${rowIndex}`} 
                      item={item} 
                      rowIndex={rowIndex} 
                      columns={columns} 
                      columnWidths={columnWidths} 
                      handleItemChange={handleItemChange} 
                      searchStatus={searchStatus} 
                      handleProductCellClick={handleProductCellClick}
                      handleUnitChange={(rIndex, newUnit) => {
                        // Track that this row was manually changed
                        setManuallyChangedUnitIndex(rIndex);
                        // Then call the parent handler
                        handleUnitChange(rIndex, newUnit);
                      }}
                      renderDatePicker={renderDatePicker}
                      renderBooleanField={renderBooleanField}
                      handleBKPChange={handleBKPChange}
                      onDeleteItem={onDeleteItem}
                    />
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-4 text-gray-500">
                        No items found or added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <button
            onClick={onAddItem} 
            className="m-4 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={!onAddItem} 
          >
            + Tambah Item
          </button>
        </div>
      </div>
    </div>
  );
});

export default ItemsTable;