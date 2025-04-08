/**
 * Utility functions for data helpers
 */

/**
 * Safely access nested properties of an object without errors
 * @param {Object} obj - Object to access
 * @param {string} path - Path to the property using dot notation
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default value
 */
export const safeGet = (obj, path, defaultValue = '') => {
  try {
    const result = path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
    return result !== undefined ? result : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Get background color class based on cell data confidence and source
 * Handles both object form {value, is_confident, from_database} and separate params (value, isConfident)
 * Priority: Missing > Low Confidence > From DB > Default
 * 
 * @param {Object|*} cellDataOrValue - Either the complete cell data object or just the value
 * @param {boolean} [isConfident] - Optional confidence flag when using the second form
 * @returns {string} CSS class for background color (e.g., 'bg-red-100', 'bg-orange-100', 'bg-green-50', or '' for default)
 */
export const getCellBackgroundColor = (cellDataOrValue, isConfident) => {
  let value;
  let confidence = true; // Default to confident
  let fromDatabase = false;

  // Determine values based on input format
  if (typeof cellDataOrValue === 'object' && cellDataOrValue !== null && cellDataOrValue.value !== undefined) {
    // Object form
    value = cellDataOrValue.value;
    confidence = cellDataOrValue.is_confident !== false; // Treat undefined as true
    fromDatabase = cellDataOrValue.from_database === true;
  } else {
    // Separate parameters form (assuming value is first param, confidence is second)
    value = cellDataOrValue;
    confidence = isConfident !== false; // Treat undefined/true as confident
    // Cannot determine fromDatabase in this form
  }

  // Priority 1: Missing value
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return 'bg-red-100';
  }

  // Priority 2: Low confidence
  if (!confidence) {
    return 'bg-orange-100';
  }

  // Priority 3: From database (and confident and not missing)
  if (fromDatabase) {
    return 'bg-green-50'; // Use light green for DB source
  }

  // Default: Confident, not missing, not from DB (or source unknown)
  return ''; // Return empty string for default (usually white)
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error deep cloning object:', error);
    return { ...obj };
  }
}; 