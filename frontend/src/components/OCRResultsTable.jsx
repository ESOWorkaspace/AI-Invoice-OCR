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
  const [productCache, setProductCache] = useState({});
  
  // Track processed invoice codes to avoid redundant searches
  const processedInvoiceCodes = useRef(new Set()).current;
  
  // Add a ref to track if initial data was processed
  const initialDataProcessed = useRef(false);
  
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
          const includePpn = safeGet(normalizedData, 'output.include_ppn.value', false);
          
          if (bkpValue === true) {
            let ppnValue;
            
            // If include_ppn is true, VAT is already included in netto amount
            // so we calculate it as a portion of the netto amount
            if (includePpn) {
              ppnValue = Math.round(jumlahNetto * (ppnRate / (100 + ppnRate)));
            } else {
              // If include_ppn is false, calculate VAT as additional
              ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
            }
            
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
    console.log(`OCRResultsTable: Searching for product with code: ${invoiceCode} for item ${itemIndex}`);
    
    if (!invoiceCode) {
      console.warn(`OCRResultsTable: Empty invoice code for item ${itemIndex}`);
      functionRefs.current.updateSearchStatus(itemIndex, 'notfound');
      return;
    }
    
    // Skip if we already have this product in cache
    if (productCache[invoiceCode]) {
      console.log(`OCRResultsTable: Using cached product data for ${invoiceCode}`);
      functionRefs.current.updateProductDataInItem(productCache[invoiceCode], itemIndex);
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
      
      console.log(`OCRResultsTable: Item ${itemIndex} info:`, {
        invoiceCode,
        invoiceUnitName,
        invoicePrice
      });
      
      // Search by supplier code
      const product = await productItemApi.getProductBySupplierCode(invoiceCode);
      
      if (!product) {
        console.warn(`OCRResultsTable: No product found with supplier code ${invoiceCode}`);
        functionRefs.current.updateSearchStatus(itemIndex, 'notfound');
        return;
      }
      
      console.log(`OCRResultsTable: Found product:`, product);
      
      // Add to product cache
      setProductCache(prev => ({ ...prev, [invoiceCode]: product }));
      
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
      
      // Build unit prices map
      const unitPrices = {};
      if (product.Prices && Array.isArray(product.Prices)) {
        product.Prices.forEach(price => {
          unitPrices[price.Nama_Satuan.toLowerCase()] = parseFloat(price.Harga_Jual) || 0;
        });
      }
      
      console.log(`OCRResultsTable: Unit mapping info:`, {
        supplierUnits,
        availableUnits,
        unitPrices,
        invoiceUnitName
      });
      
      // Priority-based unit selection
      let selectedUnit = null;
      let matchReason = '';
      
      // 1. Direct mapping from supplier units
      if (invoiceUnitName && supplierUnits[invoiceUnitName]) {
        selectedUnit = {
          name: supplierUnits[invoiceUnitName].mainUnit,
          conversion: supplierUnits[invoiceUnitName].conversion,
          isBaseUnit: supplierUnits[invoiceUnitName].isBaseUnit
        };
        matchReason = 'Exact supplier unit match';
        console.log(`OCRResultsTable: Found exact supplier unit match: ${invoiceUnitName} → ${selectedUnit.name}`);
      }
      
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
          selectedUnit = {
            name: bestMatch.unitName,
            conversion: bestMatch.conversion,
            isBaseUnit: bestMatch.isBaseUnit
          };
          matchReason = `Price match (${bestMatch.percentageDiff.toFixed(2)}% difference)`;
          console.log(`OCRResultsTable: Found unit by price match: ${bestMatch.unitName} with price ${bestMatch.unitPrice} (${bestMatch.percentageDiff.toFixed(2)}% diff from invoice price ${invoicePrice})`);
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
            console.log(`OCRResultsTable: Using first unit with price: ${unitInfo.name}`);
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
          console.log(`OCRResultsTable: Found unit by text similarity: ${bestMatch.name} (${(bestSimilarity * 100).toFixed(2)}% similar to ${invoiceUnitName})`);
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
          console.log(`OCRResultsTable: Using base unit as fallback: ${baseUnit.name}`);
        } else if (availableUnits.length > 0) {
          selectedUnit = {
            name: availableUnits[0].name,
            conversion: availableUnits[0].conversion,
            isBaseUnit: availableUnits[0].isBaseUnit
          };
          matchReason = 'First available unit';
          console.log(`OCRResultsTable: Using first available unit: ${availableUnits[0].name}`);
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
        console.log(`OCRResultsTable: Created unit from invoice: ${invoiceUnitName}`);
      }
      
      // Process the product data using function from ref
      if (functionRefs.current.updateProductDataInItem) {
        if (selectedUnit) {
          console.log(`OCRResultsTable: Selected unit for item ${itemIndex}: ${selectedUnit.name} (${matchReason})`);
          
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
    
    console.log('OCRResultsTable: Preprocessing items for unit mapping');
    
    // Create a batch of items to process
    const itemsToProcess = data.output.items.filter(item => {
      const invoiceCode = safeGet(item, 'kode_barang.value', '');
      return invoiceCode && !productCache[invoiceCode];
    });
    
    // If no items to process, return early
    if (!itemsToProcess.length) {
      return;
    }
    
    // For each item with a kode_barang, trigger a search using ref
    data.output.items.forEach((item, index) => {
      const invoiceCode = safeGet(item, 'kode_barang.value', '');
      
      if (invoiceCode) {
        console.log(`OCRResultsTable: Pre-loading product data for item ${index} with code ${invoiceCode}`);
        
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

  // Effect to initialize data when data changes - only run once
  useEffect(() => {
    // Only do this once when the component mounts or data changes
    const dataInitializationKey = JSON.stringify({
      hasData: !!data,
      itemCount: data?.output?.items?.length || 0
    });
    
    if (data) {
      // Normalize data fields and initialize editableData
      const normalizedData = {
        output: {
          ...data.output,
          items: (data.output.items || []).map((item, index) => ({
            ...item,
            // Add a unique id for each item if not exists
            id: item.id || `item-${index}`,
            // Ensure all required fields exist with proper structure
            kode_barang: ensureField(item.kode_barang),
            nama_barang: ensureField(item.nama_barang),
            kode_barang_main: ensureField(item.kode_barang_main),
            nama_barang_main: ensureField(item.nama_barang_main),
            jumlah: ensureField(item.jumlah),
            satuan: ensureField(item.satuan),
            satuan_main: ensureField(item.satuan_main),
            harga_satuan: ensureField(item.harga_satuan),
            harga_total: ensureField(item.harga_total),
            diskon: ensureField(item.diskon, '0'), // Default to 0
            harga_diskon: ensureField(item.harga_diskon),
            harga_dasar_main: ensureField(item.harga_dasar_main)
          }))
        }
      };
      
      setEditableData(normalizedData);
      
      // Initialize search status for all items
      const initialSearchStatus = {};
      (normalizedData.output.items || []).forEach((item, index) => {
        initialSearchStatus[index] = 'pending';
      });
      setSearchStatus(initialSearchStatus);
      
      if (onDataChange) {
        onDataChange(normalizedData);
      }
    }
  }, [data?.id, data?.output?.id]); // Only depend on data id, not the entire object

  // Add a new useEffect for initial product lookup processing that runs after data is loaded
  useEffect(() => {
    // Only run once when first loaded with data
    if (editableData?.output?.items?.length > 0 && !initialDataProcessed.current) {
      console.log('OCRResultsTable: Running initial product lookup for newly loaded data');
      
      // Process all items with invoice codes
      const processInitialItems = async () => {
        const itemsWithCodes = [];
        
        // Find all items with invoice codes
        editableData.output.items.forEach((item, index) => {
          const invoiceCode = safeGet(item, 'kode_barang_invoice.value', '') || 
                             safeGet(item, 'kode_barang.value', '');
                           
          if (invoiceCode && !safeGet(item, 'kode_barang_main.value', '')) {
            itemsWithCodes.push({
              index,
              code: invoiceCode
            });
          }
        });
        
        // Log items being processed
        console.log(`OCRResultsTable: Found ${itemsWithCodes.length} items with invoice codes for initial lookup`);
        
        // Process items with staggered lookups to avoid overwhelming API
        for (let i = 0; i < itemsWithCodes.length; i++) {
          const item = itemsWithCodes[i];
          console.log(`OCRResultsTable: Looking up product for item ${item.index} with code ${item.code}`);
          
          // Wait a bit between lookups
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          try {
            // Use the simplified lookup function instead
            await simplifiedProductLookup(item.code, item.index);
          } catch (error) {
            console.error(`OCRResultsTable: Error processing item ${item.index}:`, error);
          }
        }
        
        // Mark as processed
        initialDataProcessed.current = true;
        console.log('OCRResultsTable: Initial product lookup completed');
      };
      
      // Start processing
      processInitialItems();
    }
  }, [editableData?.output?.items]);

  // Handle item change
  const handleItemChange = (rowIndex, field, value) => {
    console.log(`OCRResultsTable: Item change - row ${rowIndex}, field ${field}, value:`, value);
    
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
        
        // Only trigger lookup if code is not empty and doesn't already have a main code
        if (invoiceCode && !safeGet(item, 'kode_barang_main.value', '')) {
          // Schedule lookup with slight delay to avoid blocking UI
          setTimeout(() => {
            console.log(`OCRResultsTable: Triggering lookup for new invoice code: ${invoiceCode}`);
            
            // Create a unique key for this lookup
            const lookupKey = `${rowIndex}-${invoiceCode}`;
            
            // Only lookup if not already processed
            if (!processedInvoiceCodes.has(lookupKey)) {
              processedInvoiceCodes.add(lookupKey);
              // Use simplified lookup for more consistent behavior
              simplifiedProductLookup(invoiceCode, rowIndex);
            } else {
              console.log(`OCRResultsTable: Skipping duplicate lookup for ${invoiceCode}`);
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
              const diskonRp = Math.round(hargaBruto * (diskonPersen / 100));
              
              if (!item.diskon_rp) {
                item.diskon_rp = { value: diskonRp, is_confident: true };
              } else {
                item.diskon_rp = { ...item.diskon_rp, value: diskonRp, is_confident: true };
              }
            }
            
            // Calculate netto amount
            const diskonRp = parseFloat(safeGet(item, 'diskon_rp.value', 0)) || 0;
            const jumlahNetto = Math.max(0, hargaBruto - diskonRp);
            
            if (!item.jumlah_netto) {
              item.jumlah_netto = { value: jumlahNetto, is_confident: true };
            } else {
              item.jumlah_netto = { ...item.jumlah_netto, value: jumlahNetto, is_confident: true };
            }
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Calculate PPN
              const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        } else if (field === 'diskon_persen') {
          // Update diskon_rp based on percentage
          const diskonPersen = parseFloat(value) || 0;
          const hargaBruto = parseFloat(safeGet(item, 'harga_bruto.value', 0)) || 0;
          
          if (!isNaN(diskonPersen) && !isNaN(hargaBruto)) {
            const diskonRp = Math.round(hargaBruto * (diskonPersen / 100));
            
            if (!item.diskon_rp) {
              item.diskon_rp = { value: diskonRp, is_confident: true };
            } else {
              item.diskon_rp = { ...item.diskon_rp, value: diskonRp, is_confident: true };
            }
            
            // Recalculate netto and PPN
            const jumlahNetto = Math.max(0, hargaBruto - diskonRp);
            
            if (!item.jumlah_netto) {
              item.jumlah_netto = { value: jumlahNetto, is_confident: true };
            } else {
              item.jumlah_netto = { ...item.jumlah_netto, value: jumlahNetto, is_confident: true };
            }
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Calculate PPN
              const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        } else if (field === 'diskon_rp') {
          // Recalculate netto and PPN
          const diskonRp = parseFloat(value) || 0;
          const hargaBruto = parseFloat(safeGet(item, 'harga_bruto.value', 0)) || 0;
          
          if (!isNaN(diskonRp) && !isNaN(hargaBruto)) {
            // Calculate netto amount
            const jumlahNetto = Math.max(0, hargaBruto - diskonRp);
            
            if (!item.jumlah_netto) {
              item.jumlah_netto = { value: jumlahNetto, is_confident: true };
            } else {
              item.jumlah_netto = { ...item.jumlah_netto, value: jumlahNetto, is_confident: true };
            }
            
            // Update PPN if BKP is true
            const bkpValue = safeGet(item, 'bkp.value', true);
            if (bkpValue === true) {
              // Get PPN rate from parent
              const ppnRate = parseFloat(safeGet(newData, 'output.ppn_rate.value', 11));
              // Calculate PPN
              const ppnValue = Math.round(jumlahNetto * (ppnRate / 100));
              
              if (!item.ppn) {
                item.ppn = { value: ppnValue, is_confident: true };
              } else {
                item.ppn = { ...item.ppn, value: ppnValue, is_confident: true };
              }
            }
          }
        }
      }
      
      // Update the item in the array
      items[rowIndex] = item;
      newData.output.items = items;
      
      // Call onDataChange
      if (onDataChange) {
        onDataChange(newData);
      }
      
      return newData;
    });
  };

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
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">No Invoice:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false }), (value) => handleHeaderChange('nomor_referensi', value))}
                        </td>
                      </tr>
                    )}
                    {safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false }) && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Supplier:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false }), (value) => handleHeaderChange('nama_supplier', value))}
                        </td>
                      </tr>
                    )}
                    {/* Conditionally render document type field */}
                    {safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false }).value && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Tipe Dokumen:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false }), (value) => handleHeaderChange('tipe_dokumen', value))}
                        </td>
                      </tr>
                    )}
                    
                    {/* Conditionally render payment type field */}
                    {safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false }).value && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Tipe Pembayaran:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false }), (value) => handleHeaderChange('tipe_pembayaran', value))}
                        </td>
                      </tr>
                    )}
                    {safeGet(editableData, 'output.salesman', { value: '', is_confident: false }) && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Salesman:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.salesman', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.salesman', { value: '', is_confident: false }), (value) => handleHeaderChange('salesman', value))}
                        </td>
                      </tr>
                    )}
                    {safeGet(editableData, 'output.include_ppn', { value: '', is_confident: false }) && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r">Include PPN:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.include_ppn', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderBooleanField(
                            safeGet(editableData, 'output.include_ppn', { value: true, is_confident: true }),
                            (value) => handleIncludePPNChange(value)
                          )}
                        </td>
                      </tr>
                    )}
                    {safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }) && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r">PPN Rate:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r ${getCellBackgroundColor(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false })) || 'bg-white'}`}>
                          {renderEditableCell(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }), (value) => handleHeaderChange('ppn_rate', value))}
                          <span className="hidden">{JSON.stringify(safeGet(editableData, 'output.ppn_rate', { value: '', is_confident: false }))}</span>
                        </td>
                      </tr>
                    )}
                    {safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false }) && (
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r">Margin Threshold:</td>
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r ${getCellBackgroundColor(safeGet(editableData, 'output.margin_threshold', { value: '', is_confident: false })) || 'bg-white'}`}>
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
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 border-r relative ${column.sticky ? 'sticky z-10' : ''}`}
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
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Total Harga Bruto:</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-r border-gray-50 bg-white">
                        {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'harga_bruto.value', 0)), 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Total Diskon Rp:</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-r border-gray-50 bg-white">
                        {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'diskon_rp.value', 0)), 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">Total Jumlah Netto:</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-r border-gray-50 bg-white">
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
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b  border-r border-gray-50">Total PPN:</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b  border-r border-gray-50 bg-white">
                        {formatCurrency(safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'ppn.value', 0)), 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-r border-gray-50">
                        {safeGet(editableData, 'output.include_ppn.value', false) ? 'Total (PPN Termasuk):' : 'Total (PPN Ditambahkan):'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-r border-gray-50 bg-white font-bold">
                        {formatCurrency(
                          safeGet(editableData, 'output.include_ppn.value', false)
                            ? safeGet(editableData, 'output.items', []).reduce((sum, item) => sum + parseNumber(safeGet(item, 'jumlah_netto.value', 0)), 0)
                            : safeGet(editableData, 'output.items', []).reduce((sum, item) => 
                            sum + parseNumber(safeGet(item, 'jumlah_netto.value', 0)) + parseNumber(safeGet(item, 'ppn.value', 0)), 0)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b  border-r border-gray-50">Total Margin Rp:</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b  border-r border-gray-50 bg-white">
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
                className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 border-b  border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
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
                className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-b  border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
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
                className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-b  border-r border-gray-50 ${column.sticky ? 'sticky z-10' : ''}`}
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
              className={`${cellClass} border-b  border-r border-gray-50`}
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
    // Get the cell data
    const cellData = item[columnId];

    // Early return for undefined cell data
    if (!cellData) {
      return null;
    }

    // Handle special cell types
    if (columnId === 'kode_barang_main' || columnId === 'nama_barang_main') {
      // Product search cell - custom handling with search popup
      const cellValue = safeGet(cellData, 'value', '');
      const isConfident = safeGet(cellData, 'is_confident', true) !== false;
      const searchState = searchStatus[rowIndex] || 'idle';
      const disabled = searchState === 'loading';
      
      let backgroundColor = 'bg-white';
      if (!isConfident) {
        backgroundColor = 'bg-orange-50';
      }
      if (!cellValue) {
        backgroundColor = 'bg-red-50';
      }
      
      return (
        <div 
          className={`w-full h-full min-h-[38px] flex items-center rounded-md border border-gray-300 text-gray-800 px-3 cursor-pointer ${backgroundColor}`}
          onClick={() => {
            // Handle product search cell click
            if (handleProductCellClick && !disabled) {
              handleProductCellClick(rowIndex);
            }
          }}
        >
          {searchState === 'loading' ? (
            <div className="animate-pulse flex items-center">
              <div className="w-full bg-gray-200 h-4 rounded"></div>
            </div>
          ) : (
            <span className="truncate">{cellValue}</span>
          )}
        </div>
      );
    } else if (columnId === 'satuan_main') {
      // Unit select field - render as dropdown
      const value = safeGet(cellData, 'value', '');
      const availableUnits = safeGet(cellData, 'available_units', []);
      const isConfident = safeGet(cellData, 'is_confident', true) !== false;
      
      let backgroundColor = 'bg-white';
      if (!isConfident) {
        backgroundColor = 'bg-orange-50';
      }
      if (!value) {
        backgroundColor = 'bg-red-50';
      }
      
      console.log(`OCRResultsTable: Rendering unit dropdown for row ${rowIndex}:`, {
        value,
        availableUnits,
        cellData
      });
      
      return (
        <select 
          value={value}
          onChange={(e) => {
            // Handle unit change special handler
            if (handleUnitChange) {
              handleUnitChange(rowIndex, e.target.value);
            } else {
              onChange(e.target.value);
            }
          }}
          className={`w-full rounded-md border border-gray-300 text-gray-800 px-3 py-2 ${backgroundColor}`}
        >
          {!value && <option value="">Select Unit</option>}
          {availableUnits.map((unit, index) => (
            <option key={`unit-${index}-${unit}`} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      );
    }
    
    // Default rendering for other cell types...
    // ...
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

  // Handle unit change and update related prices
  const handleUnitChange = useCallback((rowIndex, newUnit) => {
    // Create a deep copy to avoid mutation issues
    const newData = JSON.parse(JSON.stringify(editableData));
    
    // Validate data structure
    if (!newData?.output?.items || !Array.isArray(newData.output.items)) {
      return;
    }
    
    // Validate row index
    if (rowIndex < 0 || rowIndex >= newData.output.items.length) {
      return;
    }
    
    const item = newData.output.items[rowIndex];
    if (!item) {
      return;
    }
    
    if ('satuan_main' in item) {
      // Store the previous unit
      const prevUnit = item.satuan_main.value;
      
      // Get unit prices if they exist
      const unitPrices = item.satuan_main.unit_prices || {};
      const availableUnits = item.satuan_main.available_units || [];
      
      // Get supplier unit information
      let supplierUnit = item.satuan_main.supplier_unit || '';
      
      // If we have a mapping of supplier units, get the one for the new unit
      if (item.satuan_main.supplier_units && typeof item.satuan_main.supplier_units === 'object') {
        supplierUnit = item.satuan_main.supplier_units[newUnit] || '';
      }
      
      // Only update if the unit is actually changing
      if (prevUnit !== newUnit) {
        // Update the unit value, preserving supplier_unit information
        item.satuan_main = {
          ...item.satuan_main,
          value: newUnit,
          is_confident: true,
          supplier_unit: supplierUnit // Maintain supplier unit information
        };
        
        // Check if we need to update the base price based on the selected unit
        if ('harga_dasar_main' in item && unitPrices && Object.keys(unitPrices).length > 0) {
          // Get the price for this unit
          if (newUnit in unitPrices) {
            const newBasePrice = parseFloat(unitPrices[newUnit]) || 0;
            const oldBasePrice = parseFloat(item.harga_dasar_main.value) || 0;
            
            // Update the base price
            item.harga_dasar_main = {
              ...item.harga_dasar_main,
              value: newBasePrice,
              is_confident: true
            };
            
            // Update margins if needed
            if ('margin_persen' in item && 'harga_jual_main' in item) {
              const hargaJual = parseFloat(item.harga_jual_main.value) || 0;
              if (hargaJual > 0 && newBasePrice > 0) {
                const marginPersen = ((hargaJual - newBasePrice) / newBasePrice) * 100;
                const marginRp = hargaJual - newBasePrice;
                
                // Update margin values
                item.margin_persen = {
                  ...item.margin_persen,
                  value: marginPersen,
                  is_confident: true
                };
                
                item.margin_rp = {
                  ...item.margin_rp,
                  value: marginRp,
                  is_confident: true
                };
              }
            }
          } else {
            // Use fallback price if available
            if (Object.keys(unitPrices).length > 0) {
              const firstUnit = Object.keys(unitPrices)[0];
              const fallbackPrice = parseFloat(unitPrices[firstUnit]) || 0;
              
              // Update with fallback price
              item.harga_dasar_main = {
                ...item.harga_dasar_main,
                value: fallbackPrice,
                is_confident: true
              };
            }
          }
        }
        
        // Update the data
        setEditableData(newData);
        
        // Notify parent component
        if (onDataChange) {
          onDataChange(newData);
        }
      }
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

  // --- Handlers for ItemsTable Add/Delete ---
  const handleAddItem = () => {
    console.log("OCRResultsTable: handleAddItem called");
    const newData = JSON.parse(JSON.stringify(editableData)); // Deep copy
    if (!newData.output) newData.output = { items: [] }; // Ensure output and items exist
    if (!newData.output.items) newData.output.items = [];

    const newItem = {
      id: `new_${Date.now()}`,
      kode_barang_invoice: { value: '', is_confident: true },
      nama_barang_invoice: { value: '', is_confident: true },
      qty: { value: 0, is_confident: true },
      satuan: { value: '', is_confident: true },
      harga_satuan: { value: 0, is_confident: true },
      harga_bruto: { value: 0, is_confident: true },
      diskon_persen: { value: 0, is_confident: true },
      diskon_rp: { value: 0, is_confident: true },
      jumlah_netto: { value: 0, is_confident: true },
      bkp: { value: true, is_confident: true }, // Default BKP to true
      ppn: { value: 0, is_confident: true },
      // Add default database-related fields expected by ItemsTable
      kode_barang_main: { value: "", is_confident: true, from_database: true },
      nama_barang_main: { value: "", is_confident: true, from_database: true },
      satuan_main: { value: "", is_confident: true, from_database: true, available_units: [], unit_prices: {}, supplier_unit: '' }, // Ensure structure
      harga_jual_main: { value: 0, is_confident: true, from_database: true },
      harga_dasar_main: { value: 0, is_confident: true, from_database: true },
      margin_persen: { value: 0, is_confident: true, from_database: true },
      margin_rp: { value: 0, is_confident: true, from_database: true },
      kenaikan_persen: { value: 0, is_confident: true, from_database: true },
      kenaikan_rp: { value: 0, is_confident: true, from_database: true },
      perbedaan_persen: { value: 0, is_confident: true }, // Add calculated fields if needed by table
      perbedaan_rp: { value: 0, is_confident: true },
    };

    newData.output.items.push(newItem);

    setEditableData(newData);
    if (onDataChange) {
      console.log("OCRResultsTable: Calling onDataChange after add");
      onDataChange(newData);
    }
  };

  const handleDeleteItem = (index) => {
    console.log(`OCRResultsTable: handleDeleteItem called for index ${index}`);
    const newData = JSON.parse(JSON.stringify(editableData)); // Deep copy
    if (!newData.output || !newData.output.items || index < 0 || index >= newData.output.items.length) {
      console.warn(`OCRResultsTable: Invalid index (${index}) or items array for delete.`);
      return; // Safety check
    }

    newData.output.items.splice(index, 1); // Remove item at index

    setEditableData(newData);
    if (onDataChange) {
      console.log("OCRResultsTable: Calling onDataChange after delete");
      onDataChange(newData);
    }
  };

  // Add a direct product lookup function that doesn't rely on refs
  const directProductLookup = async (invoiceCode, itemIndex) => {
    console.log(`OCRResultsTable: Looking up product code ${invoiceCode} for item ${itemIndex}`);
    
    // Check if code already exists
    if (!invoiceCode) {
      console.log(`OCRResultsTable: Empty product code lookup`);
      return;
    }
    
    // Check if already searching this index
    if (searchStatus[itemIndex] === 'searching' || searchStatus[itemIndex] === 'loading') {
      console.log(`OCRResultsTable: Already searching for item ${itemIndex}`);
      return;
    }
    
    // Update the search status for this item
    setSearchStatus(prev => ({
      ...prev,
      [itemIndex]: 'searching'
    }));
    
    try {
      console.log(`OCRResultsTable: Calling API for invoice code ${invoiceCode}`);
      
      // Get product based on supplier code
      const response = await productItemApi.getProductBySupplierCode(invoiceCode);
      
      console.log(`OCRResultsTable: API response for ${invoiceCode}:`, response);
      
      // Extract product data based on response format
      let product = null;
      
      if (response && response.success === true && response.data) {
        // Format: { success: true, data: {...} }
        product = response.data;
      } else if (response && response.ID_Produk) {
        // Format: Direct product object
        product = response;
      } else if (response && Array.isArray(response) && response.length > 0) {
        // Format: Array of products
        product = response[0];
      }
      
      if (!product) {
        console.warn(`OCRResultsTable: No product found for ${invoiceCode}`);
        setSearchStatus(prev => ({
          ...prev,
          [itemIndex]: 'not_found'
        }));
        return;
      }
      
      console.log(`OCRResultsTable: Found product:`, product);
      
      // Add supplier_units if missing and enhance existing mappings
      if (!product.supplier_units && Array.isArray(product.units || product.Units)) {
        const units = product.units || product.Units || [];
        console.log(`OCRResultsTable: Creating supplier_units mapping for units:`, units);
        
        product.supplier_units = {};
        // Create a simple 1:1 mapping where each unit maps to itself
        units.forEach(unit => {
          // Handle both string and object units
          const unitName = typeof unit === 'string' ? unit : (unit.Nama_Satuan || unit.nama || '');
          if (unitName) {
            product.supplier_units[unitName] = unitName;
          }
        });
        
        // Enhance with invoice unit mappings
        setEditableData(prevData => {
          if (!prevData.output?.items?.[itemIndex]) return prevData;
          const supplierUnit = safeGet(prevData.output.items[itemIndex], 'satuan.value', '');
          
          if (supplierUnit) {
            const normalizedSupplierUnit = supplierUnit.toLowerCase().trim();
            
            // Find potential matches with available units
            const availableUnits = product.units || product.Units || [];
            availableUnits.forEach(unit => {
              const unitName = typeof unit === 'string' ? unit : (unit.Nama_Satuan || unit.nama || '');
              if (unitName) {
                const normalizedUnit = unitName.toLowerCase().trim();
                
                // If units contain each other or are similar, create mapping
                if (normalizedUnit.includes(normalizedSupplierUnit) || 
                    normalizedSupplierUnit.includes(normalizedUnit)) {
                  console.log(`OCRResultsTable: Found fuzzy match: ${unitName} ~ ${supplierUnit}`);
                  product.supplier_units[unitName] = supplierUnit;
                }
              }
            });
          }
          
          return prevData;
        });
      }
      
      // Update the product data in the editableData state
      setEditableData(prevData => {
        // Clone the data to avoid mutating state directly
        const newData = { ...prevData };
        if (!newData.output?.items?.[itemIndex]) return prevData;
        
        const items = [...newData.output.items];
        const item = { ...items[itemIndex] };
        const supplierUnit = safeGet(item, 'satuan.value', '');
        
        // Update main code and name
        item.kode_barang_main = {
          value: product.Kode_Item || product.kode_main || product.product_code || '',
          is_confident: true
        };
        
        item.nama_barang_main = {
          value: product.Nama_Item || product.nama_main || product.product_name || '',
          is_confident: true
        };
        
        // Extract units and prices for the dropdown
        const productUnits = product.Units || product.units || [];
        let availableUnits = [];
        
        // Extract available units based on structure
        if (Array.isArray(productUnits)) {
          if (productUnits.length > 0 && typeof productUnits[0] === 'string') {
            availableUnits = [...productUnits];
          } else {
            availableUnits = productUnits.map(u => u.Nama_Satuan || u.nama || '').filter(Boolean);
          }
        }
        
        // Get supplier unit mappings
        const supplierUnits = product.supplier_units || {};
        
        // Extract unit prices 
        const unitPrices = {};
        
        // Check both formats for prices
        if (product.Prices && Array.isArray(product.Prices)) {
          product.Prices.forEach(price => {
            unitPrices[price.Nama_Satuan] = parseFloat(price.Harga_Pokok || 0);
          });
        } else if (product.unit_prices && typeof product.unit_prices === 'object') {
          Object.entries(product.unit_prices).forEach(([unit, price]) => {
            unitPrices[unit] = parseFloat(price);
          });
        } else if (Array.isArray(productUnits) && typeof productUnits[0] === 'object') {
          productUnits.forEach(unit => {
            if (unit.prices && Array.isArray(unit.prices) && unit.prices.length > 0) {
              const unitName = unit.Nama_Satuan || unit.nama || '';
              unitPrices[unitName] = parseFloat(unit.prices[0].Harga_Pokok || 0);
            }
          });
        }
        
        // Select the best matching unit using priority logic
        let selectedUnit = '';
        
        // PRIORITY 1: Try to match with supplier unit
        if (supplierUnit) {
          for (const [mainUnit, mappedSupplierUnit] of Object.entries(supplierUnits)) {
            if (mappedSupplierUnit.toLowerCase().trim() === supplierUnit.toLowerCase().trim()) {
              selectedUnit = mainUnit;
              console.log(`OCRResultsTable: Selected unit based on direct supplier match: ${mainUnit}`);
              break;
            }
          }
          
          // If no direct match, try partial match
          if (!selectedUnit) {
            for (const [mainUnit, mappedSupplierUnit] of Object.entries(supplierUnits)) {
              const normalizedMapped = String(mappedSupplierUnit).toLowerCase().trim();
              const normalizedSupplier = String(supplierUnit).toLowerCase().trim();
              
              if (normalizedMapped.includes(normalizedSupplier) || normalizedSupplier.includes(normalizedMapped)) {
                selectedUnit = mainUnit;
                console.log(`OCRResultsTable: Selected unit based on partial supplier match: ${mainUnit}`);
                break;
              }
            }
          }
        }
        
        // PRIORITY 2: Try to find base unit
        if (!selectedUnit && Array.isArray(productUnits) && typeof productUnits[0] === 'object') {
          const baseUnit = productUnits.find(u => u.Is_Base === 1);
          if (baseUnit) {
            selectedUnit = baseUnit.Nama_Satuan;
            console.log(`OCRResultsTable: Selected unit based on base unit: ${selectedUnit}`);
          }
        }
        
        // PRIORITY 3: Match price
        if (!selectedUnit && Object.keys(unitPrices).length > 0) {
          const invoicePrice = parseFloat(safeGet(item, 'harga_satuan.value', 0));
          if (invoicePrice > 0) {
            let bestMatch = null;
            let bestDiff = Infinity;
            
            for (const [unit, price] of Object.entries(unitPrices)) {
              const diff = Math.abs(parseFloat(price) - invoicePrice) / invoicePrice;
              if (diff < bestDiff && diff < 0.025) { // Within 2.5% tolerance
                bestMatch = unit;
                bestDiff = diff;
              }
            }
            
            if (bestMatch) {
              selectedUnit = bestMatch;
              console.log(`OCRResultsTable: Selected unit based on price match: ${selectedUnit}`);
            }
          }
        }
        
        // PRIORITY 4: Use first available unit
        if (!selectedUnit && availableUnits.length > 0) {
          selectedUnit = availableUnits[0];
          console.log(`OCRResultsTable: Selected first available unit: ${selectedUnit}`);
        }
        
        // Set satuan_main with complete data
        item.satuan_main = {
          value: selectedUnit,
          is_confident: true,
          available_units: availableUnits,
          supplier_units: supplierUnits,
          unit_prices: unitPrices,
          // Also set units property for compatibility with different component expectations
          units: availableUnits,
          supplier_unit: supplierUnit // Store the current supplier unit for reference
        };
        
        // Update price if available for selected unit
        if (unitPrices[selectedUnit]) {
          item.harga_dasar_main = {
            value: unitPrices[selectedUnit],
            is_confident: true
          };
        }
        
        // Update the item in the array
        items[itemIndex] = item;
        newData.output.items = items;
        
        // Notify parent component of the change
        if (onDataChange) {
          onDataChange(newData);
        }
        
        return newData;
      });
      
      // Update search status to found
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'found'
      }));
      
    } catch (error) {
      console.error(`OCRResultsTable: Error in product lookup:`, error);
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'error'
      }));
    }
  };
  
  // Add direct effect for product lookup when data changes
  useEffect(() => {
    // Skip if no data or items
    if (!editableData?.output?.items || editableData.output.items.length === 0) {
      return;
    }
    
    console.log('OCRResultsTable: Running direct product lookup for items');
    console.log('OCRResultsTable: Total items:', editableData.output.items.length);
    
    // Get array of current invoice codes for dependency tracking
    const currentInvoiceCodes = editableData.output.items.map((item, index) => {
      return {
        index,
        code: safeGet(item, 'kode_barang_invoice.value', '') || 
              safeGet(item, 'kode_barang.value', '') ||
              safeGet(item, 'supplier_code.value', '') ||
              safeGet(item, 'invoice_code.value', ''),
        hasMainCode: !!safeGet(item, 'kode_barang_main.value', '')
      };
    });
    
    // Filter to only process codes that:
    // 1. Have an invoice code
    // 2. Don't already have a main code
    // 3. Haven't been processed recently (tracked in processedInvoiceCodes)
    const codesToProcess = currentInvoiceCodes.filter(item => {
      if (!item.code) {
        return false; // Skip empty codes
      }
      
      if (item.hasMainCode) {
        return false; // Skip if already has main code
      }
      
      // Create a unique key to prevent duplicate processing
      const processKey = `${item.index}-${item.code}`;
      if (processedInvoiceCodes.has(processKey)) {
        return false; // Skip if already processed
      }
      
      // Add to processed set
      processedInvoiceCodes.add(processKey);
      return true;
    });
    
    // If nothing to process, exit early
    if (codesToProcess.length === 0) {
      console.log('OCRResultsTable: No new invoice codes to lookup');
      return;
    }
    
    console.log(`OCRResultsTable: Will process ${codesToProcess.length} invoice codes for lookup`);
    
    // Process items with invoice codes
    const timer = setTimeout(() => {
      // Stagger lookups to avoid overwhelming the server
      codesToProcess.forEach((item, idx) => {
        console.log(`OCRResultsTable: Will look up item ${item.index} with code ${item.code}`);
        
        // Use setTimeout to stagger lookups
        setTimeout(() => {
          directProductLookup(item.code, item.index);
        }, idx * 300); // Stagger lookups by 300ms
      });
    }, 500); // Small initial delay
    
    return () => clearTimeout(timer);
  }, [editableData]); // Watch the entire editableData object to catch all changes

  // Add a simplified product lookup function that focuses on mapping
  const simplifiedProductLookup = async (invoiceCode, itemIndex) => {
    console.log(`OCRResultsTable: Simplified lookup for code ${invoiceCode} for item ${itemIndex}`);
    
    if (!invoiceCode) {
      console.warn(`OCRResultsTable: Empty invoice code for lookup`);
      return;
    }
    
    // Update search status
    setSearchStatus(prev => ({
      ...prev,
      [itemIndex]: 'loading'
    }));
    
    try {
      // Call the API to get product data by supplier code
      console.log(`OCRResultsTable: Calling API for invoice code ${invoiceCode}`);
      const response = await productItemApi.getProductBySupplierCode(invoiceCode);
      console.log(`OCRResultsTable: DIAGNOSTIC: Raw API Response:`, response);
      
      // Extract product data based on response format
      let product = null;
      
      if (response && response.success === true && response.data) {
        // Format: { success: true, data: {...} }
        // Check if data is an array or object
        if (Array.isArray(response.data)) {
          product = response.data[0];
          console.log(`OCRResultsTable: DIAGNOSTIC: Found product in response.data array[0]:`, product);
        } else {
          product = response.data;
          console.log(`OCRResultsTable: DIAGNOSTIC: Found product in response.data object:`, product);
        }
      } else if (response && response.ID_Produk) {
        // Format: Direct product object
        product = response;
        console.log(`OCRResultsTable: DIAGNOSTIC: Found direct product object:`, product);
      } else if (response && Array.isArray(response) && response.length > 0) {
        // Format: Array of products
        product = response[0];
        console.log(`OCRResultsTable: DIAGNOSTIC: Found product in array response[0]:`, product);
      }
      
      if (!product) {
        console.warn(`OCRResultsTable: No product found for ${invoiceCode}`);
        setSearchStatus(prev => ({
          ...prev,
          [itemIndex]: 'notfound'
        }));
        return;
      }
      
      console.log(`OCRResultsTable: DIAGNOSTIC: Product structure:`, {
        has_units: !!product.units,
        units_type: product.units ? (Array.isArray(product.units) ? 'array' : typeof product.units) : 'undefined',
        units_length: product.units && Array.isArray(product.units) ? product.units.length : 0,
        has_unit_prices: !!product.unit_prices,
        has_supplier_units: !!product.supplier_units
      });
      
      // Add supplier_units if missing
      if (!product.supplier_units && Array.isArray(product.units)) {
        console.log(`OCRResultsTable: DIAGNOSTIC: Creating default supplier_units mapping for ${product.units.length} units:`, product.units);
        product.supplier_units = {};
        
        // Create a simple 1:1 mapping where each unit maps to itself
        product.units.forEach(unit => {
          // If units is an array of strings
          if (typeof unit === 'string') {
            product.supplier_units[unit] = unit;
          }
          // If units is an array of objects
          else if (unit && typeof unit === 'object' && unit.Nama_Satuan) {
            product.supplier_units[unit.Nama_Satuan] = unit.Nama_Satuan;
          }
        });
        
        console.log(`OCRResultsTable: DIAGNOSTIC: Created default supplier_units:`, product.supplier_units);
      }
      
      // Update the product data in the editableData state
      setEditableData(prevData => {
        // Clone the data to avoid mutating state directly
        const newData = { ...prevData };
        if (!newData.output?.items?.[itemIndex]) return prevData;
        
        const items = [...newData.output.items];
        const item = { ...items[itemIndex] };
        const currentSupplierUnit = safeGet(item, 'satuan.value', '');
        
        console.log(`OCRResultsTable: DIAGNOSTIC: Current item state:`, {
          current_supplier_unit: currentSupplierUnit,
          existing_satuan_main: item.satuan_main ? {
            value: item.satuan_main.value,
            has_available_units: !!item.satuan_main.available_units,
            available_units_length: item.satuan_main.available_units ? item.satuan_main.available_units.length : 0,
            has_supplier_units: !!item.satuan_main.supplier_units
          } : 'none'
        });
        
        // STEP 1: Map kode_barang_main and nama_barang_main
        item.kode_barang_main = {
          value: product.Kode_Item || product.kode_main || product.product_code || '',
          is_confident: true
        };
        
        item.nama_barang_main = {
          value: product.Nama_Item || product.nama_main || product.product_name || '',
          is_confident: true
        };
        
        // STEP 2: Extract available units
        const productUnits = product.Units || product.units || [];
        let availableUnits = [];
        
        if (Array.isArray(productUnits)) {
          // Handle case where units is an array of strings
          if (productUnits.length > 0 && typeof productUnits[0] === 'string') {
            availableUnits = [...productUnits];
            console.log(`OCRResultsTable: DIAGNOSTIC: Units is array of strings, available_units:`, availableUnits);
          } else {
            // Handle case where units is an array of objects
            availableUnits = productUnits.map(u => u.Nama_Satuan);
            console.log(`OCRResultsTable: DIAGNOSTIC: Units is array of objects, mapped to available_units:`, availableUnits);
          }
        }
        
        // STEP 3: Map supplier units if available
        const supplierUnits = product.supplier_units || {};
        // Add logging to track supplier units
        console.log(`OCRResultsTable: DIAGNOSTIC: Supplier units before enhancement:`, supplierUnits);

        // If supplier units is empty or minimal, enhance it with reverse mapping
        if (Object.keys(supplierUnits).length === 0 || Object.keys(supplierUnits).length < availableUnits.length) {
          console.log(`OCRResultsTable: Adding additional supplier unit mappings`);
          
          // Add direct mapping - each unit maps to itself (for cases where supplier uses same unit names)
          availableUnits.forEach(unit => {
            if (!supplierUnits[unit]) {
              supplierUnits[unit] = unit;
            }
          });
          
          // Try to find the supplier unit from current item
          const currentSupplierUnit = safeGet(item, 'satuan.value', '');
          if (currentSupplierUnit) {
            const normalizedSupplierUnit = currentSupplierUnit.toLowerCase().trim();
            
            // Try to find a match for current supplier unit
            for (const unit of availableUnits) {
              const normalizedUnit = unit.toLowerCase().trim();
              
              // If units contain each other or are similar, create mapping
              if (normalizedUnit.includes(normalizedSupplierUnit) || 
                  normalizedSupplierUnit.includes(normalizedUnit)) {
                console.log(`OCRResultsTable: Found fuzzy match: ${unit} ~ ${currentSupplierUnit}`);
                supplierUnits[unit] = currentSupplierUnit;
              }
            }
          }
          
          console.log(`OCRResultsTable: DIAGNOSTIC: Enhanced supplier units:`, supplierUnits);
        }
        
        console.log(`OCRResultsTable: DIAGNOSTIC: Supplier units:`, supplierUnits);
        
        // STEP 4: Extract unit prices
        const unitPrices = {};
        
        // Check both formats for prices
        if (product.Prices && Array.isArray(product.Prices)) {
          // Format: separate Prices array
          product.Prices.forEach(price => {
            unitPrices[price.Nama_Satuan] = parseFloat(price.Harga_Pokok || 0);
          });
        } else if (product.unit_prices && typeof product.unit_prices === 'object') {
          // Format: unit_prices object from API
          Object.entries(product.unit_prices).forEach(([unit, price]) => {
            unitPrices[unit] = parseFloat(price);
          });
        } else {
          // Format: prices inside unit objects
          if (Array.isArray(productUnits) && typeof productUnits[0] === 'object') {
            productUnits.forEach(unit => {
              if (unit.prices && Array.isArray(unit.prices) && unit.prices.length > 0) {
                unitPrices[unit.Nama_Satuan] = parseFloat(unit.prices[0].Harga_Pokok || 0);
              }
            });
          }
        }
        
        console.log(`OCRResultsTable: DIAGNOSTIC: Unit prices:`, unitPrices);
        
        // Find base unit or first unit for default selection
        let unitValue = '';
        if (availableUnits.length > 0) {
          // PRIORITY 1: Try to match with supplier unit
          const currentSupplierUnit = safeGet(item, 'satuan.value', '');
          if (currentSupplierUnit) {
            // Look for a main unit that maps to this supplier unit
            for (const [mainUnit, supplierUnit] of Object.entries(supplierUnits)) {
              if (supplierUnit.toLowerCase().trim() === currentSupplierUnit.toLowerCase().trim()) {
                unitValue = mainUnit;
                console.log(`OCRResultsTable: DIAGNOSTIC: Selected unit based on direct supplier match: ${mainUnit} -> ${supplierUnit}`);
                break;
              }
            }
            
            // If no direct match, try partial match
            if (!unitValue) {
              for (const [mainUnit, supplierUnit] of Object.entries(supplierUnits)) {
                const normalizedMapped = String(supplierUnit).toLowerCase().trim();
                const normalizedSupplier = String(currentSupplierUnit).toLowerCase().trim();
                
                if (normalizedMapped.includes(normalizedSupplier) || normalizedSupplier.includes(normalizedMapped)) {
                  unitValue = mainUnit;
                  console.log(`OCRResultsTable: DIAGNOSTIC: Selected unit based on partial supplier match: ${mainUnit} -> ${supplierUnit}`);
                  break;
                }
              }
            }
          }
          
          // PRIORITY 2: Try to find base unit if units are objects
          if (!unitValue && Array.isArray(productUnits) && productUnits.length > 0 && typeof productUnits[0] === 'object') {
            const baseUnit = productUnits.find(u => u.Is_Base === 1);
            if (baseUnit) {
              unitValue = baseUnit.Nama_Satuan;
              console.log(`OCRResultsTable: DIAGNOSTIC: Selected unit based on Is_Base flag: ${unitValue}`);
            }
          }
          
          // PRIORITY 3: Price match (look for unit with price closest to invoice price)
          if (!unitValue && Object.keys(unitPrices).length > 0) {
            const invoicePrice = parseFloat(safeGet(item, 'harga_satuan.value', 0));
            if (invoicePrice > 0) {
              let bestMatch = null;
              let bestDiff = Infinity;
              
              for (const [unit, price] of Object.entries(unitPrices)) {
                const diff = Math.abs(parseFloat(price) - invoicePrice) / invoicePrice;
                if (diff < bestDiff && diff < 0.025) { // Within 2.5% tolerance
                  bestMatch = unit;
                  bestDiff = diff;
                }
              }
              
              if (bestMatch) {
                unitValue = bestMatch;
                console.log(`OCRResultsTable: DIAGNOSTIC: Selected unit based on price match: ${unitValue} (price diff: ${(bestDiff * 100).toFixed(2)}%)`);
              }
            }
          }
          
          // PRIORITY 4: If no unit found, use first available
          if (!unitValue) {
            unitValue = availableUnits[0];
            console.log(`OCRResultsTable: DIAGNOSTIC: Selected first available unit: ${unitValue}`);
          }
        }

        console.log(`OCRResultsTable: DIAGNOSTIC: Final selected unit value: "${unitValue}"`);
        
        // STEP 5: Set satuan_main with complete data
        const satuan_main = {
          value: unitValue,
          is_confident: true,
          available_units: availableUnits,
          supplier_units: supplierUnits,
          unit_prices: unitPrices,
          // Also set units property for compatibility with different component expectations
          units: availableUnits
        };
        
        console.log(`OCRResultsTable: DIAGNOSTIC: Final satuan_main object:`, satuan_main);
        
        // Set the satuan_main field
        item.satuan_main = satuan_main;
        
        // STEP 6: Set base price if available
        if (unitPrices[unitValue]) {
          item.harga_dasar_main = {
            value: unitPrices[unitValue],
            is_confident: true
          };
        }
        
        // Update the item in the array
        items[itemIndex] = item;
        newData.output.items = items;
        
        // Log the final state of the satuan_main object
        console.log(`OCRResultsTable: DIAGNOSTIC: Updated item satuan_main:`, items[itemIndex].satuan_main);
        
        // Notify parent component of the change
        if (onDataChange) {
          onDataChange(newData);
        }
        
        return newData;
      });
      
      // Update search status to found
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'found'
      }));
      
    } catch (error) {
      console.error(`OCRResultsTable: Error in product lookup:`, error);
      setSearchStatus(prev => ({
        ...prev,
        [itemIndex]: 'error'
      }));
    }
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