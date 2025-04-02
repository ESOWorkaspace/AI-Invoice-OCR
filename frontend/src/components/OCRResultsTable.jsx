import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import ReactDOM from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

export default function OCRResultsTable({ data, onDataChange }) {
  // Initialize state with data or default values
  const [editableData, setEditableData] = useState(data || {});
  
  // Add state for tracking API calls and search status
  const [pendingSearches, setPendingSearches] = useState({});
  const [searchStatus, setSearchStatus] = useState({});
  const [productMapping, setProductMapping] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const activeCellRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';
  
  // Add a product cache to store previously fetched products
  const [productCache, setProductCache] = useState({});
  
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

  // Memoize the search function to prevent dependency issues
  const searchProductByInvoiceCode = useCallback(function searchProductByInvoiceCode(invoiceCode, itemIndex) {
    console.log(`searchProductByInvoiceCode called with code: ${invoiceCode}, index: ${itemIndex}`);
    
    if (!invoiceCode) {
      console.warn('No invoice code provided to searchProductByInvoiceCode');
      return;
    }
    
    // Ensure itemIndex is valid
    if (itemIndex === undefined || itemIndex === null) {
      console.warn('Invalid itemIndex provided to searchProductByInvoiceCode');
      return;
    }
    
    // Check if the product is already in cache
    if (productCache[invoiceCode]) {
      console.log(`[Cache hit] Using cached data for invoice code: ${invoiceCode}`);
      
      const product = productCache[invoiceCode];
      
      // Product found - update the item
      const newData = { ...editableData };
      
      // Update the item data
      if (newData.output.items && newData.output.items[itemIndex]) {
        newData.output.items[itemIndex].kode_barang_main = {
          ...newData.output.items[itemIndex].kode_barang_main,
          value: product.product_code || '',
          is_confident: true
        };
        
        newData.output.items[itemIndex].nama_barang_main = {
          ...newData.output.items[itemIndex].nama_barang_main,
          value: product.product_name || '',
          is_confident: true
        };
        
        // If available, update other fields
        if (product.unit) {
          newData.output.items[itemIndex].satuan_main = {
            ...newData.output.items[itemIndex].satuan_main,
            value: product.unit,
            is_confident: true
          };
        }
        
        if (product.price) {
          newData.output.items[itemIndex].harga_jual_main = {
            ...newData.output.items[itemIndex].harga_jual_main,
            value: parseFloat(product.price),
            is_confident: true
          };
        }
        
        setEditableData(newData);
        if (onDataChange) onDataChange(newData);
      }
      
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'found'
      }));
      
      // Remove from pending searches
      setPendingSearches(prev => {
        const newPending = { ...prev };
        delete newPending[itemIndex];
        return newPending;
      });
      
      return; // Return early since we found the product in cache
    }
    
    try {
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'searching'
      }));
      
      // Use the new API endpoint for invoice code search
      axios.get(`${API_BASE_URL}/api/products/invoice`, {
        params: { invoiceCode },
        timeout: 8000 // Add timeout to prevent hanging requests
      })
      .then(response => {
        // Check if the response has the expected format and contains data
        if (response?.data?.success === true && 
            Array.isArray(response.data.data) && 
            response.data.data.length > 0) {
          
          const product = response.data.data[0];
          
          // Add the product to cache
          setProductCache(prev => ({
            ...prev,
            [invoiceCode]: product
          }));
          
          // Product found - update the item
          const newData = { ...editableData };
          
          // Update product mapping for dropdown reference
          setProductMapping(prev => ({
            ...prev,
            [invoiceCode]: product
          }));
          
          // Update the item data
          if (newData.output.items && newData.output.items[itemIndex]) {
            newData.output.items[itemIndex].kode_barang_main = {
              ...newData.output.items[itemIndex].kode_barang_main,
              value: product.product_code || '',
              is_confident: true
            };
            
            newData.output.items[itemIndex].nama_barang_main = {
              ...newData.output.items[itemIndex].nama_barang_main,
              value: product.product_name || '',
              is_confident: true
            };
            
            // If available, update other fields
            if (product.unit) {
              newData.output.items[itemIndex].satuan_main = {
                ...newData.output.items[itemIndex].satuan_main,
                value: product.unit,
                is_confident: true
              };
            }
            
            if (product.price) {
              newData.output.items[itemIndex].harga_jual_main = {
                ...newData.output.items[itemIndex].harga_jual_main,
                value: parseFloat(product.price),
                is_confident: true
              };
            }
            
            setEditableData(newData);
            if (onDataChange) onDataChange(newData);
          }
          
          setSearchStatus(prev => ({
            ...prev,
            [itemIndex]: 'found'
          }));
          
          console.log(`[searchProductByInvoiceCode] Found product for invoice code: ${invoiceCode}`, product);
        } else {
          // No product found - mark for manual search and set placeholder values
          const newData = { ...editableData };
          
          // Set empty values with "tidak ditemukan, cari..." as their visual representation
          if (newData.output.items && newData.output.items[itemIndex]) {
            // Clear the kode_barang_main and nama_barang_main fields
            newData.output.items[itemIndex].kode_barang_main = {
              ...newData.output.items[itemIndex].kode_barang_main,
              value: '', // Empty value that will show placeholder
              is_confident: false
            };
            
            newData.output.items[itemIndex].nama_barang_main = {
              ...newData.output.items[itemIndex].nama_barang_main,
              value: '', // Empty value that will show placeholder
              is_confident: false
            };
            
            setEditableData(newData);
            if (onDataChange) onDataChange(newData);
          }
          
          setSearchStatus(prev => ({
            ...prev,
            [itemIndex]: 'not_found'
          }));
          
          console.log(`[searchProductByInvoiceCode] No product found for invoice code: ${invoiceCode}`);
        }
      })
      .catch(error => {
        console.error(`[searchProductByInvoiceCode] Error searching for product with invoice code ${invoiceCode}:`, error);
        
        // Set empty values with placeholders on error too
        const newData = { ...editableData };
        
        if (newData.output.items && newData.output.items[itemIndex]) {
          newData.output.items[itemIndex].kode_barang_main = {
            ...newData.output.items[itemIndex].kode_barang_main,
            value: '', // Empty value that will show placeholder
            is_confident: false
          };
          
          newData.output.items[itemIndex].nama_barang_main = {
            ...newData.output.items[itemIndex].nama_barang_main,
            value: '', // Empty value that will show placeholder
            is_confident: false
          };
          
          setEditableData(newData);
          if (onDataChange) onDataChange(newData);
        }
        
        setSearchStatus(prev => ({
          ...prev,
          [itemIndex]: 'error'
        }));
      })
      .finally(() => {
        // Remove from pending searches when done (whether found or not)
        setPendingSearches(prev => {
          const newPending = { ...prev };
          delete newPending[itemIndex];
          return newPending;
        });
      });
    } catch (error) {
      console.error(`[searchProductByInvoiceCode] Exception while searching for invoice code ${invoiceCode}:`, error);
      
      // Update search status to error
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'error'
      }));
      
      // Remove from pending searches on exception
      setPendingSearches(prev => {
        const newPending = { ...prev };
        delete newPending[itemIndex];
        return newPending;
      });
    }
  }, [API_BASE_URL, editableData, onDataChange, productCache]);

  // Add a state to track which invoice codes have already been processed
  const [processedInvoiceCodes, setProcessedInvoiceCodes] = useState({});

  // Handle automatic search for items when data changes
  useEffect(() => {
    // Skip if no items or pendingSearches is already populated
    if (!editableData?.output?.items || Object.keys(pendingSearches).length > 0) return;
    
    // Find items that need to be searched automatically
    const itemsToSearch = [];
    
    editableData.output.items.forEach((item, index) => {
      // Get the invoice code from kode_barang_invoice
      const kodeInvoice = safeGet(item, 'kode_barang_invoice.value', '');
      
      // Check if we have a valid invoice code to search
      if (kodeInvoice && 
          // Ensure this code hasn't been processed already
          !processedInvoiceCodes[kodeInvoice]) {
        
        // Mark this invoice code as processed
        setProcessedInvoiceCodes(prev => ({
          ...prev,
          [kodeInvoice]: true
        }));
        
        // Add to the items that need searching
        itemsToSearch.push({
          index,
          kodeInvoice
        });
        
        // Add to pending searches to track
        setPendingSearches(prev => ({
          ...prev,
          [index]: true
        }));
      }
    });
    
    if (itemsToSearch.length === 0) {
      console.log('No items need automatic searching');
      return;
    }
    
    // Deduplicate invoice codes for efficiency
    const uniqueInvoiceCodesToSearch = itemsToSearch.reduce((acc, item) => {
      if (!acc.some(i => i.kodeInvoice === item.kodeInvoice)) {
        acc.push(item);
      }
      return acc;
    }, []);
    
    console.log(`Found ${uniqueInvoiceCodesToSearch.length} unique invoice codes to search`);
    
    // Use setTimeout to ensure searchProductByInvoiceCode is defined
    setTimeout(() => {
      try {
        // Check if searchProductByInvoiceCode is defined before using it
        if (typeof searchProductByInvoiceCode === 'function') {
          console.log('Performing auto-search for all pending items');
          // Perform searches for identified items with cache check
          uniqueInvoiceCodesToSearch.forEach(({ index, kodeInvoice }) => {
            try {
              // Check if product is in cache
              if (productCache[kodeInvoice]) {
                console.log(`Using cached data for invoice code: ${kodeInvoice} at index ${index}`);
                // Use cached data
                const product = productCache[kodeInvoice];
                const newData = { ...editableData };
                
                if (newData.output.items && newData.output.items[index]) {
                  newData.output.items[index].kode_barang_main = {
                    ...newData.output.items[index].kode_barang_main,
                    value: product.product_code || '',
                    is_confident: true
                  };
                  
                  newData.output.items[index].nama_barang_main = {
                    ...newData.output.items[index].nama_barang_main,
                    value: product.product_name || '',
                    is_confident: true
                  };
                  
                  // Update other fields if available
                  if (product.unit) {
                    newData.output.items[index].satuan_main = {
                      ...newData.output.items[index].satuan_main,
                      value: product.unit,
                      is_confident: true
                    };
                  }
                  
                  if (product.price) {
                    newData.output.items[index].harga_jual_main = {
                      ...newData.output.items[index].harga_jual_main,
                      value: parseFloat(product.price),
                      is_confident: true
                    };
                  }
                  
                  setEditableData(newData);
                  if (onDataChange) onDataChange(newData);
                }
                
                setSearchStatus(prev => ({
                  ...prev,
                  [index]: 'found'
                }));
                
                // Remove from pending searches
                setPendingSearches(prev => {
                  const newPending = { ...prev };
                  delete newPending[index];
                  return newPending;
                });
              } else {
                // Not in cache, perform API search
                searchProductByInvoiceCode(kodeInvoice, index);
              }
            } catch (itemError) {
              console.error(`Error searching for item ${index}:`, itemError);
              // Clean up this pending search
              setPendingSearches(prev => {
                const newPending = { ...prev };
                delete newPending[index];
                return newPending;
              });
            }
          });
        } else {
          console.warn('searchProductByInvoiceCode not available during automatic search');
          // Clean up pending searches
          itemsToSearch.forEach(({ index }) => {
            setPendingSearches(prev => {
              const newPending = { ...prev };
              delete newPending[index];
              return newPending;
            });
          });
        }
      } catch (error) {
        console.error('Error in auto-search effect:', error);
        // Clean up all pending searches on error
        itemsToSearch.forEach(({ index }) => {
          setPendingSearches(prev => {
            const newPending = { ...prev };
            delete newPending[index];
            return newPending;
          });
        });
      }
    }, 0);
  }, [editableData?.output?.items, pendingSearches, productCache, searchProductByInvoiceCode, processedInvoiceCodes]);

  // Memoize the item change handler to prevent unnecessary re-renders
  const handleItemChange = useCallback((index, field, value) => {
    console.log('handleItemChange called for field:', field, 'at index:', index);
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
        
        // Special case: If kode_barang_invoice is changed, try to find a matching product
        if (field === 'kode_barang_invoice' && value) {
          const currentInvoiceCode = value;
          console.log('Need to search for product with invoice code:', currentInvoiceCode);
          
          // Check if we already have this invoice code in the cache
          if (productCache[currentInvoiceCode]) {
            console.log(`Using cache for invoice code ${currentInvoiceCode} in handleItemChange`);
            
            // Use cached product data
            const product = productCache[currentInvoiceCode];
            
            // Update fields with cached data
            newData.output.items[index].kode_barang_main = {
              ...newData.output.items[index].kode_barang_main,
              value: product.product_code || '',
              is_confident: true
            };
            
            newData.output.items[index].nama_barang_main = {
              ...newData.output.items[index].nama_barang_main,
              value: product.product_name || '',
              is_confident: true
            };
            
            // Update other fields if available
            if (product.unit) {
              newData.output.items[index].satuan_main = {
                ...newData.output.items[index].satuan_main,
                value: product.unit,
                is_confident: true
              };
            }
            
            if (product.price) {
              newData.output.items[index].harga_jual_main = {
                ...newData.output.items[index].harga_jual_main,
                value: parseFloat(product.price),
                is_confident: true
              };
            }
            
            // Update search status
            setSearchStatus(prev => ({
              ...prev,
              [index]: 'found'
            }));
            
            // No need to make an API call
            setEditableData(newData);
            onDataChange(newData);
            return;
          }
          
          // Not in cache, need to search via API
          
          // Clear any existing search status 
          setSearchStatus(prev => ({
            ...prev,
            [index]: undefined
          }));
          
          // Clear pending searches for this index
          setPendingSearches(prev => {
            const newPending = { ...prev };
            delete newPending[index];
            return newPending;
          });
          
          // Add to pending searches
          setPendingSearches(prev => ({
            ...prev,
            [index]: true
          }));
          
          // Using setTimeout to ensure this happens after searchProductByInvoiceCode is defined
          setTimeout(() => {
            try {
              // Defensive check to make sure searchProductByInvoiceCode exists
              if (typeof searchProductByInvoiceCode === 'function') {
                console.log('Calling searchProductByInvoiceCode for invoice code:', currentInvoiceCode);
                searchProductByInvoiceCode(currentInvoiceCode, index);
              } else {
                console.warn('searchProductByInvoiceCode is not defined yet, will try again later');
                // Remove from pending searches if we can't search now
                setPendingSearches(prev => {
                  const newPending = { ...prev };
                  delete newPending[index];
                  return newPending;
                });
              }
            } catch (error) {
              console.error('Error calling searchProductByInvoiceCode:', error);
              // Also remove from pending searches on error
              setPendingSearches(prev => {
                const newPending = { ...prev };
                delete newPending[index];
                return newPending;
              });
            }
          }, 0);
        }
      }
    }
    setEditableData(newData);
    onDataChange(newData);
  }, [editableData, onDataChange, productCache, searchProductByInvoiceCode]);

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

  // Create a memoized component wrapper
  const OCRResultsContent = memo(({ 
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
  }) => {
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
          <div 
            className="relative overflow-auto" 
            style={{ overscrollBehaviorX: 'contain' }}
          >
            {/* Apply custom styles for the table */}
            <style jsx="true">{`
              .table-wrapper {
                overflow-x: auto;
                overflow-y: visible;
                overscroll-behavior-x: contain;
                scrollbar-width: thin;
              }
              
              /* ... rest of the style ... */
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
                  {safeGet(editableData, 'output.items', []).map((item, rowIndex) => {
                    return (
                      <MemoizedTableRow 
                        key={rowIndex} 
                        item={item} 
                        rowIndex={rowIndex} 
                        columns={columns} 
                        columnWidths={columnWidths} 
                        handleItemChange={handleItemChange} 
                        searchStatus={searchStatus} 
                        handleProductCellClick={handleProductCellClick} 
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
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

        {/* Product Search Dropdown */}
        {dropdownOpen && activeCell && (
          <ProductSearchDropdown onClose={() => setDropdownOpen(false)} activeCellRef={activeCellRef} activeCell={activeCell} editableData={editableData} setEditableData={setEditableData} onDataChange={onDataChange} API_BASE_URL={API_BASE_URL} />
        )}
      </div>
    );
  });

  // Create a memoized TableRow component to optimize rendering
  const MemoizedTableRow = memo(({ item, rowIndex, columns, columnWidths, handleItemChange, searchStatus, handleProductCellClick }) => {
    return (
      <tr className="hover:bg-gray-100 group">
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
          
          // Add a special class for cells that are product searchable
          if (column.id === 'kode_barang_main' || column.id === 'nama_barang_main') {
            const needsManualSearch = searchStatus[rowIndex] === 'not_found' || searchStatus[rowIndex] === 'error';
            
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
                (value) => handleItemChange(rowIndex, column.id, value),
                column.type,
                rowIndex,
                column.id,
                handleProductCellClick
              )}
            </td>
          );
        })}
      </tr>
    );
  });

  // Update the renderEditableCell function to display the correct placeholder
  const renderEditableCell = (item, onChange, type = 'text', rowIndex, columnId, handleProductCellClick) => {
    if (!item) return null;

    const cellClass = getCellBackgroundColor(item);
    
    // Special handling for product search cells
    if (columnId === 'kode_barang_main' || columnId === 'nama_barang_main') {
      // Determine if this cell needs manual search
      const needsManualSearch = searchStatus[rowIndex] === 'not_found' || searchStatus[rowIndex] === 'error';
      const isSearching = searchStatus[rowIndex] === 'searching';
      const isEmpty = !item.value || item.value === '';
      
      return (
        <div 
          id={`cell-${columnId}-${rowIndex}`}
          className={`w-full cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
          onClick={() => handleProductCellClick(columnId, rowIndex)}
        >
          {isSearching ? (
            <div className="flex items-center justify-center space-x-1">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              <span>Searching...</span>
            </div>
          ) : isEmpty ? (
            needsManualSearch ? "tidak ditemukan, cari..." : "Click to search"
          ) : (
            item.value
          )}
        </div>
      );
    }
    
    // Special handling for unit selection dropdown if available_units exists
    if (columnId === 'satuan_main' && item.available_units && item.available_units.length > 0) {
      return (
        <select 
          className={`w-full py-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${cellClass}`}
          value={item.value || ''}
          onChange={(e) => handleUnitChange(rowIndex, e.target.value)}
        >
          {item.available_units.map((unit, idx) => (
            <option key={`unit-${idx}`} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      );
    }
    
    // Handle different field types based on the type parameter
    switch (type) {
      case 'date':
        return renderDatePicker(item, (date) => onChange(date));
      
      case 'boolean':
        return renderBooleanField(
          item,
          (value) => {
            if (columnId === 'bkp') {
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
    { id: 'harga_jual_main', header: 'Harga Dasar', width: 150, type: 'currency', align: 'right', special: 'database' },
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

  // Memoize the handler to avoid recreation during re-renders
  const handleProductCellClick = useCallback((cellType, rowIndex) => {
    // Close any existing dropdown first
    setDropdownOpen(false);
    
    // Get the cell element for positioning
    const cellId = `cell-${cellType}-${rowIndex}`;
    const cellElement = document.getElementById(cellId);
    
    if (cellElement) {
      // Set active cell info
      activeCellRef.current = cellElement;
      setActiveCell({ type: cellType, index: rowIndex });
      
      // Open dropdown
      setTimeout(() => {
        setDropdownOpen(true);
      }, 50);
    }
  }, []);

  // Product Search Dropdown Component
  const ProductSearchDropdown = memo(({ onClose, activeCellRef, activeCell, editableData, setEditableData, onDataChange, API_BASE_URL }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialItems, setInitialItems] = useState([]);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastSearchTerm, setLastSearchTerm] = useState('');
    const [searchCache, setSearchCache] = useState({});
    const searchDebounceTimer = useRef(null);
    const scrollContainerRef = useRef(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    
    // Initial focus on input field
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);
    
    // Load initial items for the dropdown
    useEffect(() => {
      const controller = new AbortController();
      const loadItems = async () => {
        try {
          // No need to load items if we have an active search term
          if (searchTerm) return;
          
          setLoading(true);
          
          // Use the invoice code from the data if it's available
          // This helps with automatic matching
          const invoiceCode = activeCell?.rowIndex !== undefined
            ? safeGet(editableData, `output.items[${activeCell.rowIndex}].kode_barang_invoice.value`, '')
            : '';
          
          // Only search for initial items if we have an invoice code
          if (invoiceCode) {
            // Search by invoice code to automatically suggest matching products
            const response = await axios.get(`${API_BASE_URL}/api/products/search`, {
              params: {
                search: invoiceCode,
                limit: 0 // Request all matching items without limit
              },
              signal: controller.signal
            });
            
            if (response?.data?.success && Array.isArray(response.data.data)) {
              const items = response.data.data
                .map(product => ({
                  product_code: product.kode_main || product.product_code || '',
                  product_name: product.nama_main || product.product_name || '',
                  unit: product.unit || '',
                  units: product.units || [], // All available units
                  base_price: product.harga_pokok || product.base_price || 0, // Use harga_pokok instead of price
                  price: product.harga_pokok || product.base_price || 0, // Use harga_pokok for display too
                  supplier_code: product.supplier_code || ''
                }))
                .filter(product => product.product_code !== '123' && product.product_name !== 'test');
              
              console.log(`[ProductSearchDropdown] Found ${items.length} initial items matching invoice code: "${invoiceCode}"`);
              
              setInitialItems(items);
              setDisplayedItems(items); // Initialize with all items since we don't have a display limit
              setHasMore(false); // No need for "load more" since we're showing all items
            } else {
              setInitialItems([]);
              setDisplayedItems([]);
              setHasMore(false);
            }
          } else {
            // No invoice code, set empty initial items
            setInitialItems([]);
            setDisplayedItems([]);
            setHasMore(false);
          }
        } catch (error) {
          console.error('[ProductSearchDropdown] Error loading initial items:', error);
          setInitialItems([]);
          setDisplayedItems([]);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      };
      
      loadItems();
      
      return () => {
        controller.abort();
      };
    }, [API_BASE_URL, activeCell, editableData]);
    
    // Set up scroll listener for infinite scrolling
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const handleScroll = () => {
        if (
          !loading &&
          !isLoadingMore &&
          hasMore &&
          container.scrollHeight - container.scrollTop <= container.clientHeight + 100
        ) {
          loadMoreItems();
        }
      };
      
      // Add scroll event listener
      container.addEventListener('scroll', handleScroll);
      
      // Clean up
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }, [loading, isLoadingMore, hasMore]);
    
    // Load more items when requested (infinite scroll)
    const loadMoreItems = useCallback(() => {
      if (isLoadingMore || !hasMore) return;
      
      setIsLoadingMore(true);
      
      // Simply display more of the existing results
      const currentlyDisplayed = displayedItems.length;
      const nextBatch = searchResults.slice(currentlyDisplayed, currentlyDisplayed + 20);
      
      setDisplayedItems(prev => [...prev, ...nextBatch]);
      setHasMore(currentlyDisplayed + nextBatch.length < searchResults.length);
      setIsLoadingMore(false);
    }, [displayedItems, searchResults, isLoadingMore, hasMore]);
    
    // Handle item selection
    const handleItemSelect = useCallback((product) => {
      if (!activeCell || activeCell.index === undefined) return;
      
      const index = activeCell.index;
      
      if (index >= 0 && editableData?.output?.items) {
        const newEditableData = { ...editableData };
        
        // Update kode_barang_main if it exists
        if ('kode_barang_main' in newEditableData.output.items[index]) {
          newEditableData.output.items[index].kode_barang_main = {
            ...newEditableData.output.items[index].kode_barang_main,
            value: product.product_code,
            is_confident: true
          };
        }
        
        // Update nama_barang_main if it exists
        if ('nama_barang_main' in newEditableData.output.items[index]) {
          newEditableData.output.items[index].nama_barang_main = {
            ...newEditableData.output.items[index].nama_barang_main,
            value: product.product_name,
            is_confident: true
          };
        }
        
        // Update satuan_main if it exists
        if ('satuan_main' in newEditableData.output.items[index]) {
          const productUnit = product.units && product.units.length > 0 ? 
            product.units[0] : product.unit || '';
            
          // Create a unit_prices object if the product has unit-specific prices
          let unitPrices = {};
          if (product.unit_prices) {
            // If product already has unit_prices property, use it
            unitPrices = product.unit_prices;
          } else {
            // Otherwise, create a default mapping with the same price for all units
            // This ensures backward compatibility
            const basePrice = parseFloat(product.base_price) || 0;
            if (product.units && product.units.length > 0) {
              product.units.forEach(unit => {
                unitPrices[unit] = basePrice;
              });
            } else if (product.unit) {
              unitPrices[product.unit] = basePrice;
            }
          }
            
          newEditableData.output.items[index].satuan_main = {
            ...newEditableData.output.items[index].satuan_main,
            value: productUnit,
            is_confident: true,
            available_units: product.units || [], // Store all available units
            unit_prices: unitPrices // Store unit-specific prices
          };
        }
        
        // If harga_dasar_main exists, update it with base_price
        if ('harga_dasar_main' in newEditableData.output.items[index]) {
          newEditableData.output.items[index].harga_dasar_main = {
            ...newEditableData.output.items[index].harga_dasar_main,
            value: parseFloat(product.base_price) || 0,
            is_confident: true
          };
        }
        
        // For backward compatibility - If harga_jual_main exists, also update it
        if ('harga_jual_main' in newEditableData.output.items[index]) {
          newEditableData.output.items[index].harga_jual_main = {
            ...newEditableData.output.items[index].harga_jual_main,
            value: parseFloat(product.price) || 0,
            is_confident: true
          };
        }
        
        setEditableData(newEditableData);
        if (onDataChange) onDataChange(newEditableData);
      }
      
      onClose();
    }, [activeCell, editableData, onDataChange, onClose]);
    
    // Handle search input changes
    const handleSearchChange = useCallback((e) => {
      const term = e.target.value;
      setSearchTerm(term);
      
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
      
      searchDebounceTimer.current = setTimeout(() => {
        if (term === lastSearchTerm) return;
        
        if (term.trim() === '') {
          setSearchResults([]);
          setDisplayedItems(initialItems);
          setHasMore(initialItems.length > 0);
          return;
        }
        
        if (term.trim().length < 2) {
          // Don't search if term is too short
          return;
        }
        
        if (searchCache[term]) {
          console.log(`[ProductSearchDropdown] Using cached results for "${term}"`);
          setSearchResults(searchCache[term]);
          // When searching, show all results
          setDisplayedItems(searchCache[term]);
          setHasMore(false); // No "..." button needed when showing all search results
          return;
        }
        
        console.log(`[ProductSearchDropdown] Searching for "${term}"`);
        setLoading(true);
        
        const performSearch = async () => {
          try {
            // For better UX, we'll always search both code and name
            let results = [];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            // Determine what fields to search based on activeCell, but default to search both
            let searchByCode = true;
            let searchByName = true;
            
            // Only limit to one field if specifically requested
            if (activeCell) {
              if (activeCell.type === 'kode_barang_main') {
                searchByCode = true;
                searchByName = false;
              } else if (activeCell.type === 'nama_barang_main') {
                searchByCode = false;
                searchByName = true;
              }
            }
            
            console.log('[ProductSearchDropdown] Search config:', { 
              term, 
              searchByCode, 
              searchByName,
              activeCell: activeCell?.type
            });
            
            // Search by product code if appropriate
            if (searchByCode) {
              try {
                const codeResponse = await axios.get(`${API_BASE_URL}/api/products/search`, {
                  params: {
                    search: term,
                    field: 'product_code',
                    limit: 0 // Request all matching items without limit
                  },
                  signal: controller.signal
                });
                
                if (codeResponse?.data?.success === true && Array.isArray(codeResponse.data.data)) {
                  const codeResults = codeResponse.data.data
                    .map(product => ({
                      product_code: product.kode_main || product.product_code || '',
                      product_name: product.nama_main || product.product_name || '',
                      unit: product.unit || '',
                      units: product.units || [], // All available units
                      base_price: product.harga_pokok || product.base_price || 0, // Use harga_pokok instead of harga_jual
                      price: product.harga_pokok || product.base_price || product.price || 0, // For backward compatibility 
                      supplier_code: product.supplier_code || ''
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  console.log(`[ProductSearchDropdown] Found ${codeResults.length} results by code for "${term}"`);
                  results = [...results, ...codeResults];
                }
              } catch (error) {
                console.error('[ProductSearchDropdown] Error searching by product code:', error);
              }
            }
            
            // Search by product name if appropriate
            if (searchByName) {
              try {
                const nameResponse = await axios.get(`${API_BASE_URL}/api/products/search`, {
                  params: {
                    search: term,
                    field: 'product_name',
                    limit: 0 // Request all matching items without limit
                  },
                  signal: controller.signal
                });
                
                if (nameResponse?.data?.success === true && Array.isArray(nameResponse.data.data)) {
                  const nameResults = nameResponse.data.data
                    .map(product => ({
                      product_code: product.kode_main || product.product_code || '',
                      product_name: product.nama_main || product.product_name || '',
                      unit: product.unit || '',
                      units: product.units || [], // All available units
                      base_price: product.harga_pokok || product.base_price || 0, // Use harga_pokok instead of harga_jual
                      price: product.harga_pokok || product.base_price || product.price || 0, // For backward compatibility 
                      supplier_code: product.supplier_code || ''
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  console.log(`[ProductSearchDropdown] Found ${nameResults.length} results by name for "${term}"`);
                  
                  // Add results that aren't already in the array (based on product_code)
                  const existingCodes = new Set(results.map(p => p.product_code));
                  const uniqueNameResults = nameResults.filter(p => !existingCodes.has(p.product_code));
                  
                  results = [...results, ...uniqueNameResults];
                }
              } catch (error) {
                console.error('[ProductSearchDropdown] Error searching by product name:', error);
              }
            }
            
            clearTimeout(timeoutId);
            
            // Only do general search if specific searches yielded no results
            if (results.length === 0) {
              try {
                const generalResponse = await axios.get(`${API_BASE_URL}/api/products/search`, {
                  params: { 
                    search: term,
                    limit: 0 // Request all matching items without limit
                  },
                  signal: controller.signal
                });
                
                if (generalResponse?.data?.success === true && Array.isArray(generalResponse.data.data)) {
                  const generalResults = generalResponse.data.data
                    .map(product => ({
                      product_code: product.kode_main || product.product_code || '',
                      product_name: product.nama_main || product.product_name || '',
                      unit: product.unit || '',
                      units: product.units || [], // All available units
                      base_price: product.harga_pokok || product.base_price || 0, // Use harga_pokok instead of harga_jual
                      price: product.harga_pokok || product.base_price || product.price || 0, // For backward compatibility
                      supplier_code: product.supplier_code || ''
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  console.log(`[ProductSearchDropdown] Found ${generalResults.length} results by general search for "${term}"`);
                  results = [...generalResults];
                }
              } catch (error) {
                console.error('[ProductSearchDropdown] Error in general search:', error);
              }
            }
            
            console.log(`[ProductSearchDropdown] Total combined results: ${results.length}`);
            
            if (results.length > 0) {
              setSearchCache(prev => ({
                ...prev,
                [term]: results
              }));
              
              setSearchResults(results);
              setDisplayedItems(results); // Show all search results without pagination
              setHasMore(false); // No need for "load more" since we're showing all results
            } else {
              setSearchResults([]);
              setDisplayedItems([]);
              setHasMore(false);
            }
          } catch (error) {
            console.error('[ProductSearchDropdown] Search error:', error);
            setSearchResults([]);
            setDisplayedItems([]);
            setHasMore(false);
          } finally {
            setLoading(false);
            setLastSearchTerm(term);
          }
        };
        
        performSearch();
      }, 300);
    }, [API_BASE_URL, initialItems, lastSearchTerm, searchCache, activeCell]);
    
    // Render the dropdown with ReactDOM.createPortal
    return ReactDOM.createPortal(
      <>
        {/* Dark overlay background */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => onClose()}
        ></div>
        <div 
          ref={dropdownRef}
          className="fixed z-50 bg-white shadow-lg rounded border border-gray-200 max-w-md w-full text-black"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxHeight: '80vh' // Limit max height to 80% of viewport height
          }}
        >
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder={`Minimal 2 karakter - Search ${activeCell?.type === 'kode_barang_main' ? 'product codes' : activeCell?.type === 'nama_barang_main' ? 'product names' : 'products'}...`}
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div 
            ref={scrollContainerRef} 
            className="overflow-y-auto" 
            style={{ maxHeight: 'calc(80vh - 60px)' }} // Adjust for input field height
          >
            {loading && (
              <div className="p-4 flex justify-center">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            {!loading && displayedItems.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                {searchTerm.trim().length < 2 ? 
                  "Minimal 2 karakter untuk pencarian" : 
                  "No products found"}
              </div>
            )}
            
            <div className="space-y-1">
              {displayedItems.map((product, idx) => (
                <div
                  key={`${product.product_code}-${idx}`}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex justify-between items-center"
                  onClick={() => handleItemSelect(product)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{product.product_name}</div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Code: {product.product_code}</span>
                      <span>{product.unit || 'No unit'}</span>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-gray-600 ml-2">
                    {product.base_price ? formatCurrency(product.base_price) : '-'}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator when scrolling for more items */}
              {isLoadingMore && (
                <div className="p-2 text-center text-gray-500 flex justify-center">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  });
  // Handle unit change and update price accordingly
  const handleUnitChange = useCallback((rowIndex, newUnit) => {
    console.log(`Changing unit for row ${rowIndex} to ${newUnit}`);
    const newData = { ...editableData };
    
    if (!newData.output.items || !newData.output.items[rowIndex]) {
      return;
    }
    
    // Update the unit value
    if ('satuan_main' in newData.output.items[rowIndex]) {
      newData.output.items[rowIndex].satuan_main.value = newUnit;
      
      // Get all available units and unit prices if they exist
      const availableUnits = newData.output.items[rowIndex].satuan_main.available_units || [];
      const unitPrices = newData.output.items[rowIndex].satuan_main.unit_prices || {};
      
      console.log('Unit prices available:', unitPrices);
      console.log('Selected unit:', newUnit);
      
      // Update the base price according to the selected unit if price data is available
      if (unitPrices && unitPrices[newUnit] !== undefined && 'harga_dasar_main' in newData.output.items[rowIndex]) {
        console.log(`Updating harga_dasar_main to ${unitPrices[newUnit]} for unit ${newUnit}`);
        newData.output.items[rowIndex].harga_dasar_main.value = parseFloat(unitPrices[newUnit]) || 0;
      }
      
      // For backward compatibility - also update harga_jual_main if it exists
      if (unitPrices && unitPrices[newUnit] !== undefined && 'harga_jual_main' in newData.output.items[rowIndex]) {
        console.log(`Updating harga_jual_main to ${unitPrices[newUnit]} for unit ${newUnit}`);
        newData.output.items[rowIndex].harga_jual_main.value = parseFloat(unitPrices[newUnit]) || 0;
      }
    }
    
    setEditableData(newData);
    
    if (onDataChange) {
      onDataChange(newData);
    }
  }, [editableData, onDataChange]);

  // Create a ref to track horizontal scroll position
  const tableScrollPosRef = useRef({ left: 0, top: 0 });
  
  // Set up scroll position tracking
  useEffect(() => {
    const tableContainer = document.getElementById('table-container');
    if (!tableContainer) return;
    
    // Save the scroll position whenever the user scrolls
    const handleScroll = () => {
      if (!dropdownOpen) {
        tableScrollPosRef.current = {
          left: tableContainer.scrollLeft,
          top: tableContainer.scrollTop
        };
        console.log('Saved scroll position:', tableScrollPosRef.current);
      }
    };
    
    // Restore scroll position on component mount
    tableContainer.scrollLeft = tableScrollPosRef.current.left;
    tableContainer.scrollTop = tableScrollPosRef.current.top;
    
    // Add scroll event listener
    tableContainer.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      tableContainer.removeEventListener('scroll', handleScroll);
    };
  }, [dropdownOpen]);
  
  // When dropdown closes, restore scroll position
  useEffect(() => {
    if (dropdownOpen) return;
    
    // Restore scroll position on a slight delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      const tableContainer = document.getElementById('table-container');
      if (tableContainer) {
        tableContainer.scrollLeft = tableScrollPosRef.current.left;
        tableContainer.scrollTop = tableScrollPosRef.current.top;
        console.log('Restored scroll position:', tableScrollPosRef.current);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dropdownOpen]);

  // Set up keyboard listener for dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Close dropdown on Escape key
        setDropdownOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  if (!editableData) {
    return null;
  }

  return (
    <div className="relative">
      {/* Add a horizontal scroll wrapper */}
      <div className="relative overflow-auto" style={{ maxWidth: '100%' }}>
        <OCRResultsContent 
          editableData={editableData}
          columns={columns}
          columnWidths={columnWidths}
          handleItemChange={handleItemChange}
          searchStatus={searchStatus}
          handleProductCellClick={handleProductCellClick}
          startResize={startResize}
          renderDatePicker={renderDatePicker}
          handleHeaderChange={handleHeaderChange}
          safeGet={safeGet}
          getCellBackgroundColor={getCellBackgroundColor}
          renderBooleanField={renderBooleanField}
          handleIncludePPNChange={handleIncludePPNChange}
          formatCurrency={formatCurrency}
        />
      </div>

      <style jsx>{`
        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 5px;
          background: rgba(0, 0, 0, 0.1);
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }
        
        .resizer:hover,
        .resizing {
          background: rgba(59, 130, 246, 0.5);
        }
        
        /* Highlight on hover for better UX */
        tr:hover td {
          background-color: #f3f4f6 !important;
        }
        
        tr:hover td.confidence-low {
          background-color: #fee2e2 !important;
        }
        
        tr:hover td.confidence-medium {
          background-color: #fef3c7 !important;
        }
        
        tr:hover td.confidence-high {
          background-color: #d1fae5 !important;
        }
        
        tr:hover td[style*="backgroundColor: white"]:not(.sticky) {
          background-color: #f3f4f6 !important;
        }
      `}</style>

      {/* Product Search Dropdown */}
      {dropdownOpen && activeCell && (
        <ProductSearchDropdown onClose={() => setDropdownOpen(false)} activeCellRef={activeCellRef} activeCell={activeCell} editableData={editableData} setEditableData={setEditableData} onDataChange={onDataChange} API_BASE_URL={API_BASE_URL} />
      )}
    </div>
  );
}

