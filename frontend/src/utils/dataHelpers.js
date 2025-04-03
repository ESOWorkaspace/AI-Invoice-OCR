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
 * @param {Object} cellData - Cell data object
 * @returns {string} CSS class for background color
 */
export const getCellBackgroundColor = (cellData) => {
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