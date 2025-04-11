import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { safeGet, getCellBackgroundColor } from '../utils/dataHelpers';
import { parseNumber, formatCurrency } from '../utils/dataFormatters';
import { BooleanField } from './UIComponents';
import InvoiceHeader from './InvoiceHeader';
import ItemsTable from './ItemsTable';
import TotalsSection from './TotalsSection';
import DebugSection from './DebugSection';
import ProductSearchDropdown from './ProductSearchDropdown';
import { productItemApi } from '../services/api';

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
  
  // Add a product cache to store previously fetched products
  const productCache = useRef({});
  
  // Track processed invoice codes to avoid redundant searches
  const processedInvoiceCodes = useRef(new Set());
  
  // Add a ref to track if initial data was processed
  const initialDataProcessed = useRef(false);
  // Add a ref to track processed item indices - reinitialize to avoid persistence issues
  const processedItemIndices = useRef(new Set());
  // Add a ref to track items that need processing
  const pendingItemsRef = useRef([]);
  // Add a ref to track if we're currently processing items to prevent concurrent processing
  const isProcessingRef = useRef(false);
  // Add a ref to track last processed data length to detect new items
  const lastDataLengthRef = useRef(0);
  
  // Reset processedItemIndices when component mounts or data changes
  useEffect(() => {
    processedItemIndices.current = new Set();
    isProcessingRef.current = false;
  }, [data]);
  
  // Use refs to store function references to break circular dependencies
  const functionRefs = useRef({
    updateSearchStatus: null,
    updateProductDataInItem: null,
    searchProductByInvoiceCode: null,
    preprocessItems: null
  });
  
  // Helper function to ensure a field has the correct structure
  const ensureField = (field, defaultValue = '') => {
    if (!field) {
      return { value: defaultValue, is_confident: false };
    }
    
    if (typeof field === 'object' && field.value !== undefined) {
      return field;
    }
    
    return { value: field, is_confident: false };
  };
  
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

  // Normalize data structure if needed
  useEffect(() => {
    if (data) {
      // Create a normalized copy of the data
      const normalizedData = { ...data };
      
      // Helper function to extract field from either location
      const extractField = (data, fieldName, defaultValue = null) => {
        // First try the new structure with field at root level
        if (data[fieldName] && data[fieldName].value !== undefined) {
          return data[fieldName];
        }
        // Then try the old structure with fields in output
        else if (data.output && data.output[fieldName] && data.output[fieldName].value !== undefined) {
          return data.output[fieldName];
        }
        // Create a default object if not found
        return {
          value: defaultValue,
          is_confident: false
        };
      };
      
      // Ensure output exists
      if (!normalizedData.output) {
        normalizedData.output = {};
      }
      
      // Create centralized fields in output from potential root fields
      normalizedData.output.nomor_referensi = extractField(normalizedData, 'nomor_referensi', '');
      normalizedData.output.nama_supplier = extractField(normalizedData, 'nama_supplier', '');
      normalizedData.output.tanggal_faktur = extractField(normalizedData, 'tanggal_faktur', '');
      normalizedData.output.tgl_jatuh_tempo = extractField(normalizedData, 'tgl_jatuh_tempo', '');
      normalizedData.output.salesman = extractField(normalizedData, 'salesman', '');
      
      // Handle tipe_dokumen field
      const tipeDoc = extractField(normalizedData, 'tipe_dokumen', '');
      normalizedData.output.tipe_dokumen = tipeDoc;
      
      // Handle tipe_pembayaran field
      const tipePembayaran = extractField(normalizedData, 'tipe_pembayaran', '');
      normalizedData.output.tipe_pembayaran = tipePembayaran;
      
      // Handle both include_vat and include_ppn
      const includeVat = extractField(normalizedData, 'include_vat', false);
      const includePpn = extractField(normalizedData, 'include_ppn', false);
      normalizedData.output.include_ppn = includeVat.value ? includeVat : includePpn;
      
      // Handle tanggal_jatuh_tempo vs tgl_jatuh_tempo
      if (normalizedData.output.tgl_jatuh_tempo && !normalizedData.output.tanggal_jatuh_tempo) {
        normalizedData.output.tanggal_jatuh_tempo = normalizedData.output.tgl_jatuh_tempo;
      }
      
      // Handle debug data
      if (normalizedData.debug && Array.isArray(normalizedData.debug)) {
        normalizedData.output.debug = normalizedData.debug;
      }
      
      if (normalizedData.debug_summary) {
        normalizedData.output.debug_summary = normalizedData.debug_summary;
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
      
      // Ensure items array exists, checking both structures
      if (!normalizedData.output.items) {
        if (normalizedData.output.output && Array.isArray(normalizedData.output.output.items)) {
          normalizedData.output.items = normalizedData.output.output.items;
        } else {
          normalizedData.output.items = [];
        }
      }
      
      // Process each item to add default values and calculate fields
      if (normalizedData.output.items && normalizedData.output.items.length > 0) {
        normalizedData.output.items = normalizedData.output.items.map(item => {
          // Get the include_ppn value first
          const includePpn = safeGet(normalizedData, 'output.include_ppn.value', false);
          
          // Set default BKP based on include_ppn setting
          if (!item.bkp) {
            // When include_ppn is true, BKP should be true by default
            // When include_ppn is false, BKP should be false by default
            item.bkp = { value: includePpn, is_confident: true };
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
          const bkpValue = safeGet(item, 'bkp.value', includePpn); // Default BKP to follow include_ppn
          
          let ppnValue = 0;
          
          if (bkpValue === true) {
            // If BKP is true, calculate PPN based on include_ppn setting
            if (includePpn) {
              // If include_ppn is true, PPN is already included in netto amount
              ppnValue = Math.round(jumlahNetto * (ppnRate / (100 + ppnRate)));
            } else {
              // If include_ppn is false, PPN is additional
              ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
            }
          } else {
            // If BKP is false, PPN is always 0
            ppnValue = 0;
          }
          
          if (!item.ppn) {
            item.ppn = { value: ppnValue, is_confident: true };
          } else {
            item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
          }
          
          return item;
        });
      }
      
      setEditableData(normalizedData);
    }
  }, [data]);

  // Utility function to calculate PPN for an item
  const calculatePPN = (item, includePpn, ppnRate) => {
    // Check if item is BKP
    const bkpValue = safeGet(item, 'bkp.value', false);
    if (!bkpValue) {
      return 0; // If not BKP, PPN is always 0
    }
    
    // Get jumlah_netto
    const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0)) || 0;
    
    // Calculate PPN based on include_ppn setting
    if (includePpn) {
      // If include_ppn is true, PPN is already included in netto amount
      return Math.round(jumlahNetto * (ppnRate / (100 + ppnRate)));
    } else {
      // If include_ppn is false, PPN is additional
      return Math.round(jumlahNetto * (ppnRate / 100));
    }
  };

  // Add the missing handleHeaderChange function
  const handleHeaderChange = (field, value) => {
    
    setEditableData(prevData => {
      if (!prevData || !prevData.output) {
        return prevData;
      }
      
      const newData = { ...prevData };
      
      // Handle special case fields first
      if (field === 'include_ppn') {
        // This is handled by handleIncludePPNChange
        return prevData;
      }
      
      // Update the field in output
      if (!newData.output[field]) {
        newData.output[field] = { value: value, is_confident: true };
      } else {
        newData.output[field] = { ...newData.output[field], value: value, is_confident: true };
      }
      
      // Special handling for PPN rate changes - recalculate PPN for all items
      if (field === 'ppn_rate' && newData.output.items && Array.isArray(newData.output.items)) {
        console.log(`PPN rate changed to ${value}, recalculating PPN for all items`);
        
        const ppnRate = parseFloat(value) || 11;
        const includePpn = safeGet(newData, 'output.include_ppn.value', false);
        
        // Update PPN for all items
        newData.output.items = newData.output.items.map(item => {
          const updatedItem = { ...item };
          const ppnValue = calculatePPN(updatedItem, includePpn, ppnRate);
          
          if (!updatedItem.ppn) {
            updatedItem.ppn = { value: ppnValue, is_confident: true };
          } else {
            updatedItem.ppn = { ...updatedItem.ppn, value: ppnValue, is_confident: true };
          }
          
          return updatedItem;
        });
      }
      
      return newData;
    });
  };

  // Update search status for an item
  const updateSearchStatus = useCallback((itemIndex, status) => {
    setSearchStatus(prev => ({
      ...prev,
      [itemIndex]: status
    }));
  }, []);
  
  // Store the function in the ref
  functionRefs.current.updateSearchStatus = updateSearchStatus;

  // Function to update product data in the current item
  const updateProductDataInItem = useCallback((product, itemIndex, unitInfo = null) => {
    if (!product || !editableData || !editableData.output || !editableData.output.items) {
      return;
    }
    
    setEditableData(prevData => {
      // Clone the data to avoid direct state mutation
      const newData = { ...prevData };
      const items = [...newData.output.items];
      
      // Clone the item at the index
      if (!items[itemIndex]) return prevData;
      const item = { ...items[itemIndex] };
      
      // Update item with product data
      item.kode_barang_main = {
        value: product.Kode_Item || '',
        confidence: 1
      };
      
      item.nama_barang_main = {
        value: product.Nama_Item || '',
        confidence: 1
      };
      
      // Update the satuan_main object with the selected unit info if provided
      if (unitInfo && unitInfo.selectedUnit) {
        const { selectedUnit, baseUnit, matchReason } = unitInfo;
        
        item.satuan_main = {
          value: selectedUnit.name,
          confidence: 1,
          conversion: selectedUnit.conversion,
          isBaseUnit: selectedUnit.isBaseUnit,
          matchReason: matchReason,
          baseUnit: baseUnit.name
        };
        
        // If we have invoice quantity, calculate base unit equivalent
        const invoiceQty = parseFloat(safeGet(item, 'jumlah.value', '0')) || 0;
        if (invoiceQty > 0 && selectedUnit.conversion) {
          item.jumlah_base = {
            value: (invoiceQty * selectedUnit.conversion).toString(),
            confidence: 1
          };
        }
        
        // Find price for the selected unit if available
        if (product.Prices && Array.isArray(product.Prices)) {
          const matchingPrice = product.Prices.find(
            p => p.Nama_Satuan.toLowerCase() === selectedUnit.name.toLowerCase()
          );
          
          if (matchingPrice) {
            item.harga_dasar_main = {
              value: matchingPrice.Harga_Pokok || '0',
              confidence: 1,
              previous: matchingPrice.Harga_Pokok_Lama || '0'
            };
          }
        }
      } else {
        // Basic satuan_main update if no unit info provided
        item.satuan_main = {
          value: safeGet(item, 'satuan.value', '') || 'PCS',
          confidence: 0.5
        };
      }
      
      // Update the items array with the modified item
      items[itemIndex] = item;
      newData.output.items = items;
      
      // Trigger onDataChange if provided
      if (onDataChange) {
        onDataChange(newData);
      }
      
      return newData;
    });
  }, [editableData, onDataChange]);
  
  // Store the function in the ref
  functionRefs.current.updateProductDataInItem = updateProductDataInItem;

  // Memoize the search function to prevent dependency issues
  const searchProductByInvoiceCode = useCallback(async (invoiceCode, itemIndex) => {
    
    if (!invoiceCode) {
      console.warn(`OCRResultsTable: Empty invoice code for item ${itemIndex}`);
      functionRefs.current.updateSearchStatus(itemIndex, 'notfound');
      return;
    }
    
    // Skip if we already have this product in cache
    if (productCache.current[invoiceCode]) {
      functionRefs.current.updateProductDataInItem(productCache.current[invoiceCode], itemIndex);
      functionRefs.current.updateSearchStatus(itemIndex, 'found');
      return;
    }
    
    // Update search status to loading
    functionRefs.current.updateSearchStatus(itemIndex, 'loading');
    
    try {
      // Get the current item data (use ref to break dependency)
      const currentItem = { ...(editableData?.output?.items?.[itemIndex] || {}) };
      const invoiceUnitName = safeGet(currentItem, 'satuan.value', '').trim().toLowerCase();
      const invoicePrice = parseFloat(safeGet(currentItem, 'harga_satuan.value', '0')) || 0;
      
      
      // Search by supplier code
      const product = await productItemApi.getProductBySupplierCode(invoiceCode);
      
      if (!product) {
        console.warn(`OCRResultsTable: No product found with supplier code ${invoiceCode}`);
        functionRefs.current.updateSearchStatus(itemIndex, 'notfound');
        return;
      }
      

      
      // Add to product cache
      productCache.current[invoiceCode] = product;
      
      // Collect supplier unit information
      const supplierUnits = {};
      const availableUnits = [];
      
      if (product.Units && Array.isArray(product.Units)) {
        product.Units.forEach(unit => {
          // Add to available units
          availableUnits.push({
            name: unit.Nama_Satuan,
            conversion: unit.Nilai_Konversi || 1,
            isBaseUnit: unit.Is_Base === 1
          });
          
          // Map supplier units if available
          if (unit.Satuan_Supplier) {
            supplierUnits[unit.Satuan_Supplier.toLowerCase()] = {
              mainUnit: unit.Nama_Satuan,
              conversion: unit.Nilai_Konversi || 1,
              isBaseUnit: unit.Is_Base === 1
            };
          }
        });
      }
      
      // Add any additional supplier units from the separate mapping if available
      if (product.supplier_units && typeof product.supplier_units === 'object') {
        Object.entries(product.supplier_units).forEach(([supplierUnit, mainUnit]) => {
          supplierUnits[supplierUnit.toLowerCase()] = {
            mainUnit: typeof mainUnit === 'string' ? mainUnit : mainUnit.mainUnit,
            conversion: typeof mainUnit === 'string' ? 1 : (mainUnit.conversion || 1),
            isBaseUnit: typeof mainUnit === 'string' ? false : (mainUnit.isBaseUnit || false)
          };
        });
      }
      
      // Build unit prices map
      const unitPrices = {};
      if (product.Prices && Array.isArray(product.Prices)) {
        product.Prices.forEach(price => {
          unitPrices[price.Nama_Satuan.toLowerCase()] = parseFloat(price.Harga_Pokok) || 0;
        });
      } else if (product.unit_prices && typeof product.unit_prices === 'object') {
        // Format: unit_prices object from API
        Object.entries(product.unit_prices).forEach(([unit, price]) => {
          unitPrices[unit.toLowerCase()] = parseFloat(price);
        });
      } else {
        // Format: prices inside unit objects
        if (Array.isArray(product.units) && typeof product.units[0] === 'object') {
          product.units.forEach(unit => {
            if (unit.prices && Array.isArray(unit.prices) && unit.prices.length > 0) {
              unitPrices[unit.Nama_Satuan.toLowerCase()] = parseFloat(unit.prices[0].Harga_Pokok || 0);
            }
          });
        }
      }
      
      
      // Priority-based unit selection
      let selectedUnit = null;
      let matchReason = '';
      
      // 1. Direct mapping from supplier units
      if (invoiceUnitName && supplierUnits[invoiceUnitName]) {
        const mainUnitName = supplierUnits[invoiceUnitName].mainUnit;
        // Find the full unit info from availableUnits
        const unitInfo = availableUnits.find(u => u.name.toLowerCase() === mainUnitName.toLowerCase());
        
        if (unitInfo) {
          selectedUnit = unitInfo;
        } else {
          selectedUnit = {
            name: mainUnitName,
            conversion: supplierUnits[invoiceUnitName].conversion,
            isBaseUnit: supplierUnits[invoiceUnitName].isBaseUnit
          };
        }
        
        matchReason = 'Exact supplier unit match';

      }
      
      // Continue with existing priority checks if no match yet...
      // 2. Match based on price if we have invoice price
      if (!selectedUnit && invoicePrice > 0) {
        // Calculate price difference percentage for each unit
        const priceMatches = Object.entries(unitPrices).map(([unitName, unitPrice]) => {
          const priceDiff = Math.abs(invoicePrice - unitPrice);
          const percentageDiff = unitPrice > 0 ? (priceDiff / unitPrice) * 100 : 100;
          
          // Find the corresponding unit in availableUnits
          const unitInfo = availableUnits.find(u => u.name.toLowerCase() === unitName.toLowerCase());
          
          return {
            unitName,
            unitPrice,
            percentageDiff,
            conversion: unitInfo?.conversion || 1,
            isBaseUnit: unitInfo?.isBaseUnit || false
          };
        });
        
        // Sort by percentage difference
        priceMatches.sort((a, b) => a.percentageDiff - b.percentageDiff);
        
        // Use the closest price match if within 20% threshold
        if (priceMatches.length > 0 && priceMatches[0].percentageDiff <= 20) {
          const bestMatch = priceMatches[0];
          
          // Find the full unit info in availableUnits
          const unitInfo = availableUnits.find(u => u.name.toLowerCase() === bestMatch.unitName.toLowerCase());
          
          if (unitInfo) {
            selectedUnit = unitInfo;
          } else {
            selectedUnit = {
              name: bestMatch.unitName,
              conversion: bestMatch.conversion,
              isBaseUnit: bestMatch.isBaseUnit
            };
          }
          
          matchReason = `Price match (${bestMatch.percentageDiff.toFixed(2)}% difference)`;
        }
      }
      
      // 3. Check previously confirmed mappings in the user preferences
      if (!selectedUnit && invoiceUnitName) {
        // This would ideally check a user preference store for previously confirmed mappings
        // For now, it's a placeholder for future implementation
      }
      
      // 4. Use the first available unit with a price as fallback
      if (!selectedUnit) {
        const unitWithPrice = Object.keys(unitPrices)[0];
        if (unitWithPrice) {
          const unitInfo = availableUnits.find(u => u.name.toLowerCase() === unitWithPrice.toLowerCase());
          if (unitInfo) {
            selectedUnit = {
              name: unitInfo.name,
              conversion: unitInfo.conversion,
              isBaseUnit: unitInfo.isBaseUnit
            };
            matchReason = 'First unit with price';
          }
        }
      }
      
      // 5. Last resort: use fuzzy text matching if still no match
      if (!selectedUnit && invoiceUnitName) {
        // Simple similarity check (could be improved with proper fuzzy matching)
        let bestSimilarity = 0;
        let bestMatch = null;
        
        availableUnits.forEach(unit => {
          // Simple character-based similarity (can be replaced with better algorithm)
          const similarity = calculateStringSimilarity(
            invoiceUnitName.toLowerCase(),
            unit.name.toLowerCase()
          );
          
          if (similarity > bestSimilarity && similarity > 0.5) { // 50% threshold
            bestSimilarity = similarity;
            bestMatch = unit;
          }
        });
        
        if (bestMatch) {
          selectedUnit = {
            name: bestMatch.name,
            conversion: bestMatch.conversion,
            isBaseUnit: bestMatch.isBaseUnit
          };
          matchReason = `Text similarity (${(bestSimilarity * 100).toFixed(2)}%)`;
        }
      }
      
      // 6. Last resort: Use the base unit or first unit
      if (!selectedUnit) {
        const baseUnit = availableUnits.find(u => u.isBaseUnit);
        if (baseUnit) {
          selectedUnit = {
            name: baseUnit.name,
            conversion: baseUnit.conversion,
            isBaseUnit: baseUnit.isBaseUnit
          };
          matchReason = 'Base unit fallback';
          
        } else if (availableUnits.length > 0) {
          selectedUnit = {
            name: availableUnits[0].name,
            conversion: availableUnits[0].conversion,
            isBaseUnit: availableUnits[0].isBaseUnit
          };
          matchReason = 'First available unit';
          
        }
      }
      
      // If we still don't have a unit, create a basic one
      if (!selectedUnit && invoiceUnitName) {
        selectedUnit = {
          name: invoiceUnitName,
          conversion: 1,
          isBaseUnit: true
        };
        matchReason = 'Created from invoice';
        
      }
      
      // Process the product data using function from ref
      if (functionRefs.current.updateProductDataInItem) {
        if (selectedUnit) {
          
          
          // Base unit information for conversion calculations
          const baseUnit = availableUnits.find(u => u.isBaseUnit) || {
            name: selectedUnit.name,
            conversion: 1,
            isBaseUnit: true
          };
          
          // Update the product data in the item
          functionRefs.current.updateProductDataInItem(product, itemIndex, {
            selectedUnit,
            baseUnit,
            matchReason
          });
          
          functionRefs.current.updateSearchStatus(itemIndex, 'found');
        } else {
          console.warn(`OCRResultsTable: Could not determine unit for item ${itemIndex} with code ${invoiceCode}`);
          functionRefs.current.updateProductDataInItem(product, itemIndex);
          functionRefs.current.updateSearchStatus(itemIndex, 'found');
        }
      }
    } catch (error) {
      console.error(`OCRResultsTable: Error searching for product ${invoiceCode}:`, error);
      functionRefs.current.updateSearchStatus(itemIndex, 'error');
    }
  }, [editableData, productCache]); // Minimal dependencies
  
  // Store the function in the ref
  functionRefs.current.searchProductByInvoiceCode = searchProductByInvoiceCode;

  // Function to preprocess items and initialize product data
  const preprocessItems = useCallback((data) => {
    if (!data || !data.output || !data.output.items || !data.output.items.length) {
      return;
    }
    
    
    // Create a batch of items to process
    const itemsToProcess = data.output.items.filter(item => {
      const invoiceCode = safeGet(item, 'kode_barang.value', '');
      return invoiceCode && !productCache.current[invoiceCode];
    });
    
    // If no items to process, return early
    if (!itemsToProcess.length) {
      return;
    }
    
    // For each item with a kode_barang, trigger a search using ref
    data.output.items.forEach((item, index) => {
      const invoiceCode = safeGet(item, 'kode_barang.value', '');
      
      if (invoiceCode) {
        
        
        // Add to pending searches
        setPendingSearches(prev => ({
          ...prev,
          [index]: invoiceCode
        }));
        
        // Trigger search for product data using function from ref
        if (functionRefs.current.searchProductByInvoiceCode) {
          setTimeout(() => {
            functionRefs.current.searchProductByInvoiceCode(invoiceCode, index);
          }, 0);
        }
      }
    });
  }, [productCache]); // Only one dependency
  
  // Store the function in the ref
  functionRefs.current.preprocessItems = preprocessItems;

  // Completely revised lookup useEffect to be more robust
  useEffect(() => {
    if (!editableData?.output?.items) return;
    
    // Skip if already processing
    if (isProcessingRef.current) {
      return;
    }
    
    const processItems = async () => {
      // Set processing flag
      isProcessingRef.current = true;
      
      try {
        // Find items that need lookup by checking missing kode_barang_main
        const itemsToProcess = [];
        
        editableData.output.items.forEach((item, index) => {
          // Check if this item needs lookup
          const invoiceCode = safeGet(item, 'kode_barang_invoice.value', '') || 
                             safeGet(item, 'kode_barang.value', '');
          
          const hasMainCode = !!safeGet(item, 'kode_barang_main.value', '');
          const isProcessed = processedItemIndices.current.has(index);
          
          
          if (invoiceCode && !hasMainCode && !isProcessed) {
            
            itemsToProcess.push({
              index,
              code: invoiceCode
            });
          }
        });
        
       
        
        if (itemsToProcess.length === 0) {
          isProcessingRef.current = false;
          return;
        }
        
        // Process items with delay between each
        for (let i = 0; i < itemsToProcess.length; i++) {
          const item = itemsToProcess[i];
          
          // Mark as processed BEFORE starting the lookup
          processedItemIndices.current.add(item.index);
          
          // Process with delay between items
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          try {
            await simplifiedProductLookup(item.code, item.index);
          } catch (error) {
            console.error(`OCRResultsTable: Error processing item ${item.index}:`, error);
          }
        }
      } finally {
        // Always clear processing flag
        isProcessingRef.current = false;
      }
    };
    
    // Start processing
    processItems();
    
  }, [editableData?.output?.items]);

  const handleDeleteItem = (index) => {
    
    // Use functional state update
    setEditableData(prevData => {
      // Skip if no data
      if (!prevData || !prevData.output || !prevData.output.items) {
        return prevData;
      }
      
      // Clone the data
      const newData = { ...prevData };
      
      // Remove the item at specified index
      newData.output.items = newData.output.items.filter((_, idx) => idx !== index);
      
      return newData;
    });
    
    // Remove the index from processed items tracking
    processedItemIndices.current.delete(index);
    
    // Adjust processedItemIndices for items after the deleted index
    const adjustedIndices = new Set();
    processedItemIndices.current.forEach(idx => {
      if (idx < index) {
        adjustedIndices.add(idx);
      } else if (idx > index) {
        // Decrement index for items that were after the deleted item
        adjustedIndices.add(idx - 1);
      }
    });
    
    // Replace the previous set with the adjusted one
    processedItemIndices.current.clear();
    adjustedIndices.forEach(idx => processedItemIndices.current.add(idx));
    
    // Remove search status for this index
    setSearchStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[index];
      
      // Adjust keys for items after the deleted index
      Object.keys(newStatus).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          newStatus[keyIndex - 1] = newStatus[keyIndex];
          delete newStatus[keyIndex];
        }
      });
      
      return newStatus;
    });
  };

  // Completely revised simplifiedProductLookup function
  const simplifiedProductLookup = async (invoiceCode, itemIndex) => {
    
    if (!invoiceCode) {
      console.warn(`OCRResultsTable: Empty invoice code for lookup at index ${itemIndex}`);
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'empty'
      }));
      return;
    }
    
    // Validate item index
    if (itemIndex === undefined || itemIndex === null || itemIndex < 0) {
      console.error(`OCRResultsTable: Invalid item index ${itemIndex} for lookup`);
      return;
    }
    
    // Set loading status
    setSearchStatus(prev => {
      return { ...prev, [itemIndex]: 'loading' };
    });
    
    // Log item info for debugging purposes
    try {
      const currentItem = editableData?.output?.items?.[itemIndex];
      if (currentItem && currentItem.satuan && currentItem.satuan.value) {
        // We're no longer checking for preserve flag
        // Just log that we found a unit in case needed for debugging
      }
    } catch (e) {
      console.error('Error checking unit:', e);
    }
    
    // Check cache first
    if (productCache.current[invoiceCode]) {
      
      
      try {
        // Apply cached product data, respecting manual unit selection
        await mapProductToItem(itemIndex, productCache.current[invoiceCode], 'cached');

        return true;
      } catch (error) {
        console.error(`OCRResultsTable: Error applying cached product:`, error);
      }
    }
    
    try {

      
      // Call API to get product data
      const response = await productItemApi.getProductBySupplierCode(invoiceCode);
      
      // Extract product from response
      let product = null;
      
      if (response && response.success === true && response.data) {
        // Standard API response with success flag
        product = Array.isArray(response.data) ? response.data[0] : response.data;
      } else if (response && response.ID_Produk) {
        // Direct product object
        product = response;
      } else if (Array.isArray(response) && response.length > 0) {
        // Array of products
        product = response[0];
      } else if (response && typeof response === 'object') {
        // Direct response object
        product = response;
      }
      
      // Handle case where no product is found
      if (!product) {
        console.warn(`OCRResultsTable: No product found for ${invoiceCode}`);
        setSearchStatus(prev => ({ ...prev, [itemIndex]: 'notfound' }));
        return false;
      }
      
      // Verbose logging for debugging

      // Add to cache for future use
      productCache.current[invoiceCode] = product;
      
      // Map product data to the item
      const success = await mapProductToItem(itemIndex, product, 'success');
      
      return success;
    } catch (error) {
      setSearchStatus(prev => ({ ...prev, [itemIndex]: 'error' }));
      return false;
    }
  };

  // Improved mapProductToItem with better structure
  const mapProductToItem = (itemIndex, product, status = 'success') => {
    return new Promise((resolve, reject) => {
      if (!product) {
        console.warn(`OCRResultsTable: No product data to map for item ${itemIndex}`);
        setSearchStatus(prev => ({ ...prev, [itemIndex]: 'error' }));
        reject(new Error('No product data available'));
        return;
      }
      
      
      setEditableData(prevData => {
        try {
          // Validate item exists
          if (!prevData?.output?.items?.[itemIndex]) {
            console.warn(`OCRResultsTable: Item at index ${itemIndex} no longer exists`);
            reject(new Error('Item no longer exists'));
            return prevData;
          }
          
          // Create deep clone to avoid mutation issues
          const newData = JSON.parse(JSON.stringify(prevData));
          const item = newData.output.items[itemIndex];
          
          // Store the entire product object for future reference
          item.product = product;
          
          // EXTRACT PRODUCT CODE with fallbacks
          const mainCode = product.Kode_Item || 
                        product.kode_main || 
                        product.product_code || 
                        product.kode_item ||
                        product.code ||
                        '';
          
          // EXTRACT PRODUCT NAME with fallbacks
          const mainName = product.Nama_Item || 
                        product.nama_main ||
                        product.product_name ||
                        product.nama_item ||
                        product.name ||
                        '';
          
          
          // Update the core fields
          item.kode_barang_main = {
            value: mainCode,
            is_confident: !!mainCode
          };
          
          item.nama_barang_main = {
            value: mainName,
            is_confident: !!mainName
          };
          
          // Extract available units from various possible formats
          let availableUnits = [];
          
          // Try multiple unit sources
          if (product.Units && Array.isArray(product.Units)) {
            availableUnits = product.Units.map(u => {
              if (typeof u === 'string') return { name: u, conversion: 1, isBaseUnit: false };
              return {
                name: u.Nama_Satuan || u.nama || '',
                conversion: u.Nilai_Konversi || 1,
                isBaseUnit: u.Is_Base === 1
              };
            }).filter(u => u.name);
          } else if (product.units && Array.isArray(product.units)) {
            availableUnits = product.units.map(u => {
              if (typeof u === 'string') return { name: u, conversion: 1, isBaseUnit: false };
              return {
                name: u.Nama_Satuan || u.nama || '',
                conversion: u.Nilai_Konversi || 1,
                isBaseUnit: u.Is_Base === 1
              };
            }).filter(u => u.name);
          }
          
          // Fallback to common unit fields if array not found
          if (availableUnits.length === 0) {
            const unitValue = product.unit || 
                             product.satuan || 
                             product.satuan_main || 
                             safeGet(item, 'satuan.value', '') ||
                             'PCS';
            
            if (unitValue) {
              availableUnits = [{ name: unitValue, conversion: 1, isBaseUnit: true }];
            }
          }
          
          
          // Extract unit prices from various sources
          const unitPrices = {};
          
          // Try to find price data in different formats
          if (product.Prices && Array.isArray(product.Prices)) {
            product.Prices.forEach(p => {
              if (p.Nama_Satuan) {
                unitPrices[p.Nama_Satuan.toLowerCase()] = parseFloat(p.Harga_Pokok) || 0;
              }
            });
          } else if (product.unit_prices && typeof product.unit_prices === 'object') {
            Object.entries(product.unit_prices).forEach(([unit, price]) => {
              unitPrices[unit.toLowerCase()] = parseFloat(price);
            });
          }
          
          
          // Find the invoice unit name
          const invoiceUnitName = safeGet(item, 'satuan.value', '').trim();
          
          // Regular flow - use best unit
          const bestUnit = availableUnits.length > 0 ? availableUnits[0].name : 'PCS';
          
          item.satuan_main = {
            value: bestUnit,
            is_confident: availableUnits.length > 0,
            available_units: availableUnits,
            unit_prices: unitPrices,
            invoice_unit: invoiceUnitName
          };
          
          
          // Try to find price for the selected unit
          let basePrice = 0;
          const bestUnitLower = bestUnit.toLowerCase();
          
          if (unitPrices[bestUnitLower]) {
            basePrice = unitPrices[bestUnitLower];
          } else {
            // Try case-insensitive search
            const unitKey = Object.keys(unitPrices).find(
              key => key.toLowerCase() === bestUnitLower
            );
            
            if (unitKey) {
              basePrice = unitPrices[unitKey];
            }
          }
          
          // Set base price
          item.harga_dasar_main = {
            value: basePrice,
            is_confident: basePrice > 0
          };
          
          
          // Calculate price differences if we have invoice price
          const invoicePrice = parseFloat(safeGet(item, 'harga_satuan.value', 0)) || 0;
          if (item.harga_dasar_main.value > 0 && invoicePrice > 0) {
            const basePrice = parseFloat(item.harga_dasar_main.value);
            const priceDiff = invoicePrice - basePrice;
            const diffPercent = (priceDiff / basePrice) * 100;
            
            item.perbedaan_rp = {
              value: priceDiff,
              is_confident: true
            };
            
            item.perbedaan_persen = {
              value: diffPercent,
              is_confident: true
            };
            
          }
          
          // Return updated data
          setTimeout(() => {
            setSearchStatus(prev => ({ ...prev, [itemIndex]: status }));
            resolve(true);
          }, 10);
          
          return newData;
        } catch (error) {
          console.error(`OCRResultsTable: Error mapping product to item ${itemIndex}:`, error);
          setTimeout(() => {
            setSearchStatus(prev => ({ ...prev, [itemIndex]: 'error' }));
            reject(error);
          }, 10);
          return prevData;
        }
      });
    });
  };

  const handleAddItem = () => {
    
    // Use functional state update
    setEditableData(prevData => {
      // Skip if no data
      if (!prevData || !prevData.output) {
        return prevData;
      }
      
      // Clone the data
      const newData = { ...prevData };
      
      // Ensure items array exists
      if (!newData.output.items) {
        newData.output.items = [];
      }
      
      // Get include_ppn value for correct PPN calculation
      const includePpn = safeGet(newData, 'output.include_ppn.value', false);
      const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
      
      // Create empty item with all required fields
      const newItem = {
        kode_barang_invoice: { value: '', is_confident: true },
        nama_barang_invoice: { value: '', is_confident: true },
        qty: { value: 0, is_confident: true },
        satuan: { value: '', is_confident: true },
        harga_satuan: { value: 0, is_confident: true },
        diskon_persen: { value: 0, is_confident: true },
        diskon_rp: { value: 0, is_confident: true },
        jumlah_netto: { value: 0, is_confident: true },
        harga_bruto: { value: 0, is_confident: true },
        bkp: { value: true, is_confident: true },
        ppn: { value: 0, is_confident: true },
          
        // Database fields
        kode_barang_main: { value: '', is_confident: true, from_database: true },
        nama_barang_main: { value: '', is_confident: true, from_database: true },
        satuan_main: { value: '', is_confident: true, from_database: true },
        harga_jual_main: { value: 0, is_confident: true, from_database: true },
        harga_dasar_main: { value: 0, is_confident: true, from_database: true },
        margin_persen: { value: 0, is_confident: true, from_database: true }
      };
      
      // Add the new item
      newData.output.items.push(newItem);

      return newData;
    });
  };

  // Add the missing renderBooleanField function
  const renderBooleanField = (data, onChange, options = ['Ya', 'Tidak']) => {
    return (
      <BooleanField
        data={data}
        onChange={onChange}
        options={options}
      />
    );
  };

  // Add the missing renderDatePicker function
  const renderDatePicker = (data, onChange) => {
    const bgColorClass = getCellBackgroundColor(data);
    
    // Convert the value to a date format
    let dateValue = '';
    if (data.value) {
      try {
        if (typeof data.value === 'string') {
          // Assume ISO format or other standard date format
          dateValue = data.value;
        } else if (data.value instanceof Date) {
          // Convert Date object to string
          dateValue = data.value.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }
    
    return (
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-none p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded text-sm ${bgColorClass}`}
      />
    );
  };

  // Add the missing handleBKPChange function
  const handleBKPChange = (rowIndex, value) => {
    
    setEditableData(prevData => {
      // Skip if no data
      if (!prevData || !prevData.output || !prevData.output.items) {
        return prevData;
      }
      
      // Skip if invalid index
      if (!prevData.output.items[rowIndex]) {
          return prevData;
      }
      
      // Clone the data
      const newData = { ...prevData };
      const items = [...newData.output.items];
      
      // Clone the item to avoid direct mutation
      const item = { ...items[rowIndex] };
      
      // Get include_ppn setting
      const includePpn = safeGet(newData, 'output.include_ppn.value', false);
      
      // Always allow manual override of BKP value
      if (!item.bkp) {
        item.bkp = { value: value, is_confident: true };
      } else {
        item.bkp = { ...item.bkp, value: value, is_confident: true };
      }
      
      // Update PPN using our utility function
      const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
      const ppnValue = calculatePPN(item, includePpn, ppnRate);
      
      // Update PPN value
      if (!item.ppn) {
        item.ppn = { value: ppnValue, is_confident: true };
      } else {
        item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
      }
      
      // Update the item in the array
      items[rowIndex] = item;
      newData.output.items = items;
      
      return newData;
    });
  };

  // Add the missing handleIncludePPNChange function
  const handleIncludePPNChange = (value) => {
    console.log(`Changing Include PPN to: ${value}`);
    
    setEditableData(prevData => {
      if (!prevData || !prevData.output) {
        return prevData;
      }
      
      const newData = { ...prevData };
      
      // Make sure we set is_confident to true for proper background color
      newData.output.include_ppn = { 
        value: value, 
        is_confident: true,  // Ensure this is explicitly set to true
        from_database: false // Make sure this isn't accidentally set to true
      };
      console.log(`Updated include_ppn field with value: ${value}, is_confident: true`);
      
      // Get PPN rate
      const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
      console.log(`Using PPN rate: ${ppnRate}%`);
      
      // Update all items based on the new include_ppn value
      if (newData.output.items && Array.isArray(newData.output.items)) {
        console.log(`Updating ${newData.output.items.length} items for include_ppn=${value}`);
        
        // Create a new array of items to ensure React detects the change
        newData.output.items = newData.output.items.map(item => {
          // Create a new item object to avoid mutation
          const updatedItem = { ...item };
          
          // When include_ppn is changed, force BKP to match
          const newBkpValue = value; // true when include_ppn=true, false when include_ppn=false
          
          // Update BKP value
          if (!updatedItem.bkp) {
            updatedItem.bkp = { value: newBkpValue, is_confident: true };
          } else {
            updatedItem.bkp = { ...updatedItem.bkp, value: newBkpValue, is_confident: true };
          }
          
          // Get jumlah_netto for PPN calculation
          const jumlahNetto = parseFloat(safeGet(updatedItem, 'jumlah_netto.value', 0)) || 0;
          
          // Calculate PPN based on BKP status (not include_ppn)
          let ppnValue = calculatePPN(updatedItem, value, ppnRate);
          
          // Update PPN value
          if (!updatedItem.ppn) {
            updatedItem.ppn = { value: ppnValue, is_confident: true };
          } else {
            updatedItem.ppn = { ...updatedItem.ppn, value: ppnValue, is_confident: true };
          }
          
          return updatedItem;
        });
      }
      
      return newData;
    });
  };

  // Add the missing handleProductCellClick function
  const handleProductCellClick = (field, rowIndex) => {
    console.log(`Product cell clicked: ${field}, row: ${rowIndex}`);
    
    // Store the active cell info - make sure to use the correct property names
    // The dropdown expects 'rowIndex', not 'index'
    setActiveCell({
      field,
      rowIndex,
      type: field  // Add type to match the expected structure
    });
    console.log('Active cell set to:', { field, rowIndex, type: field });
    
    // Find the cell DOM element for positioning
    const cellId = `cell-${field}-${rowIndex}`;
    const cellElement = document.getElementById(cellId);
    
    if (cellElement) {
      activeCellRef.current = cellElement;
      console.log('Active cell element found:', cellId);
      
      // Open the product search dropdown
      setDropdownOpen(true);
      console.log('Product search dropdown opened');
    } else {
      console.warn(`OCRResultsTable: Could not find cell element with ID ${cellId}`);
    }
  };

  // Add the missing handleUnitChange function
  const handleUnitChange = (rowIndex, selectedUnitName) => {
    
    
    setEditableData(prevData => {
      if (!prevData || !prevData.output || !prevData.output.items || !prevData.output.items[rowIndex]) {
        return prevData;
      }
      
      const newData = { ...prevData };
      const items = [...newData.output.items];
      const item = { ...items[rowIndex] };
      
      // Get the full satuan_main object with all metadata
      const satuan_main = { ...item.satuan_main };
      
      // Store previous value for logging
      const previousValue = satuan_main.value || '';
      
      // Only proceed if the value is actually changing
      if (previousValue === selectedUnitName) {
        console.log(`OCRResultsTable: Unit not changed (${previousValue})`);
        return prevData;
      }
      
      console.log(`OCRResultsTable: Changing unit from ${previousValue} to ${selectedUnitName}`);
      
      // Update the satuan_main value
      satuan_main.value = selectedUnitName;
      satuan_main.is_confident = true;
      
      // Also update the supplier_unit to mark this as a manual mapping
      if (item.satuan && item.satuan.value) {
        const supplierUnit = item.satuan.value;
        satuan_main.supplier_unit = supplierUnit;
        
        // Store in previous_mapping for future reference
        if (!satuan_main.previous_mapping) {
          satuan_main.previous_mapping = {};
        }
        satuan_main.previous_mapping[supplierUnit] = selectedUnitName;
      }
      
      // Apply the updated satuan_main back to the item
      item.satuan_main = satuan_main;

      // Build unit prices map from different possible sources
      let unitPrices = {};
      
      // Try different sources for unit prices
      if (satuan_main.unit_prices && typeof satuan_main.unit_prices === 'object') {
        unitPrices = { ...satuan_main.unit_prices };
      } else if (item.product && item.product.Prices && Array.isArray(item.product.Prices)) {
        item.product.Prices.forEach(price => {
          unitPrices[price.Nama_Satuan.toLowerCase()] = parseFloat(price.Harga_Pokok) || 0;
        });
      } else if (item.product && item.product.unit_prices) {
        unitPrices = { ...item.product.unit_prices };
      }
      
      // Find the price for the selected unit
      const selectedUnitLower = selectedUnitName.toLowerCase();
      let basePrice = 0;
      
      // First try exact match
      if (unitPrices[selectedUnitLower]) {
        basePrice = parseFloat(unitPrices[selectedUnitLower]);
      } else if (unitPrices[selectedUnitName]) {
        basePrice = parseFloat(unitPrices[selectedUnitName]);
      } else {
        // Try case-insensitive search
        const unitKey = Object.keys(unitPrices).find(
          k => k.toLowerCase() === selectedUnitLower
        );
        
        if (unitKey) {
          basePrice = parseFloat(unitPrices[unitKey]);
        }
      }
      
      // Update harga_dasar_main with the new price
      if (basePrice > 0) {
        if (!item.harga_dasar_main) {
          item.harga_dasar_main = { value: basePrice, is_confident: true };
        } else {
          item.harga_dasar_main = { ...item.harga_dasar_main, value: basePrice, is_confident: true };
        }
        
        // Calculate price differences if harga_satuan exists
        const supplierPrice = parseFloat(safeGet(item, 'harga_satuan.value', 0)) || 0;
        
        if (supplierPrice > 0) {
          // Calculate difference
          const priceDiff = supplierPrice - basePrice;
          const diffPercent = basePrice > 0 ? (priceDiff / basePrice) * 100 : 0;
          
          // Update perbedaan_rp
          if (!item.perbedaan_rp) {
            item.perbedaan_rp = { value: priceDiff, is_confident: true };
          } else {
            item.perbedaan_rp = { ...item.perbedaan_rp, value: priceDiff, is_confident: true };
          }
          
          // Update perbedaan_persen
          if (!item.perbedaan_persen) {
            item.perbedaan_persen = { value: diffPercent, is_confident: true };
          } else {
            item.perbedaan_persen = { ...item.perbedaan_persen, value: diffPercent, is_confident: true };
          }
        }
      }
      
      // Update conversion factors if available
      if (satuan_main.available_units) {
        let unitInfo = null;
        
        // Handle different formats of available_units
        if (Array.isArray(satuan_main.available_units)) {
          if (satuan_main.available_units.length > 0) {
            // Check if the items are objects or strings
            if (typeof satuan_main.available_units[0] === 'object' && satuan_main.available_units[0].name) {
              // Format: [{name: "PCS", conversion: 1, ...}, ...]
              unitInfo = satuan_main.available_units.find(u => 
                u.name.toLowerCase() === selectedUnitName.toLowerCase()
              );
            } else if (typeof satuan_main.available_units[0] === 'string') {
              // Format: ["PCS", "BOX", ...] - use default conversion 1
              const unitExists = satuan_main.available_units.some(u => 
                u.toLowerCase() === selectedUnitName.toLowerCase()
              );
              
              if (unitExists) {
                unitInfo = { name: selectedUnitName, conversion: 1, isBaseUnit: false };
              }
            }
          }
        }
        
        if (unitInfo) {
          satuan_main.conversion = unitInfo.conversion || 1;
          satuan_main.isBaseUnit = unitInfo.isBaseUnit || false;
          
          // Recalculate base unit quantity if we have invoice quantity
          const invoiceQty = parseFloat(safeGet(item, 'jumlah.value', '0')) || 0;
          if (invoiceQty > 0 && unitInfo.conversion) {
            if (!item.jumlah_base) {
              item.jumlah_base = { 
                value: (invoiceQty * unitInfo.conversion).toString(),
                is_confident: true
              };
            } else {
              item.jumlah_base = { 
                ...item.jumlah_base,
                value: (invoiceQty * unitInfo.conversion).toString(),
                is_confident: true
              };
            }
          }
        } else {
          // Default conversions if unit info not found
          satuan_main.conversion = 1;
          satuan_main.isBaseUnit = false;
        }
      }
      
      // Update the item in the items array
      items[rowIndex] = item;
      newData.output.items = items;
      
      // Trigger onDataChange if provided
      if (onDataChange) {
        onDataChange(newData);
      }
      
      return newData;
    });
  };

  // Add the missing handleItemChange function
  const handleItemChange = (rowIndex, field, value) => {
    
    
    // Use functional state update to avoid race conditions
    setEditableData(prevData => {
      // Skip update if no data
      if (!prevData || !prevData.output || !prevData.output.items) {
        return prevData;
      }
      
      // Clone the data
      const newData = { ...prevData };
      const items = [...newData.output.items];
      
      // Skip if invalid index
      if (!items[rowIndex]) {
        console.error(`OCRResultsTable: Invalid item index: ${rowIndex}`);
        return prevData;
      }
      
      // Clone the item to avoid direct mutation
      const item = { ...items[rowIndex] };
      
      // Handle invoice code changes - this is important for triggering lookups
      if (field === 'kode_barang_invoice') {
        const invoiceCode = String(value || '').trim();
        
        // Update the field
        if (!item[field]) {
          item[field] = { value: invoiceCode, is_confident: true };
        } else {
          item[field] = { ...item[field], value: invoiceCode, is_confident: true };
        }
        
        // Clear previous product lookup results when code changes
        if (item.kode_barang_main && item.kode_barang_main.value) {
          
          
          // Clear main product fields
          item.kode_barang_main = { value: '', is_confident: false };
          item.nama_barang_main = { value: '', is_confident: false };
          item.satuan_main = { value: '', is_confident: false };
          item.harga_dasar_main = { value: 0, is_confident: false };
          
          // Remove this index from processedItemIndices to allow re-processing
          if (processedItemIndices.current.has(rowIndex)) {
            processedItemIndices.current.delete(rowIndex);
          }
        }
        
        // Only trigger lookup if code is not empty and valid
        if (invoiceCode && invoiceCode.length >= 2) {
          // Use setTimeout to avoid blocking UI
          setTimeout(() => {
            
            
            // Only look up if not already being processed
            if (!processedItemIndices.current.has(rowIndex)) {
              
              processedItemIndices.current.add(rowIndex);
              simplifiedProductLookup(invoiceCode, rowIndex);
            } else {
            
            }
          }, 300);
        }
      } else {
        // Default handling for other fields
        if (typeof item[field] === 'object') {
          item[field] = { ...item[field], value: value, is_confident: true };
        } else {
          item[field] = { value: value, is_confident: true };
        }
        
        // Special handling for satuan changes - update satuan_main when satuan changes directly
        if (field === 'satuan') {
          
          // Get the new unit
          const newUnit = String(value || '').trim();
          
          // Only update if we have a valid unit
          if (newUnit) {
            // If satuan_main exists, update it to match
            if (item.satuan_main) {
              // Store the previous satuan_main value for reference
              const previousSatuanMain = item.satuan_main.value || '';
              
              // Create updated satuan_main with the new value
              item.satuan_main = {
                ...item.satuan_main,
                value: newUnit,
                is_confident: true,
                // Store this as the new supplier unit
                supplier_unit: newUnit,
                // Store in previous_mapping for future reference
                previous_mapping: {
                  ...(item.satuan_main.previous_mapping || {}),
                  [newUnit]: newUnit // Self-mapping for direct match
                }
              };
              
              console.log(`OCRResultsTable: Updated satuan_main from "${previousSatuanMain}" to "${newUnit}" (from satuan change)`);
            } else {
              // Create a new satuan_main if it doesn't exist
              item.satuan_main = {
                value: newUnit,
                is_confident: true,
                supplier_unit: newUnit,
                previous_mapping: {
                  [newUnit]: newUnit
                }
              };
              
              console.log(`OCRResultsTable: Created new satuan_main with value "${newUnit}" (from satuan change)`);
            }
            
            // If we have unit prices, update price information
            if (item.satuan_main.unit_prices && typeof item.satuan_main.unit_prices === 'object') {
              const unitPrices = item.satuan_main.unit_prices;
              const newUnitLower = newUnit.toLowerCase();
              let basePrice = 0;
              
              // Try to find matching price
              if (unitPrices[newUnitLower]) {
                basePrice = parseFloat(unitPrices[newUnitLower]);
              } else {
                // Try case-insensitive search
                const priceKey = Object.keys(unitPrices).find(
                  k => k.toLowerCase() === newUnitLower
                );
                
                if (priceKey) {
                  basePrice = parseFloat(unitPrices[priceKey]);
                }
              }
              
              // Update price if found
              if (basePrice > 0) {
                if (!item.harga_dasar_main) {
                  item.harga_dasar_main = { value: basePrice, is_confident: true };
                } else {
                  item.harga_dasar_main = { ...item.harga_dasar_main, value: basePrice, is_confident: true };
                }
                
                // Also update price differences
                const supplierPrice = parseFloat(safeGet(item, 'harga_satuan.value', 0)) || 0;
                if (supplierPrice > 0) {
                  const priceDiff = supplierPrice - basePrice;
                  const diffPercent = basePrice > 0 ? (priceDiff / basePrice) * 100 : 0;
                  
                  // Update difference fields
                  if (!item.perbedaan_rp) {
                    item.perbedaan_rp = { value: priceDiff, is_confident: true };
                  } else {
                    item.perbedaan_rp = { ...item.perbedaan_rp, value: priceDiff, is_confident: true };
                  }
                  
                  if (!item.perbedaan_persen) {
                    item.perbedaan_persen = { value: diffPercent, is_confident: true };
                  } else {
                    item.perbedaan_persen = { ...item.perbedaan_persen, value: diffPercent, is_confident: true };
                  }
                }
              }
            }
          }
        }
        
        // Special handling for calculated fields
        if (field === 'qty' || field === 'harga_satuan') {
          // Update harga_bruto (qty * harga_satuan)
          const qty = parseFloat(safeGet(item, 'qty.value', 0)) || 0;
          const hargaSatuan = parseFloat(safeGet(item, 'harga_satuan.value', 0)) || 0;
          
          if (!isNaN(qty) && !isNaN(hargaSatuan)) {
            const hargaBruto = qty * hargaSatuan;
            
            if (!item.harga_bruto) {
              item.harga_bruto = { value: hargaBruto, is_confident: true };
            } else {
              item.harga_bruto = { ...item.harga_bruto, value: hargaBruto, is_confident: true };
            }
            
            // Update diskon_rp if diskon_persen exists
            const diskonPersen = parseFloat(safeGet(item, 'diskon_persen.value', 0)) || 0;
            if (!isNaN(diskonPersen) && diskonPersen > 0) {
              // Calculate with 2 decimal precision instead of rounding to integer
              // This allows small percentage discounts to be properly represented
              const diskonRp = parseFloat((hargaBruto * (diskonPersen / 100)).toFixed(2));
              
              if (!item.diskon_rp) {
                item.diskon_rp = { value: diskonRp, is_confident: true };
              } else {
                item.diskon_rp = { ...item.diskon_rp, value: diskonRp, is_confident: true };
              }
            }
            
            // No longer update jumlah_netto based on discount and hargaBruto
            // Keep PPN calculations based on existing jumlah_netto
            const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0)) || 0;
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Use our utility function to calculate PPN
              const ppnValue = calculatePPN(item, safeGet(newData, 'output.include_ppn.value', false), ppnRate);
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        } else if (field === 'jumlah_netto') {
          // Direct update to jumlah_netto - recalculate PPN
          // Get PPN rate from parent
          const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
          // Get include_ppn setting
          const includePpn = safeGet(newData, 'output.include_ppn.value', false);
          
          // Update PPN using utility function - will check BKP status internally
          const ppnValue = calculatePPN(item, includePpn, ppnRate);
          
          if (!item.ppn) {
            item.ppn = { value: ppnValue, is_confident: true };
          } else {
            item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
          }
        } else if (field === 'diskon_persen') {
          // Update diskon_rp based on percentage
          const diskonPersen = parseFloat(value) || 0;
          const hargaBruto = parseFloat(safeGet(item, 'harga_bruto.value', 0)) || 0;
          
          if (!isNaN(diskonPersen) && !isNaN(hargaBruto)) {
            // Calculate with 2 decimal precision instead of rounding to integer
            // This allows small percentage discounts to be properly represented
            const diskonRp = parseFloat((hargaBruto * (diskonPersen / 100)).toFixed(2));
            
            if (!item.diskon_rp) {
              item.diskon_rp = { value: diskonRp, is_confident: true };
            } else {
              item.diskon_rp = { ...item.diskon_rp, value: diskonRp, is_confident: true };
            }
            
            // No longer update jumlah_netto based on discount
            // Keep PPN calculations based on existing jumlah_netto
            const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0)) || 0;
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Use our utility function to calculate PPN
              const ppnValue = calculatePPN(item, safeGet(newData, 'output.include_ppn.value', false), ppnRate);
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        } else if (field === 'diskon_rp') {
          // Update diskon_persen based on amount (if harga_bruto > 0)
          const diskonRp = parseFloat(value) || 0;
          const hargaBruto = parseFloat(safeGet(item, 'harga_bruto.value', 0)) || 0;
          
          if (!isNaN(diskonRp) && !isNaN(hargaBruto) && hargaBruto > 0) {
            // Calculate percentage with precision and round to 2 decimal places
            const diskonPersen = parseFloat(((diskonRp / hargaBruto) * 100).toFixed(2));
            
            if (!item.diskon_persen) {
              item.diskon_persen = { value: diskonPersen, is_confident: true };
            } else {
              item.diskon_persen = { ...item.diskon_persen, value: diskonPersen, is_confident: true };
            }
            
            // No longer update jumlah_netto based on discount
            // Keep PPN calculations based on existing jumlah_netto
            const jumlahNetto = parseFloat(safeGet(item, 'jumlah_netto.value', 0)) || 0;
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Use our utility function to calculate PPN
              const ppnValue = calculatePPN(item, safeGet(newData, 'output.include_ppn.value', false), ppnRate);
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        }

        // If we're updating harga_satuan and we have a base price, update the differences
        if (field === 'harga_satuan') {
          const basePrice = parseFloat(safeGet(item, 'harga_dasar_main.value', 0)) || 0;
          const supplierPrice = parseFloat(value) || 0;
          
          if (basePrice > 0 && supplierPrice > 0) {
            // Calculate difference
            const priceDiff = supplierPrice - basePrice;
            const diffPercent = (priceDiff / basePrice) * 100;
            
            // Update perbedaan_rp
            if (!item.perbedaan_rp) {
              item.perbedaan_rp = { value: priceDiff, is_confident: true };
            } else {
              item.perbedaan_rp = { ...item.perbedaan_rp, value: priceDiff, is_confident: true };
            }
            
            // Update perbedaan_persen
            if (!item.perbedaan_persen) {
              item.perbedaan_persen = { value: diffPercent, is_confident: true };
            } else {
              item.perbedaan_persen = { ...item.perbedaan_persen, value: diffPercent, is_confident: true };
            }
          }
        }
        }
        
        // Update the item in the array
      items[rowIndex] = item;
        newData.output.items = items;
        
        return newData;
      });
  };

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

      {/* Items Table - Pass new handlers */}
      <ItemsTable
        editableData={editableData}
        handleItemChange={handleItemChange}
        searchStatus={searchStatus}
        handleProductCellClick={handleProductCellClick}
        handleUnitChange={handleUnitChange}
        handleBKPChange={handleBKPChange}
        // Pass the new handlers
        onAddItem={handleAddItem} 
        onDeleteItem={handleDeleteItem}
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