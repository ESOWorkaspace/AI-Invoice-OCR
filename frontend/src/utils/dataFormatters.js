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