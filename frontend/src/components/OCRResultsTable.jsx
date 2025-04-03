import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { safeGet } from '../utils/dataHelpers';
import { parseNumber, formatCurrency } from '../utils/dataFormatters';
import { BooleanField } from './UIComponents';
import InvoiceHeader from './InvoiceHeader';
import ItemsTable from './ItemsTable';
import TotalsSection from './TotalsSection';
import DebugSection from './DebugSection';
import ProductSearchDropdown from './ProductSearchDropdown';

/**
 * Main component for OCR results table
 */
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
  const lastScrollY = useRef(0);
  
  // Restore scroll position when dropdown closes
  useEffect(() => {
    if (!dropdownOpen) {
      // Don't reset the scroll position on dropdown close
      // The tableScrollPosRef will handle this for the table container
      return;
    } else {
      // When dropdown opens, save the current scroll position
      lastScrollY.current = window.scrollY;
    }
  }, [dropdownOpen]);
  
  // Add a product cache to store previously fetched products
  const [productCache, setProductCache] = useState({});
  
  // Track processed invoice codes to avoid redundant searches
  const processedInvoiceCodes = useRef(new Set()).current;
  
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
          
          if (!item.harga_dasar_main) {
            item.harga_dasar_main = { value: 0, is_confident: true, from_database: true };
          } else {
            item.harga_dasar_main.from_database = true;
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

  // Handle changes to header fields
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
      _fieldName: field
    };
    
    setEditableData(newData);
    if (onDataChange) onDataChange(newData);
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
          newData.output.items[itemIndex].harga_dasar_main = {
            ...newData.output.items[itemIndex].harga_dasar_main,
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
              newData.output.items[itemIndex].harga_dasar_main = {
                ...newData.output.items[itemIndex].harga_dasar_main,
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
        } else {
          // No results found
          console.warn(`No products found for invoice code: ${invoiceCode}`);
          setSearchStatus(prev => ({
            ...prev,
            [itemIndex]: 'not_found'
          }));
        }
        
        // Remove from pending searches
        setPendingSearches(prev => {
          const newPending = { ...prev };
          delete newPending[itemIndex];
          return newPending;
        });
      })
      .catch(error => {
        console.error(`Error searching for product with invoice code ${invoiceCode}:`, error);
        
        // Set search status to error
        setSearchStatus(prev => ({
          ...prev,
          [itemIndex]: 'error'
        }));
        
        // Remove from pending searches
        setPendingSearches(prev => {
          const newPending = { ...prev };
          delete newPending[itemIndex];
          return newPending;
        });
      });
    } catch (error) {
      console.error('Error in searchProductByInvoiceCode:', error);
      
      // Set search status to error
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'error'
      }));
      
      // Remove from pending searches
      setPendingSearches(prev => {
        const newPending = { ...prev };
        delete newPending[itemIndex];
        return newPending;
      });
    }
  }, [API_BASE_URL, editableData, onDataChange, productCache, setProductCache, setProductMapping, setSearchStatus, setPendingSearches]);

  // Handle changes to item fields
  const handleItemChange = useCallback((rowIndex, field, value) => {
    const newData = { ...editableData };
    
    // Update the field value
    if (newData.output.items && newData.output.items[rowIndex]) {
      newData.output.items[rowIndex][field] = {
        ...newData.output.items[rowIndex][field],
        value: value,
        is_confident: true
      };
      
      // Special case for kode_barang_invoice
      // If this field changes and there's a valid value, try to search for the product
      if (field === 'kode_barang_invoice' && value) {
        // Check if we already have this product in cache
        if (productCache[value]) {
          // Use cached product
          const product = productCache[value];
          
          newData.output.items[rowIndex].kode_barang_main = {
            ...newData.output.items[rowIndex].kode_barang_main,
            value: product.product_code || '',
            is_confident: true
          };
          
          newData.output.items[rowIndex].nama_barang_main = {
            ...newData.output.items[rowIndex].nama_barang_main,
            value: product.product_name || '',
            is_confident: true
          };
          
          if (product.unit) {
            newData.output.items[rowIndex].satuan_main = {
              ...newData.output.items[rowIndex].satuan_main,
              value: product.unit,
              is_confident: true
            };
          }
          
          if (product.price) {
            newData.output.items[rowIndex].harga_dasar_main = {
              ...newData.output.items[rowIndex].harga_dasar_main,
              value: parseFloat(product.price),
              is_confident: true
            };
          }
          
          // Set search status
          setSearchStatus(prev => ({
            ...prev,
            [rowIndex]: 'found'
          }));
        } else {
          // Need to search for product
          setPendingSearches(prev => ({
            ...prev,
            [rowIndex]: value
          }));
          
          // Mark as searching
          setSearchStatus(prev => ({
            ...prev,
            [rowIndex]: 'searching'
          }));
          
          // Call search function
          searchProductByInvoiceCode(value, rowIndex);
        }
      }
    }
    
    setEditableData(newData);
    if (onDataChange) onDataChange(newData);
  }, [editableData, onDataChange, productCache, searchProductByInvoiceCode]);

  // Handle effect for auto-searching products based on invoice codes
  useEffect(() => {
    // Skip if there are no items or if we're already searching for something
    if (!editableData?.output?.items || Object.keys(pendingSearches).length > 0) {
      return;
    }
    
    // Check which items need to be searched
    const itemsToSearch = [];
    
    editableData.output.items.forEach((item, index) => {
      const invoiceCode = safeGet(item, 'kode_barang_invoice.value', '');
      const mainCode = safeGet(item, 'kode_barang_main.value', '');
      
      // Skip items that don't have an invoice code or already have a main code
      if (!invoiceCode || mainCode || processedInvoiceCodes.has(invoiceCode)) {
        return;
      }
      
      // Add to the list of items to search
      itemsToSearch.push({ index, invoiceCode });
      processedInvoiceCodes.add(invoiceCode);
    });
    
    // No items to search
    if (itemsToSearch.length === 0) {
      return;
    }
    
    // Set status to searching for these items
    itemsToSearch.forEach(({ index }) => {
      setSearchStatus(prev => ({
        ...prev,
        [index]: 'searching'
      }));
      
      setPendingSearches(prev => ({
        ...prev,
        [index]: true
      }));
    });
    
    // Use setTimeout to ensure searchProductByInvoiceCode is defined
    setTimeout(() => {
      try {
        if (typeof searchProductByInvoiceCode === 'function') {
          // Search for each item
          itemsToSearch.forEach(({ index, invoiceCode }) => {
            try {
              // Check if already in cache
              if (productCache[invoiceCode]) {
                console.log(`Using cache for invoice code ${invoiceCode} in auto-search`);
                
                // Use cached product
                const product = productCache[invoiceCode];
                
                // Update item data
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
                  
                  if (product.unit) {
                    newData.output.items[index].satuan_main = {
                      ...newData.output.items[index].satuan_main,
                      value: product.unit,
                      is_confident: true
                    };
                  }
                  
                  if (product.price) {
                    newData.output.items[index].harga_dasar_main = {
                      ...newData.output.items[index].harga_dasar_main,
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
                searchProductByInvoiceCode(invoiceCode, index);
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
  }, [editableData?.output?.items, pendingSearches, productCache, searchProductByInvoiceCode, processedInvoiceCodes, onDataChange]);

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
            value={item.value !== null && item.value !== undefined ? formatCurrency(item.value) : ''}
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
            value={typeof item.value === 'number' ? item.value.toString().replace('.', ',') : (item.value || '')}
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
            value={item.value !== undefined && item.value !== null ? item.value : ''}
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
    { id: 'satuan', header: 'Satuan Invoice', width: 80, align: 'center' },
    { id: 'satuan_main', header: 'SATUAN MAIN', width: 120, align: 'center', special: 'database' },
    { id: 'harga_satuan', header: 'Harga Satuan', width: 120, type: 'currency', align: 'right' },
    { id: 'harga_bruto', header: 'Harga Bruto', width: 120, type: 'currency', align: 'right' },
    { id: 'diskon_persen', header: 'Diskon %', width: 100, type: 'percentage', align: 'right' },
    { id: 'diskon_rp', header: 'Diskon Rp', width: 120, type: 'currency', align: 'right' },
    { id: 'jumlah_netto', header: 'Jumlah Netto', width: 120, type: 'currency', align: 'right' },
    { id: 'bkp', header: 'BKP', width: 80, type: 'boolean', align: 'center' },
    { id: 'ppn', header: 'PPN', width: 100, type: 'currency', align: 'right' },
    { id: 'harga_dasar_main', header: 'Harga Dasar', width: 150, type: 'currency', align: 'right', special: 'database' },
    { id: 'margin_persen', header: 'Margin %', width: 100, type: 'percentage', align: 'right', special: 'database' },
    { id: 'margin_rp', header: 'Margin Rp', width: 120, type: 'currency', align: 'right', special: 'database' },
    { id: 'kenaikan_persen', header: 'Perbedaan %', width: 100, type: 'percentage', align: 'right' },
    { id: 'kenaikan_rp', header: 'Perbedaan Rp', width: 120, type: 'currency', align: 'right' },
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
    // Store current scroll position before opening dropdown
    lastScrollY.current = window.scrollY;
    
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

  // Handle unit change - simplified to let ItemsTable handle the unit-price relationship
  const handleUnitChange = useCallback((rowIndex, newUnit) => {
    console.log(`OCRResultsTable: Received unit change for row ${rowIndex} to ${newUnit}`);
    const newData = { ...editableData };
    
    if (!newData.output.items || !newData.output.items[rowIndex]) {
      return;
    }
    
    // Basic update of the unit value
    if ('satuan_main' in newData.output.items[rowIndex]) {
      newData.output.items[rowIndex].satuan_main.value = newUnit;
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
    <div className="w-full h-full">
      {/* Invoice Header */}
      <InvoiceHeader
        editableData={editableData}
        handleHeaderChange={handleHeaderChange}
        renderBooleanField={renderBooleanField}
        handleIncludePPNChange={handleIncludePPNChange}
      />
      
      {/* Items Table */}
      <ItemsTable
        editableData={editableData}
        handleItemChange={handleItemChange}
        searchStatus={searchStatus}
        handleProductCellClick={handleProductCellClick}
        handleUnitChange={handleUnitChange}
        handleBKPChange={handleBKPChange}
      />
      
      {/* Totals Section */}
      <TotalsSection
        editableData={editableData}
      />
      
      {/* Debug Section */}
      <DebugSection
        editableData={editableData}
      />
      
      {/* Product Search Dropdown */}
      {dropdownOpen && activeCell && (
        <ProductSearchDropdown 
          onClose={() => setDropdownOpen(false)} 
          activeCellRef={activeCellRef} 
          activeCell={activeCell} 
          editableData={editableData} 
          setEditableData={setEditableData} 
          onDataChange={onDataChange} 
          API_BASE_URL={API_BASE_URL} 
        />
      )}
    </div>
  );
}

