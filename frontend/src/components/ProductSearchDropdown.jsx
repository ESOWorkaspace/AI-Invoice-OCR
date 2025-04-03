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
                unit_prices: product.unit_prices || {} // Include unit_prices from backend
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
      
      console.log('ProductSearchDropdown: Selected product:', product);
      // Log detailed information about unit prices for debugging
      if (product.unit_prices) {
        console.log('ProductSearchDropdown: Backend provided these unit prices:', product.unit_prices);
      }
      
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
          
        // Get the unit prices from the product data
        let unitPrices = {};
        
        if (product.units_price) {
          // Alternative property name that might be used
          unitPrices = product.units_price;
          console.log(`ProductSearchDropdown: Using provided units_price:`, unitPrices);
        } else if (product.unit_prices) {
          // Direct unit_prices mapping from backend (most explicit)
          unitPrices = product.unit_prices;
          console.log(`ProductSearchDropdown: Using unit_prices directly from API:`, unitPrices);
        } else {
          // Fallback for backward compatibility - create a mapping with the same price for all units
          const basePrice = parseFloat(product.base_price) || 0;
          console.log(`ProductSearchDropdown: No unit-specific prices found in API response, creating fallback mapping with base price ${basePrice}`);
          
          if (product.units && product.units.length > 0) {
            product.units.forEach(unit => {
              unitPrices[unit] = basePrice;
            });
          } else if (product.unit) {
            unitPrices[product.unit] = basePrice;
          }
          
          console.log(`ProductSearchDropdown: Created fallback unit_prices:`, unitPrices);
        }
          
        newEditableData.output.items[index].satuan_main = {
          ...newEditableData.output.items[index].satuan_main,
          value: productUnit,
          is_confident: true,
          available_units: product.units || [product.unit].filter(Boolean), // Store all available units
          unit_prices: unitPrices // Store unit-specific prices
        };
      }
      
      // If harga_dasar_main exists, update it with base_price
      if ('harga_dasar_main' in newEditableData.output.items[index]) {
        // Get the selected unit and its price
        const selectedUnit = newEditableData.output.items[index]?.satuan_main?.value || 
          (product.units && product.units.length > 0 ? product.units[0] : product.unit || '');
          
        const unitPrices = newEditableData.output.items[index]?.satuan_main?.unit_prices || {};
        const basePrice = selectedUnit && unitPrices[selectedUnit] ? 
          parseFloat(unitPrices[selectedUnit]) : 
          parseFloat(product.base_price) || 0;
        
        console.log(`ProductSearchDropdown: Setting harga_dasar_main to ${basePrice} for unit ${selectedUnit}`);
        
        newEditableData.output.items[index].harga_dasar_main = {
          ...newEditableData.output.items[index].harga_dasar_main,
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
                    supplier_code: product.supplier_code || '',
                    unit_prices: product.unit_prices || {} // Include unit_prices from backend
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
                    supplier_code: product.supplier_code || '',
                    unit_prices: product.unit_prices || {} // Include unit_prices from backend
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
                    supplier_code: product.supplier_code || '',
                    unit_prices: product.unit_prices || {} // Include unit_prices from backend
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
            // Only show first 30 results initially, then load more as user scrolls
            const INITIAL_DISPLAY_COUNT = 30;
            setDisplayedItems(results.slice(0, INITIAL_DISPLAY_COUNT));
            setHasMore(results.length > INITIAL_DISPLAY_COUNT);
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
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

export default ProductSearchDropdown; 