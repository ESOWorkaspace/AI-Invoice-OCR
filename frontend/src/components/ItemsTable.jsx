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
    { id: 'kode_barang_invoice', header: 'Kode Invoice', width: 140 },
    { id: 'nama_barang_invoice', header: 'Nama Invoice', width: 200 },
    { id: 'qty', header: 'Qty', width: 70, type: 'number', align: 'right' },
    { id: 'satuan', header: 'Satuan', width: 90 },
    { id: 'harga_satuan', header: 'Harga Satuan', width: 120, type: 'currency', align: 'right' },
    { id: 'harga_bruto', header: 'Harga Bruto', width: 120, type: 'currency', align: 'right' },
    { id: 'diskon_persen', header: 'Disc %', width: 80, type: 'percentage', align: 'right' },
    { id: 'diskon_rp', header: 'Disc Rp', width: 100, type: 'currency', align: 'right' },
    { id: 'jumlah_netto', header: 'Jumlah Netto', width: 130, type: 'currency', align: 'right' },
    { id: 'bkp', header: 'BKP', width: 70, type: 'boolean' },
    { id: 'ppn', header: 'PPN', width: 100, type: 'currency', align: 'right' },
    { id: 'kode_barang_main', header: 'Kode Main', width: 140, type: 'text', special: 'database' },
    { id: 'nama_barang_main', header: 'Nama Main', width: 200, type: 'text', special: 'database' },
    { id: 'satuan_main', header: 'Satuan Main', width: 120, type: 'text', special: 'database' },
    { id: 'harga_dasar_main', header: 'Harga Dasar', width: 130, type: 'currency', align: 'right', special: 'database' },
    { id: 'kenaikan_persen', header: 'Kenaikan %', width: 110, type: 'percentage', align: 'right' },
    { id: 'kenaikan_rp', header: 'Kenaikan Rp', width: 110, type: 'currency', align: 'right' },
    { id: 'margin_persen', header: 'Margin %', width: 110, type: 'percentage', align: 'right', special: 'database' },
    { id: 'margin_rp', header: 'Margin Rp', width: 110, type: 'currency', align: 'right', special: 'database' },
    { id: 'saran_margin_persen', header: 'Saran Margin %', width: 140, type: 'percentage', align: 'right', special: 'suggestion' },
    { id: 'saran_margin_rp', header: 'Saran Margin Rp', width: 145, type: 'currency', align: 'right', special: 'suggestion' }
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
    
    // First handle the unit-price relationship locally
    const item = safeGet(editableData, `output.items[${rowIndex}]`);
    if (item && 'satuan_main' in item) {
      // Get all available units and unit prices if they exist
      const availableUnits = item.satuan_main.available_units || [];
      const unitPrices = item.satuan_main.unit_prices || {};
      
      console.log('ItemsTable: Available units:', availableUnits);
      console.log('ItemsTable: Unit prices available:', unitPrices);
      console.log('ItemsTable: Selected unit:', newUnit);
      
      // Update the base price according to the selected unit if price data is available
      if (unitPrices && newUnit in unitPrices && 'harga_dasar_main' in item) {
        const newBasePrice = parseFloat(unitPrices[newUnit]) || 0;
        console.log(`ItemsTable: Updating harga_dasar_main to ${newBasePrice} for unit ${newUnit}`);
        
        // We'll apply this update through the handleItemChange function
        handleItemChange(rowIndex, 'harga_dasar_main', newBasePrice);
      } else {
        console.log(`ItemsTable: No price found for unit ${newUnit}`, unitPrices);
      }
    }
    
    // Then call the parent handler to update the unit value itself
    if (handleUnitChange) {
      handleUnitChange(rowIndex, newUnit);
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
                            className={`resizer`}
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