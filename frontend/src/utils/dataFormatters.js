/**
 * Utility functions for data formatting
 */

/**
 * Parses a number from various formats
 * @param {*} value - Value to parse
 * @returns {number} Parsed number
 */
export const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle Indonesian number format and mixed formats
    // (dots/periods as thousand separators, comma as decimal)
    
    // Check if there are both commas and periods
    const commaCount = (value.match(/,/g) || []).length;
    const periodCount = (value.match(/\./g) || []).length;
    
    let cleanValue = value;
    
    if (commaCount > 0 && periodCount > 0) {
      // Mixed format - determine which is the decimal separator
      // In Indonesian format, the last separator is typically the decimal point
      const lastCommaPos = value.lastIndexOf(',');
      const lastPeriodPos = value.lastIndexOf('.');
      
      if (lastPeriodPos > lastCommaPos) {
        // Period is the decimal separator (e.g., "1,000.25")
        // Remove all commas, keep the period
        cleanValue = value.replace(/,/g, '');
      } else {
        // Comma is the decimal separator (e.g., "1.000,25")
        // Remove all periods, then convert comma to period for JS parsing
        cleanValue = value.replace(/\./g, '').replace(',', '.');
      }
    } else if (commaCount > 0) {
      // Only commas - treat as decimal if just one, otherwise as thousand separator
      if (commaCount === 1) {
        cleanValue = value.replace(',', '.');
      } else {
        // Multiple commas - treat as thousand separators
        cleanValue = value.replace(/,/g, '');
      }
    } else if (periodCount > 0) {
      // Only periods - no need to change (JS parses with period as decimal)
      cleanValue = value;
    }
    
    // Convert to number
    const result = Number(cleanValue);
    // Return the number or 0 if it's NaN
    return isNaN(result) ? 0 : result;
  }
  return 0;
};

/**
 * Formats a number as currency
 * @param {*} value - Value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  // Ensure we're working with a number
  const numValue = typeof value === 'number' ? value : parseNumber(value);
  // Format using Indonesian locale (dots for thousands, comma for decimal)
  return new Intl.NumberFormat('id-ID', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numValue);
};

/**
 * Parses a date from various formats
 * @param {*} value - Value to parse
 * @returns {Date|null} Parsed date or null
 */
export const parseDate = (value) => {
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

/**
 * Formats a date for display
 * @param {*} value - Value to format
 * @returns {string} Formatted date string
 */
export const formatDateDisplay = (value) => {
  if (!value) return '';
  
  const date = parseDate(value);
  if (!date || isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Formats a cell value based on its type (column key)
 * @param {*} value - The raw value
 * @param {string} key - The column key (e.g., 'harga_satuan', 'qty')
 * @returns {string} Formatted string
 */
export const formatCellValue = (value, key) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Determine type based on key (adjust logic as needed)
  let type = 'string';
  if (key.includes('harga') || key.includes('rp') || key.includes('jumlah') || key.includes('ppn') || key === 'total') {
    type = 'currency';
  } else if (key.includes('persen') || key === 'discount') {
    type = 'percentage';
  } else if (key === 'qty' || key === 'quantity' || key === 'kuantitas') { // Added number type detection
    type = 'number';
  } else if (key.includes('_date') || key.includes('tanggal')) {
    type = 'date';
  }

  try {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        // Format number with 2 decimal places without % sign
        const numPercent = parseFloat(value) || 0;
        return numPercent.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'number': // Format plain numbers with thousand separators
        const num = parseNumber(value); // Use parseNumber to handle potential commas/dots
        if (isNaN(num)) return '-';
        return num.toLocaleString('id-ID'); // Use locale string for separators
      case 'date':
        // Basic date formatting, assuming ISO or parsable string
        try {
          return format(new Date(value), 'dd/MM/yyyy');
        } catch (dateError) {
          return String(value); // Fallback to string if invalid date
        }
      default:
        return String(value);
    }
  } catch (error) {
    console.error(`Error formatting value (${value}) for key (${key}):`, error);
    return String(value); // Fallback
  }
}; 