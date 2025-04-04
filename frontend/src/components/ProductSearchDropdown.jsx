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
        } else if (product.unit_prices) {
          // Direct unit_prices mapping from backend (most explicit)
          unitPrices = product.unit_prices;
        } else {
          // Fallback for backward compatibility - create a mapping with the same price for all units
          const basePrice = parseFloat(product.base_price) || 0;
          
          if (product.units && product.units.length > 0) {
            product.units.forEach(unit => {
              unitPrices[unit] = basePrice;
            });
          } else if (product.unit) {
            unitPrices[product.unit] = basePrice;
          }
        }
        
        // Store supplier unit information if available
        let supplierUnit = '';
        if (product.supplier_unit && typeof product.supplier_unit === 'object') {
          // Handle case where supplier_unit is a mapping of internal unit to supplier unit
          supplierUnit = product.supplier_unit[productUnit] || '';
        } else if (typeof product.supplier_unit === 'string') {
          // Handle case where supplier_unit is a direct string
          supplierUnit = product.supplier_unit;
        } else if (product.satuan_supplier) {
          // Alternative property name
          supplierUnit = product.satuan_supplier;
        }
          
        newEditableData.output.items[index].satuan_main = {
          ...newEditableData.output.items[index].satuan_main,
          value: productUnit,
          is_confident: true,
          available_units: product.units || [product.unit].filter(Boolean), // Store all available units
          unit_prices: unitPrices, // Store unit-specific prices
          supplier_unit: supplierUnit // Store supplier unit information
        };
        
        // Also update the satuan field with supplier unit if it exists
        if (supplierUnit && 'satuan' in newEditableData.output.items[index]) {
          newEditableData.output.items[index].satuan = {
            ...newEditableData.output.items[index].satuan,
            value: supplierUnit,
            is_confident: true
          };
        }
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
        } catch (error) {
          // Handle and log search errors
        } finally {
          setLoading(false);
        }
      };
      
      performSearch();
    }, 300);
  }, [API_BASE_URL, lastSearchTerm, initialItems, activeCell, searchCache]);
  
  // Render the suggestion item
  const renderSuggestionItem = useCallback((item) => {
    return (
      <div className="search-item" onClick={() => handleItemSelect(item)}>
        <div className="search-item__code" title={item.product_code}>{item.product_code}</div>
        <div className="search-item__name" title={item.product_name}>{item.product_name}</div>
        <div className="search-item__unit" title={item.unit}>{item.unit}</div>
        <div className="search-item__price" title={formatCurrency(item.base_price)}>
          {formatCurrency(item.base_price) || '0'}
        </div>
        {item.supplier_unit && (
          <div className="search-item__supplier-unit" title={`Supplier: ${item.supplier_unit}`}>
            ({item.supplier_unit})
          </div>
        )}
      </div>
    );
  }, [handleItemSelect]);
  
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

  // Position the dropdown relative to the active cell
  // Use portal to render outside the normal DOM hierarchy
  const dropdownStyles = {
    top: activeCellRef ? activeCellRef.offsetTop + activeCellRef.offsetHeight + 'px' : '0px',
    left: activeCellRef ? activeCellRef.offsetLeft + 'px' : '0px',
    minWidth: activeCellRef ? activeCellRef.offsetWidth + 'px' : '300px',
  };
  
  // Use a portal for the dropdown to ensure it's rendered at the top level
  return ReactDOM.createPortal(
    <div 
      className="product-search-dropdown" 
      style={dropdownStyles} 
      ref={dropdownRef}
    >
      <div className="search-header">
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleSearchChange}
          ref={inputRef}
        />
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="search-results" ref={scrollContainerRef}>
        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : (
          <>
            {displayedItems.length === 0 ? (
              <div className="no-results">
                {searchTerm.trim() === '' ? 'Start typing to search' : 'No results found'}
              </div>
            ) : (
              <>
                {displayedItems.map((item, index) => (
                  <React.Fragment key={item.product_code || index}>
                    {renderSuggestionItem(item)}
                  </React.Fragment>
                ))}
                {isLoadingMore && <div className="loading-indicator">Loading more...</div>}
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
});

export default ProductSearchDropdown; 