import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function OCRResultsTable({ data, onDataChange }) {
  // Initialize state with data or default values
  const [editableData, setEditableData] = useState(data || {});
  
  // Normalize data structure if needed
  useEffect(() => {
    if (data) {
      // Create a normalized copy of the data
      const normalizedData = { ...data };
      
      // Ensure output exists
      if (!normalizedData.output) {
        normalizedData.output = {};
      }
      
      // Handle case where output fields might be at the root level
      if (!normalizedData.output.tanggal_faktur && data.tanggal_faktur) {
        normalizedData.output.tanggal_faktur = data.tanggal_faktur;
      }
      
      // Handle case where tgl_jatuh_tempo exists but tanggal_jatuh_tempo doesn't
      if (normalizedData.output.tgl_jatuh_tempo && !normalizedData.output.tanggal_jatuh_tempo) {
        normalizedData.output.tanggal_jatuh_tempo = normalizedData.output.tgl_jatuh_tempo;
      }
      
      // Ensure items array exists
      if (!normalizedData.output.items) {
        normalizedData.output.items = [];
      }
      
      // Add default values for fields that should be marked as coming from database
      if (!normalizedData.output.ppn_rate) {
        normalizedData.output.ppn_rate = { value: "11", is_confident: true, from_database: true };
      } else {
        normalizedData.output.ppn_rate.from_database = true;
      }
      
      if (!normalizedData.output.margin_threshold) {
        normalizedData.output.margin_threshold = { value: "15", is_confident: true, from_database: true };
      } else {
        normalizedData.output.margin_threshold.from_database = true;
      }
      
      // Set default include_ppn to true if not present
      if (!normalizedData.output.include_ppn) {
        normalizedData.output.include_ppn = { value: true, is_confident: true };
      }
      
      // Process each item to add default values and calculate fields
      if (normalizedData.output.items && normalizedData.output.items.length > 0) {
        normalizedData.output.items = normalizedData.output.items.map(item => {
          // Add default BKP as true if not present
          if (!item.bkp) {
            item.bkp = { value: true, is_confident: true };
          }
          
          // Add database fields with from_database flag
          if (!item.kode_barang_main) {
            item.kode_barang_main = { value: "", is_confident: true, from_database: true };
          } else {
            item.kode_barang_main.from_database = true;
          }
          
          if (!item.nama_barang_main) {
            item.nama_barang_main = { value: "", is_confident: true, from_database: true };
          } else {
            item.nama_barang_main.from_database = true;
          }
          
          if (!item.satuan_main) {
            item.satuan_main = { value: "", is_confident: true, from_database: true };
          } else {
            item.satuan_main.from_database = true;
          }
          
          if (!item.harga_jual_main) {
            item.harga_jual_main = { value: 0, is_confident: true, from_database: true };
          } else {
            item.harga_jual_main.from_database = true;
          }
          
          if (!item.margin_persen) {
            item.margin_persen = { value: 0, is_confident: true, from_database: true };
          } else {
            item.margin_persen.from_database = true;
          }
          
          if (!item.margin_rp) {
            item.margin_rp = { value: 0, is_confident: true, from_database: true };
          } else {
            item.margin_rp.from_database = true;
          }
          
          if (!item.kenaikan_persen) {
            item.kenaikan_persen = { value: 0, is_confident: true, from_database: true };
          } else {
            item.kenaikan_persen.from_database = true;
          }
          
          if (!item.kenaikan_rp) {
            item.kenaikan_rp = { value: 0, is_confident: true, from_database: true };
          } else {
            item.kenaikan_rp.from_database = true;
          }
          
          // Calculate PPN based on BKP and jumlah_netto
          const ppnRate = parseFloat(safeGet(normalizedData, 'output.ppn_rate.value', 11));
          const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0));
          const bkpValue = safeGet(item, 'bkp.value', true);
          
          if (bkpValue === true) {
            const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
            
            if (!item.ppn) {
              item.ppn = { value: ppnValue, is_confident: true };
            } else {
              item.ppn.value = ppnValue;
            }
          } else if (!item.ppn) {
            item.ppn = { value: 0, is_confident: true };
          }
          
          return item;
        });
      }
      
      setEditableData(normalizedData);
    }
  }, [data]);

  // Function to safely access nested properties
  const safeGet = (obj, path, defaultValue = '') => {
    try {
      const result = path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
      return result !== undefined ? result : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  // Function to get background color based on confidence and database source
  const getCellBackgroundColor = (cellData) => {
    if (!cellData) return 'bg-white';
    
    // Fields from database should be green
    if (cellData.from_database) {
      return 'bg-green-100';
    }
    
    // For null or empty values
    if (cellData.value === null || cellData.value === '' || cellData.value === undefined) {
      return 'bg-red-100';
    }
    
    // For low confidence values
    if (cellData.is_confident === false) {
      return 'bg-orange-100';
    }
    
    // For high confidence values
    if (cellData.is_confident === true) {
      return 'bg-white';
    }
    
    // Default
    return 'bg-white';
  };

  const handleHeaderChange = (field, value) => {
    const newData = { ...editableData };
    
    // Store the field name for the date picker component
    if (newData.output[field]) {
      newData.output[field]._fieldName = field;
    }
    
    // Update the value
    newData.output[field] = {
      ...newData.output[field],
      value: value,
      is_confident: true,
      _fieldName: field  // Store field name for reference in renderDatePicker
    };
    
    // Validate dates if this is a date field
    if (field === 'tanggal_faktur' || field === 'tgl_jatuh_tempo') {
      const invoiceDateValue = parseDate(newData.output.tanggal_faktur?.value);
      const dueDateValue = parseDate(newData.output.tgl_jatuh_tempo?.value);
      
      // Only validate if both dates exist
      if (invoiceDateValue && dueDateValue) {
        if (invoiceDateValue > dueDateValue) {
          // Show warning but don't prevent the change
          console.warn('Tanggal faktur tidak boleh lebih dari tanggal jatuh tempo');
          
          // You can add a toast notification here if desired
          // toast.warning('Tanggal faktur tidak boleh lebih dari tanggal jatuh tempo');
        }
      }
    }
    
    setEditableData(newData);
    onDataChange(newData);
  };

  const handleItemChange = (index, field, value) => {
    const newData = { ...editableData };
    if (index === -1) {
      // Handle header fields
      newData.output[field] = {
        ...newData.output[field],
        value: value,
        is_confident: true
      };
    } else {
      // Handle item fields
      if (newData.output.items && newData.output.items[index]) {
        newData.output.items[index][field] = {
          ...newData.output.items[index][field],
          value: value,
          is_confident: true
        };
      }
    }
    setEditableData(newData);
    onDataChange(newData);
  };

  // Handle BKP change and update PPN
  const handleBKPChange = (rowIndex, value) => {
    const newData = { ...editableData };
    const item = newData.output.items[rowIndex];
    
    // Update BKP value
    if (!item.bkp) {
      item.bkp = { value: value, is_confident: true };
    } else {
      item.bkp.value = value;
    }
    
    // Calculate PPN based on BKP value and PPN rate
    const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
    const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0));
    
    if (value === true) {
      // If BKP is true (Ya), calculate PPN
      const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
      
      if (!item.ppn) {
        item.ppn = { value: ppnValue, is_confident: true };
      } else {
        item.ppn.value = ppnValue;
      }
    } else {
      // If BKP is false (Tidak), set PPN to 0
      if (!item.ppn) {
        item.ppn = { value: 0, is_confident: true };
      } else {
        item.ppn.value = 0;
      }
    }
    
    setEditableData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Handle Include PPN change and update all BKP values
  const handleIncludePPNChange = (value) => {
    const newData = { ...editableData };
    
    // Update include_ppn value
    if (!newData.output.include_ppn) {
      newData.output.include_ppn = { value: value, is_confident: true };
    } else {
      newData.output.include_ppn.value = value;
    }
    
    // Update all BKP values based on include_ppn
    if (newData.output.items && newData.output.items.length > 0) {
      newData.output.items.forEach((item, index) => {
        // Set BKP to match include_ppn value
        if (!item.bkp) {
          item.bkp = { value: value, is_confident: true };
        } else {
          item.bkp.value = value;
        }
        
        // Update PPN based on BKP value
        const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
        const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0));
        
        if (value === true) {
          // If BKP is true (Ya), calculate PPN
          const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
          
          if (!item.ppn) {
            item.ppn = { value: ppnValue, is_confident: true };
          } else {
            item.ppn.value = ppnValue;
          }
        } else {
          // If BKP is false (Tidak), set PPN to 0
          if (!item.ppn) {
            item.ppn = { value: 0, is_confident: true };
          } else {
            item.ppn.value = 0;
          }
        }
      });
    }
    
    setEditableData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Utility functions
  const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle Indonesian number format (dots as thousand separators, comma as decimal)
      // First, remove all dots
      let cleanValue = value.replace(/\./g, '');
      // Then, replace comma with dot for decimal
      cleanValue = cleanValue.replace(/,/g, '.');
      // Convert to number
      const result = Number(cleanValue);
      // Return the number or 0 if it's NaN
      return isNaN(result) ? 0 : result;
    }
    return 0;
  };

  const formatCurrency = (value) => {
    // Ensure we're working with a number
    const numValue = typeof value === 'number' ? value : parseNumber(value);
    // Format using Indonesian locale (dots for thousands, comma for decimal)
    return new Intl.NumberFormat('id-ID', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const parseDate = (value) => {
    if (!value) return null;
    
    // Handle epoch timestamp (number)
    if (typeof value === 'number') {
      return new Date(value);
    }
    
    // Handle string dates
    if (typeof value === 'string') {
      // Try parsing dd-mm-yyyy
      const ddmmyyyyMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (ddmmyyyyMatch) {
        return new Date(ddmmyyyyMatch[3], ddmmyyyyMatch[2] - 1, ddmmyyyyMatch[1]);
      }
      
      // Try parsing yyyy-mm-dd
      const yyyymmddMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (yyyymmddMatch) {
        return new Date(yyyymmddMatch[1], yyyymmddMatch[2] - 1, yyyymmddMatch[3]);
      }
    }
    
    // Try direct Date parsing as fallback
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDateDisplay = (value) => {
    if (!value) return '';
    
    const date = parseDate(value);
    if (!date || isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  const renderDatePicker = (data, onChange) => {
    const rawValue = data?.value;
    let dateValue = null;
    
    if (rawValue) {
      // Handle different date formats
      if (typeof rawValue === 'string') {
        // Parse date string in format DD-MM-YYYY
        const parts = rawValue.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
          const year = parseInt(parts[2], 10);
          dateValue = new Date(year, month, day);
        }
      } else if (typeof rawValue === 'number') {
        // Handle timestamp
        dateValue = new Date(rawValue);
      }
    }
    
    // Get the field name from the parent object keys
    const fieldName = data._fieldName || '';
    
    // Create constraints for date validation
    let minDate = undefined;
    let maxDate = undefined;
    
    // Add validation constraints based on field name
    if (fieldName === 'tanggal_jatuh_tempo' && editableData?.output?.tanggal_faktur?.value) {
      // If this is due date, ensure it's not before invoice date
      const invoiceDateValue = parseDate(editableData.output.tanggal_faktur.value);
      if (invoiceDateValue) {
        minDate = invoiceDateValue;
      }
    } else if (fieldName === 'tanggal_faktur' && editableData?.output?.tgl_jatuh_tempo?.value) {
      // If this is invoice date, ensure it's not after due date
      const dueDateValue = parseDate(editableData.output.tgl_jatuh_tempo.value);
      if (dueDateValue) {
        maxDate = dueDateValue;
      }
    }
    
    // Create a unique ID for this date picker
    const datePickerId = `date-picker-${Math.random().toString(36).substring(2, 10)}`;
    
    return (
      <div className="w-full h-full">
        <style jsx="true">{`
          .react-datepicker-wrapper {
            width: 100%;
          }
          .react-datepicker__input-container {
            width: 100%;
          }
          .react-datepicker__input-container input {
            color: #1f2937 !important;
            background-color: transparent !important;
            cursor: pointer;
            width: 100%;
            padding: 0.5rem;
            border: none;
            outline: none;
          }
          .react-datepicker-popper {
            z-index: 9999 !important;
          }
          .react-datepicker {
            font-family: inherit;
            border: 1px solid #e5e7eb;
            border-radius: 0.375rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .react-datepicker__header {
            background-color: #f3f4f6 !important;
          }
          .react-datepicker__month-select,
          .react-datepicker__year-select {
            background-color: white !important;
            color: #1f2937 !important;
          }
          .react-datepicker__day {
            color: #1f2937 !important;
          }
          .react-datepicker__day--selected {
            background-color: #3b82f6 !important;
            color: white !important;
          }
          .react-datepicker__current-month {
            color: #1f2937 !important;
          }
          .react-datepicker__day-name {
            color: #6b7280 !important;
          }
        `}</style>
        <DatePicker
          id={datePickerId}
          selected={dateValue}
          onChange={(date) => {
            onChange(date ? date.getTime() : null);
          }}
          dateFormat="dd-MM-yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          placeholderText="DD-MM-YYYY"
          minDate={minDate}
          maxDate={maxDate}
          popperProps={{
            positionFixed: true,
            modifiers: [
              {
                name: "preventOverflow",
                options: {
                  rootBoundary: "viewport",
                  padding: 8
                }
              },
              {
                name: "offset",
                options: {
                  offset: [0, 10]
                }
              }
            ]
          }}
        />
      </div>
    );
  };

  const renderBooleanField = (data, onChange, options = ['Ya', 'Tidak']) => {
    const value = data?.value;
    
    // Determine background color based on confidence level
    let bgColor = 'bg-white'; // Default
    
    if (data?.from_database) {
      bgColor = 'bg-green-100'; // Green for database fields
    } else if (value === null || value === undefined) {
      bgColor = 'bg-red-100'; // Red for null values
    } else if (data?.is_confident === false) {
      bgColor = 'bg-orange-100'; // Orange for low confidence
    } else if (data?.is_confident === true) {
      bgColor = 'bg-white'; // White for high confidence
    }
    
    return (
      <select
        value={value === true ? options[0] : options[1]}
        onChange={(e) => onChange(e.target.value === options[0])}
        className={`w-full border-0 focus:ring-0 ${bgColor}`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  };

  const renderEditableCell = (item, onChange, type = 'text', rowIndex) => {
    if (!item) return null;

    const cellClass = getCellBackgroundColor(item);

    switch (type) {
      case 'date':
        return renderDatePicker(item, (date) => onChange(date));
      
      case 'boolean':
        return renderBooleanField(
          item,
          (value) => {
            if (item.id === 'bkp') {
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
            value={formatCurrency(item.value)}
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
            value={typeof item.value === 'number' ? item.value.toString().replace('.', ',') : item.value}
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
        
      default:
        return (
          <input
            type="text"
            value={item.value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none ${cellClass}`}
          />
        );
    }
  };

  // Define column definitions
  const columns = [
    { id: 'index', header: 'No.', width: 40, sticky: true, left: 0 },
    { id: 'kode_barang_invoice', header: 'Kode Invoice', width: 120 },
    { id: 'nama_barang_invoice', header: 'Nama Invoice', width: 200 },
    { id: 'kode_barang_main', header: 'Kode Main', width: 120, sticky: true, left: 40 },
    { id: 'nama_barang_main', header: 'Nama Main', width: 250, sticky: true, left: 160 },
    { id: 'qty', header: 'Qty', width: 80, type: 'currency', align: 'right' },
    { id: 'satuan', header: 'Satuan', width: 80, align: 'center' },
    { id: 'satuan_main', header: 'SATUAN MAIN', width: 120, align: 'center', special: 'database' },
    { id: 'harga_satuan', header: 'Harga Satuan', width: 120, type: 'currency', align: 'right' },
    { id: 'harga_bruto', header: 'Harga Bruto', width: 120, type: 'currency', align: 'right' },
    { id: 'diskon_persen', header: 'Diskon %', width: 100, type: 'percentage', align: 'right' },
    { id: 'diskon_rp', header: 'Diskon Rp', width: 120, type: 'currency', align: 'right' },
    { id: 'jumlah_netto', header: 'Jumlah Netto', width: 120, type: 'currency', align: 'right' },
    { id: 'bkp', header: 'BKP', width: 80, type: 'boolean', align: 'center' },
    { id: 'ppn', header: 'PPN', width: 100, type: 'currency', align: 'right' },
    { id: 'harga_jual_main', header: 'Harga Jual Main', width: 150, type: 'currency', align: 'right', special: 'database' },
    { id: 'margin_persen', header: 'Margin %', width: 100, type: 'percentage', align: 'right', special: 'database' },
    { id: 'margin_rp', header: 'Margin Rp', width: 120, type: 'currency', align: 'right', special: 'database' },
    { id: 'kenaikan_persen', header: 'Kenaikan %', width: 100, type: 'percentage', align: 'right' },
    { id: 'kenaikan_rp', header: 'Kenaikan Rp', width: 120, type: 'currency', align: 'right' },
    { id: 'saran_margin_persen', header: 'Saran Margin %', width: 120, type: 'percentage', align: 'right', special: 'suggestion' },
    { id: 'saran_margin_rp', header: 'Saran Margin Rp', width: 120, type: 'currency', align: 'right', special: 'suggestion' },
  ];

  const [columnWidths, setColumnWidths] = useState(() => {
    const widths = {};
    columns.forEach(column => {
      widths[column.id] = column.width;
    });
    return widths;
  });
  
  const [resizing, setResizing] = useState(null);
  const tableRef = useRef(null);

  // Calculate PPN for each item when include_ppn or ppn_rate changes
  useEffect(() => {
    if (editableData?.output?.items?.length > 0) {
      const includePPN = editableData.output.include_ppn?.value === true;
      const ppnRate = parseNumber(editableData.output.ppn_rate?.value) || 0;
      
      if (includePPN && ppnRate > 0) {
        const newData = { ...editableData };
        
        newData.output.items = newData.output.items.map(item => {
          // Only calculate PPN if BKP is true (Ya)
          const isBKP = item.bkp?.value === true;
          
          // Calculate PPN based on jumlah_netto if it's a BKP item
          const jumlahNetto = parseNumber(item.jumlah_netto?.value) || 0;
          const ppnValue = isBKP ? (jumlahNetto * ppnRate) / 100 : 0;
          
          // Update or create the PPN field
          if (item.ppn) {
            item.ppn = {
              ...item.ppn,
              value: ppnValue,
              is_confident: true
            };
          } else {
            item.ppn = {
              value: ppnValue,
              is_confident: true
            };
          }
          
          return item;
        });
        
        setEditableData(newData);
        onDataChange(newData);
      } else {
        // If include_ppn is false or ppn_rate is 0, set all PPN values to 0
        const newData = { ...editableData };
        
        newData.output.items = newData.output.items.map(item => {
          if (item.ppn) {
            item.ppn = {
              ...item.ppn,
              value: 0,
              is_confident: true
            };
          } else {
            item.ppn = {
              value: 0,
              is_confident: true
            };
          }
          
          return item;
        });
        
        setEditableData(newData);
        onDataChange(newData);
      }
    }
  }, [
    editableData?.output?.include_ppn?.value, 
    editableData?.output?.ppn_rate?.value,
    // Also recalculate when jumlah_netto changes for any item
    JSON.stringify(editableData?.output?.items?.map(item => item.jumlah_netto?.value)),
    // Also recalculate when BKP status changes for any item
    JSON.stringify(editableData?.output?.items?.map(item => item.bkp?.value))
  ]);

  // Handle column resize
  const startResize = useCallback((e, columnId) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = columnWidths[columnId];
    
    const handleMouseMove = (e) => {
      const width = Math.max(50, startWidth + (e.pageX - startX));
      setColumnWidths(prev => ({
        ...prev,
        [columnId]: width
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    setResizing(columnId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  if (!editableData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Invoice Information</h2>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Faktur</label>
                <div className={`border border-gray-200 rounded overflow-hidden ${getCellBackgroundColor(safeGet(editableData, 'output.tanggal_faktur', { value: '', is_confident: false }))}`}>
                  {renderDatePicker(safeGet(editableData, 'output.tanggal_faktur', { value: '', is_confident: false }), (value) => handleHeaderChange('tanggal_faktur', value))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                <div className={`border border-gray-200 rounded overflow-hidden ${getCellBackgroundColor(safeGet(editableData, 'output.tanggal_jatuh_tempo', { value: '', is_confident: false }))}`}>
                  {renderDatePicker(safeGet(editableData, 'output.tanggal_jatuh_tempo', { value: '', is_confident: false }), (value) => handleHeaderChange('tanggal_jatuh_tempo', value))}
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  {safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">No Invoice:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false }), (value) => handleHeaderChange('nomor_referensi', value))}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Supplier:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false }), (value) => handleHeaderChange('nama_supplier', value))}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Tipe Dokumen:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false }), (value) => handleHeaderChange('tipe_dokumen', value))}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Tipe Pembayaran:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false }), (value) => handleHeaderChange('tipe_pembayaran', value))}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.salesman', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Salesman:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.salesman', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.salesman', { value: '', is_confident: false }), (value) => handleHeaderChange('salesman', value))}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.include_ppn', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Include PPN:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.include_ppn', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderBooleanField(
                          safeGet(editableData, 'output.include_ppn', { value: true, is_confident: true }),
                          (value) => handleIncludePPNChange(value)
                        )}
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">PPN Rate:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }), (value) => handleHeaderChange('ppn_rate', value))}
                        <span className="hidden">{JSON.stringify(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }))}</span>
                      </td>
                    </tr>
                  )}
                  {safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false }) && (
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Margin Threshold:</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false })) || 'bg-white'}`}>
                        {renderEditableCell(safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false }), (value) => handleHeaderChange('margin_threshold', value))}
                        <span className="hidden">{JSON.stringify(safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false }))}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Item List</h2>
        </div>
        <div className="table-container">
          <table ref={tableRef} className="resizable-table min-w-full divide-y divide-gray-200">
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
                        className={`resizer ${resizing === column.id ? 'isResizing' : ''}`}
                        onMouseDown={(e) => startResize(e, column.id)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {safeGet(editableData, 'output.items', []).map((item, rowIndex) => {
                return (
                  <tr key={rowIndex} className="hover:bg-gray-100 group">
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
                            (value) => handleItemChange(rowIndex, column.id, value),
                            column.type,
                            rowIndex
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Totals</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-1">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Harga Bruto:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                      {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'harga_bruto.value', 0)), 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Diskon Rp:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                      {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'diskon_rp.value', 0)), 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Jumlah Netto:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                      {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'jumlah_netto.value', 0)), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-span-1">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total PPN:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                      {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'ppn.value', 0)), 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Include PPN:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white font-bold">
                      {formatCurrency(
                        safeGet(editableData, 'output.items', []).reduce((sum, item) => 
                          sum + parseNumber(safeGet(item, 'jumlah_netto.value', 0)) + parseNumber(safeGet(item, 'ppn.value', 0)), 0)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Margin Rp:</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                      {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'margin_rp.value', 0)), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Messages */}
      {safeGet(editableData, 'output.debug', []).length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Debug Messages</h2>
          </div>
          <div className="p-4">
            <ul className="list-disc pl-5 space-y-2">
              {safeGet(editableData, 'output.debug', []).map((message, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {typeof message === 'string' 
                    ? message 
                    : message && typeof message === 'object'
                      ? (message.message || JSON.stringify(message))
                      : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Debug Summary */}
      {(safeGet(editableData, 'output.debug_summary', {}) || safeGet(editableData, 'output.summary_debug', {})) && (
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Debug Summary</h2>
          </div>
          <div className="p-4">
            {/* Handle summary_debug with value property */}
            {safeGet(editableData, 'output.summary_debug', {}) && (
              <p className="text-sm text-gray-700 mb-4">
                {typeof safeGet(editableData, 'output.summary_debug', {}) === 'object' && safeGet(editableData, 'output.summary_debug', {}) !== null
                  ? (safeGet(editableData, 'output.summary_debug.value', '') || JSON.stringify(safeGet(editableData, 'output.summary_debug', {})))
                  : safeGet(editableData, 'output.summary_debug', '')
                }
              </p>
            )}
            
            {/* Debug summary table removed as requested */}
          </div>
        </div>
      )}

      {/* Custom CSS for resizable columns */}
      <style>
        {`
        .resizer {
          position: absolute;
          right: -5px;
          top: 0;
          height: 100%;
          width: 10px;
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
        
        .table-container {
          overflow-x: auto;
          max-width: 100%;
        }
        
        /* Base hover effect for non-sticky cells */
        tr:hover td:not(.sticky) {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        
        /* Sticky columns styles */
        .sticky {
          position: sticky;
          left: 0;
          box-shadow: none;
        }
        
        /* Solid hover colors for sticky columns */
        tr:hover td.sticky[style*="backgroundColor: white"] {
          background-color: #f3f4f6 !important;
        }
        
        tr:hover td.sticky[style*="backgroundColor: #fee2e2"] {
          background-color: #fecaca !important;
        }
        
        tr:hover td.sticky[style*="backgroundColor: #fed7aa"] {
          background-color: #fdba74 !important;
        }
        
        tr:hover td.sticky[style*="backgroundColor: #d1fae5"] {
          background-color: #a7f3d0 !important;
        }
        
        tr:hover td.sticky[style*="backgroundColor: #ecfdf5"] {
          background-color: #d1fae5 !important;
        }
        
        /* Hover styles for non-sticky cells with different background colors */
        tr:hover td[style*="backgroundColor: #fee2e2"]:not(.sticky) {
          background-color: #fecaca !important;
        }
        
        tr:hover td[style*="backgroundColor: #fed7aa"]:not(.sticky) {
          background-color: #fdba74 !important;
        }
        
        tr:hover td[style*="backgroundColor: #d1fae5"]:not(.sticky) {
          background-color: #a7f3d0 !important;
        }
        
        tr:hover td[style*="backgroundColor: #ecfdf5"]:not(.sticky) {
          background-color: #d1fae5 !important;
        }
        
        tr:hover td[style*="backgroundColor: white"]:not(.sticky) {
          background-color: #f3f4f6 !important;
        }
        `}
      </style>
    </div>
  );
}
