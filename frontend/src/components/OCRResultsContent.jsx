function OCRResultsContent({ 
  editableData, 
  columns, 
  columnWidths,
  handleItemChange,
  searchStatus,
  handleProductCellClick,
  startResize,
  renderDatePicker,
  handleHeaderChange,
  safeGet,
  getCellBackgroundColor,
  renderBooleanField,
  handleIncludePPNChange,
  formatCurrency
}) {
  const renderCell = React.useCallback((columnId, rowIndex, type = null, align = 'left', special = null) => {
    // Cell render logic here...
    // This function can remain unchanged as it's passed down from OCRResultsTable
  }, [
    handleItemChange, 
    searchStatus, 
    handleProductCellClick, 
    renderDatePicker, 
    renderBooleanField, 
    getCellBackgroundColor,
    formatCurrency
  ]);

  if (!editableData) {
    return null;
  }

  const { output } = editableData;
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Invoice Header */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Header content can remain unchanged */}
      </div>
      
      {/* Items Table - add overflow container with scroll preservation */}
      <div className="relative overflow-auto border border-gray-300 rounded-md" style={{ maxWidth: '100%' }} id="table-container">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th 
                  key={column.id}
                  className={`
                    px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider
                    border-b border-gray-300
                    ${column.sticky ? 'sticky z-10' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{
                    width: `${columnWidths[column.id]}px`,
                    minWidth: `${columnWidths[column.id]}px`,
                    left: column.sticky ? `${column.left}px` : 'auto',
                    backgroundColor: column.sticky ? '#f3f4f6' : ''
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span>{column.header}</span>
                    <div 
                      className="w-1 h-full cursor-col-resize absolute right-0 top-0 hover:bg-blue-500"
                      onMouseDown={(e) => startResize(e, column.id)}
                    ></div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {output.items && output.items.map((item, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column) => (
                  <td 
                    key={`${rowIndex}-${column.id}`}
                    className={`
                      px-3 py-2 text-sm
                      border-b border-gray-300
                      ${column.sticky ? 'sticky z-10' : ''}
                      ${column.align === 'center' ? 'text-center' : ''}
                      ${column.align === 'right' ? 'text-right' : ''}
                    `}
                    style={{
                      left: column.sticky ? `${column.left}px` : 'auto',
                      backgroundColor: column.sticky 
                        ? (rowIndex % 2 === 0 ? 'white' : '#f9fafb') 
                        : 'transparent'
                    }}
                  >
                    {column.id === 'index' ? (
                      rowIndex + 1
                    ) : (
                      renderCell(
                        column.id, 
                        rowIndex, 
                        column.type, 
                        column.align, 
                        column.special
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Totals */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Footer content can remain unchanged */}
      </div>
    </div>
  );
} 