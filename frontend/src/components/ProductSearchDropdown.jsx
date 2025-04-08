import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/dataFormatters';
import { safeGet } from '../utils/dataHelpers';

/**
 * Product Search Dropdown Component
 * Displays a modal dialog for product search
 */
const ProductSearchDropdown = memo(({ 
  onClose, 
  activeCellRef, 
  activeCell, 
  editableData, 
  setEditableData, 
  onDataChange, 
  API_BASE_URL 
}) => {
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
                supplier_code: product.supplier_code || '',
                unit_prices: product.unit_prices || {}, // Include unit_prices from backend
                supplier_unit: product.satuan_supplier || product.supplier_unit || '', // Include supplier unit info
                supplier_units: product.supplier_units || {} // Include mapping of units to supplier units if available
              }))
              .filter(product => product.product_code !== '123' && product.product_name !== 'test');
            
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
        // Error loading initial items
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
  }, [API_BASE_URL, activeCell, editableData, searchTerm]);
  
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
  }, [loading, isLoadingMore, hasMore, loadMoreItems]);
  
  // Handle item selection
  const handleItemSelect = useCallback((product) => {
    if (!activeCell || activeCell.index === undefined) return;
    
    const index = activeCell.index;
    
    if (index >= 0 && editableData?.output?.items) {
      const newEditableData = { ...editableData };
      const item = newEditableData.output.items[index];
      
      // Update kode_barang_main if it exists
      if ('kode_barang_main' in item) {
        item.kode_barang_main = {
          ...item.kode_barang_main,
          value: product.product_code,
          is_confident: true
        };
      }
      
      // Update nama_barang_main if it exists
      if ('nama_barang_main' in item) {
        item.nama_barang_main = {
          ...item.nama_barang_main,
          value: product.product_name,
          is_confident: true
        };
      }
      
      // Determine supplier unit and unit information
      let supplierUnit = '';
      if (product.supplier_unit && typeof product.supplier_unit === 'string') {
        supplierUnit = product.supplier_unit;
      } else if (product.satuan_supplier) {
        supplierUnit = product.satuan_supplier;
      } else if (product.supplier_unit && typeof product.supplier_unit === 'object') {
        // If supplier_unit is a mapping object, we'll use it later when selecting the unit
        supplierUnit = ''; // Will be set based on selected unit
      }
      
      // Get all available units for the product
      const availableUnits = product.units && product.units.length > 0 ? 
        product.units : [product.unit].filter(Boolean);
      
      // Get the unit prices from the product data
      let unitPrices = {};
      if (product.units_price) {
        unitPrices = product.units_price;
      } else if (product.unit_prices) {
        unitPrices = product.unit_prices;
      } else {
        // Create a fallback mapping with the same price for all units
        const basePrice = parseFloat(product.base_price) || 0;
        availableUnits.forEach(unit => {
          unitPrices[unit] = basePrice;
        });
      }
      
      // Determine the best unit to use based on the available information
      let unitToUse = '';
      let userSupplierUnit = '';
      
      // First priority: Check if the item already has a satuan (supplier unit) field
      if (item.satuan && item.satuan.value) {
        userSupplierUnit = item.satuan.value;
        
        // Find the corresponding main unit for this supplier unit
        if (product.supplier_units && typeof product.supplier_units === 'object') {
          // Look up the main unit that corresponds to this supplier unit
          for (const [mainUnit, supUnit] of Object.entries(product.supplier_units)) {
            if (supUnit === userSupplierUnit) {
              unitToUse = mainUnit;
              break;
            }
          }
        }
        
        // If we couldn't find a match, try supplier_unit if it's an object (reverse mapping)
        if (!unitToUse && product.supplier_unit && typeof product.supplier_unit === 'object') {
          for (const [mainUnit, supUnit] of Object.entries(product.supplier_unit)) {
            if (supUnit === userSupplierUnit) {
              unitToUse = mainUnit;
              break;
            }
          }
        }
      }
      
      // Second priority: Use the first available unit if we couldn't find a match
      if (!unitToUse && availableUnits.length > 0) {
        unitToUse = availableUnits[0];
        
        // Try to get corresponding supplier unit for this main unit
        if (product.supplier_unit && typeof product.supplier_unit === 'object') {
          userSupplierUnit = product.supplier_unit[unitToUse] || supplierUnit;
        } else if (supplierUnit) {
          userSupplierUnit = supplierUnit;
        }
      }
      
      // Update satuan_main if it exists
      if ('satuan_main' in item) {
        item.satuan_main = {
          ...item.satuan_main,
          value: unitToUse,
          is_confident: true,
          available_units: availableUnits, // Store all available units
          unit_prices: unitPrices, // Store unit-specific prices
          supplier_unit: userSupplierUnit // Store supplier unit information
        };
      }
      
      // Update satuan field with supplier unit if it exists
      if ('satuan' in item && userSupplierUnit) {
        item.satuan = {
          ...item.satuan,
          value: userSupplierUnit,
          is_confident: true
        };
      }
      
      // If harga_dasar_main exists, update it with base_price for the selected unit
      if ('harga_dasar_main' in item) {
        // Get the price for the selected unit
        const basePrice = unitToUse && unitPrices[unitToUse] ? 
          parseFloat(unitPrices[unitToUse]) : 
          parseFloat(product.base_price) || 0;
        
        item.harga_dasar_main = {
          ...item.harga_dasar_main,
          value: basePrice,
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
        setSearchResults(searchCache[term]);
        // When searching, show all results
        setDisplayedItems(searchCache[term]);
        setHasMore(false); // No "..." button needed when showing all search results
        return;
      }
      
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
          let searchBySupplierCode = true;
          
          // Only limit to one field if specifically requested
          if (activeCell) {
            if (activeCell.type === 'kode_barang_main') {
              searchByCode = true;
              searchByName = false;
              searchBySupplierCode = true; // Always check supplier code when searching by codes
            } else if (activeCell.type === 'nama_barang_main') {
              searchByCode = false;
              searchByName = true;
              searchBySupplierCode = false;
            }
          }
          
          // Specifically search by supplier code first if the search term matches a pattern
          // This prioritizes exact supplier code matches
          if (searchBySupplierCode) {
            try {
              const supplierCodeResponse = await axios.get(`${API_BASE_URL}/api/products/supplier/${term}`, {
                signal: controller.signal
              });
              
              if (supplierCodeResponse?.data && supplierCodeResponse.data.product_code) {
                const product = supplierCodeResponse.data;
                const supplierCodeResult = {
                  product_code: product.kode_main || product.product_code || '',
                  product_name: product.nama_main || product.product_name || '',
                  unit: product.unit || '',
                  units: product.units || [],
                  base_price: product.harga_pokok || product.base_price || 0,
                  price: product.harga_pokok || product.base_price || product.price || 0,
                  supplier_code: product.supplier_code || term,
                  unit_prices: product.unit_prices || {},
                  supplier_unit: product.satuan_supplier || product.supplier_unit || '',
                  supplier_units: product.supplier_units || {}
                };
                
                results = [supplierCodeResult];
                console.log('Found exact match by supplier code:', term);
              }
            } catch (error) {
              // Error in supplier code search, continue with other searches
            }
          }
          
          // Continue with other searches if we haven't found an exact supplier code match
          if (results.length === 0) {
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
                      supplier_code: product.supplier_code || '',
                      unit_prices: product.unit_prices || {}, // Include unit_prices from backend
                      supplier_unit: product.satuan_supplier || product.supplier_unit || '', // Include supplier unit info
                      supplier_units: product.supplier_units || {} // Include mapping of units to supplier units
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  results = [...results, ...codeResults];
                }
              } catch (error) {
                // Error occurred during search by product code
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
                      supplier_code: product.supplier_code || '',
                      unit_prices: product.unit_prices || {}, // Include unit_prices from backend
                      supplier_unit: product.satuan_supplier || product.supplier_unit || '', // Include supplier unit info
                      supplier_units: product.supplier_units || {} // Include mapping of units to supplier units
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  results = [...results, ...nameResults];
                }
              } catch (error) {
                // Error occurred during search by product name
              }
            }
            
            // If there was no specific field search or the results are empty, do a general search
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
                      base_price: product.harga_pokok || product.base_price || 0,
                      price: product.harga_pokok || product.base_price || product.price || 0,
                      supplier_code: product.supplier_code || '',
                      unit_prices: product.unit_prices || {},
                      supplier_unit: product.satuan_supplier || product.supplier_unit || '',
                      supplier_units: product.supplier_units || {}
                    }))
                    .filter(product => product.product_code !== '123' && product.product_name !== 'test');
                  
                  results = [...generalResults];
                }
              } catch (error) {
                // Error in general search
              }
            }
            
            // Remove duplicates based on product_code
            const uniqueResults = [];
            const seenCodes = new Set();
            for (const product of results) {
              if (!seenCodes.has(product.product_code)) {
                seenCodes.add(product.product_code);
                uniqueResults.push(product);
              }
            }
            
            results = uniqueResults;
            
            // Cache the results
            setSearchCache(prev => ({
              ...prev,
              [term]: results
            }));
            
            setSearchResults(results);
            setDisplayedItems(results);
            setHasMore(false);
            setLastSearchTerm(term);
            
            clearTimeout(timeoutId);
          }
        } catch (error) {
          // Handle and log search errors
        } finally {
          setLoading(false);
        }
      };
      
      performSearch();
    }, 300);
  }, [API_BASE_URL, lastSearchTerm, initialItems, activeCell, searchCache]);
  
  // Handle click outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Position the dropdown in the center of the screen
  const dropdownStyles = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1050,
    maxWidth: '90vw',
    width: '600px',
    maxHeight: '80vh'
  };
  
  // Use a portal for the dropdown to ensure it's rendered at the top level
  return ReactDOM.createPortal(
    <>
      {/* Dark overlay background */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div 
        className="fixed z-50 bg-white shadow-lg rounded border border-gray-200 max-w-md w-full text-black overflow-hidden"
        style={dropdownStyles}
        ref={dropdownRef}
      >
        <div className="p-2 border-b border-gray-200">
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            placeholder={`Minimal 2 karakter - Search ${activeCell?.type === 'kode_barang_main' ? 'product codes' : activeCell?.type === 'nama_barang_main' ? 'product names' : 'products'}...`}
            value={searchTerm}
            onChange={handleSearchChange}
            ref={inputRef}
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
                  {product.supplier_code && (
                    <div className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                      Supplier Code: <span className="font-semibold">{product.supplier_code}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm font-mono text-gray-600 ml-2">
                  {product.base_price ? formatCurrency(product.base_price) : '-'}
                </div>
                {product.supplier_unit && (
                  <div className="text-xs text-gray-500 ml-2">
                    ({product.supplier_unit})
                  </div>
                )}
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

export default ProductSearchDropdown; 