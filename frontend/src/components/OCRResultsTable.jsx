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

  // Add a dedicated effect for product lookup that runs only after component and functions are initialized
  useEffect(() => {
    if (!editableData?.output?.items) return;
    
    console.log('OCRResultsTable: Running initial product lookup for all items');
    
    // Slightly delay the lookup to ensure all functions are properly initialized
    const lookupTimer = setTimeout(() => {
      // Check for items with invoice codes but without main product data
      const itemsToProcess = editableData.output.items
        .map((item, index) => ({
          index,
          invoiceCode: safeGet(item, 'kode_barang.value', '') ||
                       safeGet(item, 'kode_barang_invoice.value', '')
        }))
        .filter(({ invoiceCode, index }) => {
          // Only process items that have an invoice code but not a main code
          const hasInvoiceCode = !!invoiceCode;
          const hasMainCode = !!safeGet(editableData, `output.items[${index}].kode_barang_main.value`, '');
          
          return hasInvoiceCode && !hasMainCode;
        });
      
      console.log(`OCRResultsTable: Found ${itemsToProcess.length} items to process`);
      
      // Process each item one by one with slight delay to prevent race conditions
      if (itemsToProcess.length > 0) {
        itemsToProcess.forEach(({ invoiceCode, index }, i) => {
          setTimeout(() => {
            console.log(`OCRResultsTable: Processing item ${index} with code ${invoiceCode}`);
            // Use the function from ref to search for the product
            if (functionRefs.current.searchProductByInvoiceCode) {
              functionRefs.current.searchProductByInvoiceCode(invoiceCode, index);
            }
          }, i * 100); // Stagger lookups by 100ms each
        });
      }
    }, 500); // Wait 500ms to ensure component is fully mounted
    
    return () => clearTimeout(lookupTimer);
  }, [editableData?.output?.items?.length]); // Only run when items array changes

  // Handle changes to item fields
  const handleItemChange = useCallback((rowIndex, field, value) => {
      const newData = { ...editableData };
    const item = newData.output.items && newData.output.items[rowIndex];
    
    if (!item) return;
    
    // Update the field value
    item[field] = {
      ...item[field],
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
        
        // Update kode_barang_main and nama_barang_main
        item.kode_barang_main = {
          ...item.kode_barang_main,
          value: product.product_code || '',
          is_confident: true
        };
        
        item.nama_barang_main = {
          ...item.nama_barang_main,
          value: product.product_name || '',
          is_confident: true
        };
        
        // Determine supplier unit and unit information
        let supplierUnit = '';
        if (product.supplier_unit && typeof product.supplier_unit === 'string') {
          supplierUnit = product.supplier_unit;
        } else if (product.satuan_supplier) {
          supplierUnit = product.satuan_supplier;
        }
        
        // Get all available units for the product
        const availableUnits = product.units && product.units.length > 0 ? 
          product.units : [product.unit].filter(Boolean);
          
        // Get unit prices
        let unitPrices = product.unit_prices || {};
        
        // Determine the best unit to use
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
        
        // Second priority: Use the product unit if no match found
        if (!unitToUse) {
          unitToUse = product.unit || (availableUnits.length > 0 ? availableUnits[0] : '');
          
          // Try to get corresponding supplier unit for this main unit
          if (product.supplier_unit && typeof product.supplier_unit === 'object') {
            userSupplierUnit = product.supplier_unit[unitToUse] || supplierUnit;
          } else if (supplierUnit) {
            userSupplierUnit = supplierUnit;
          }
        }
        
        // Update satuan_main with proper unit and metadata
        if (unitToUse) {
          item.satuan_main = {
            ...item.satuan_main,
            value: unitToUse,
            is_confident: true,
            available_units: availableUnits,
            unit_prices: unitPrices,
            supplier_unit: userSupplierUnit
          };
        }
        
        // Update satuan field with supplier unit if available
        if (userSupplierUnit && item.satuan) {
          item.satuan = {
            ...item.satuan,
            value: userSupplierUnit,
            is_confident: true
          };
        }
        
        // Use base_price (harga_pokok) for the selected unit
        const basePrice = unitToUse && unitPrices[unitToUse] ? 
          parseFloat(unitPrices[unitToUse]) : 
          parseFloat(product.base_price || product.harga_pokok) || 0;
        
        if (item.harga_dasar_main) {
          item.harga_dasar_main = {
            ...item.harga_dasar_main,
            value: basePrice,
          is_confident: true
        };
        }
        
        setEditableData(newData);
        if (onDataChange) {
          onDataChange(newData);
        }
      }
      
      setSearchStatus(prev => ({
        ...prev,
        [rowIndex]: 'found'
      }));
      
      // Remove from pending searches
      setPendingSearches(prev => {
        const newPending = { ...prev };
        delete newPending[rowIndex];
        return newPending;
      });
      
      return; // Return early since we found the product in cache
    }
    
    try {
      setSearchStatus(prev => ({
        ...prev,
        [rowIndex]: 'searching'
      }));
      
      // Use the new API endpoint for invoice code search
      axios.get(`${API_BASE_URL}/api/products/invoice`, {
        params: { invoiceCode },
        timeout: 600000 // Add timeout of 10 minutes to prevent hanging requests
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
          const item = newData.output.items[rowIndex];
          
          // Update product mapping for dropdown reference
          setProductMapping(prev => ({
            ...prev,
            [invoiceCode]: product
          }));
          
          // Update the item data
          if (item) {
            // Update main code and name
            item.kode_barang_main = {
              ...item.kode_barang_main,
              value: product.product_code || '',
                  is_confident: true
                };
            
            item.nama_barang_main = {
              ...item.nama_barang_main,
              value: product.product_name || '',
              is_confident: true
            };
            
            // Determine supplier unit and unit information
            let supplierUnit = '';
            if (product.supplier_unit && typeof product.supplier_unit === 'string') {
              supplierUnit = product.supplier_unit;
            } else if (product.satuan_supplier) {
              supplierUnit = product.satuan_supplier;
            }
            
            // Get all available units for the product
            const availableUnits = product.units && product.units.length > 0 ? 
              product.units : [product.unit].filter(Boolean);
              
            // Get unit prices
            let unitPrices = product.unit_prices || {};
            
            // Determine the best unit to use
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
            
            // Second priority: Use the product unit if no match found
            if (!unitToUse) {
              unitToUse = product.unit || (availableUnits.length > 0 ? availableUnits[0] : '');
              
              // Try to get corresponding supplier unit for this main unit
              if (product.supplier_unit && typeof product.supplier_unit === 'object') {
                userSupplierUnit = product.supplier_unit[unitToUse] || supplierUnit;
              } else if (supplierUnit) {
                userSupplierUnit = supplierUnit;
              }
            }
            
            // Update satuan_main with proper unit and metadata
            if (unitToUse) {
              item.satuan_main = {
                ...item.satuan_main,
                value: unitToUse,
                is_confident: true,
                available_units: availableUnits,
                unit_prices: unitPrices,
                supplier_unit: userSupplierUnit
              };
            }
            
            // Update satuan field with supplier unit if available
            if (userSupplierUnit && item.satuan) {
              item.satuan = {
                ...item.satuan,
                value: userSupplierUnit,
                  is_confident: true
                };
            }
            
            // Use base_price (harga_pokok) for the selected unit
            const basePrice = unitToUse && unitPrices[unitToUse] ? 
              parseFloat(unitPrices[unitToUse]) : 
              parseFloat(product.base_price || product.harga_pokok) || 0;
            
            if (item.harga_dasar_main) {
              item.harga_dasar_main = {
                ...item.harga_dasar_main,
                value: basePrice,
                    is_confident: true 
                  };
            }
            
            setEditableData(newData);
            if (onDataChange) {
              onDataChange(newData);
            }
          }
          
          setSearchStatus(prev => ({
            ...prev,
            [rowIndex]: 'found'
          }));
        } else {
          // No results found
          setSearchStatus(prev => ({
            ...prev,
            [rowIndex]: 'not_found'
          }));
        }
        
        // Remove from pending searches
        setPendingSearches(prev => {
          const newPending = { ...prev };
          delete newPending[rowIndex];
          return newPending;
        });
      })
      .catch(error => {
        // Set search status to error
        setSearchStatus(prev => ({
          ...prev,
          [rowIndex]: 'error'
        }));
        
        // Remove from pending searches
        setPendingSearches(prev => {
          const newPending = { ...prev };
          delete newPending[rowIndex];
          return newPending;
        });
      });
    } catch (error) {
      // Set search status to error
      setSearchStatus(prev => ({
        ...prev,
        [rowIndex]: 'error'
      }));
      
      // Remove from pending searches
      setPendingSearches(prev => {
        const newPending = { ...prev };
        delete newPending[rowIndex];
        return newPending;
      });
    }
  }, [API_BASE_URL, editableData, onDataChange, productCache, setProductCache, setProductMapping, setSearchStatus, setPendingSearches]);

  // Handle effect for auto-searching products based on invoice codes
  useEffect(() => {
    // Skip if there are no items
    if (!editableData?.output?.items || editableData.output.items.length === 0) {
      return;
    }
    
    // Use a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      // Check which items need to be searched
      const itemsToSearch = [];
      
      editableData.output.items.forEach((item, index) => {
        const invoiceCode = safeGet(item, 'kode_barang_invoice.value', '');
        const mainCode = safeGet(item, 'kode_barang_main.value', '');
        const searchStat = searchStatus[index];
        
        // Consider an item for search if:
        // 1. It has an invoice code
        // 2. It doesn't have a main code OR the main code is empty
        // 3. It hasn't been processed yet
        // 4. It's not already being searched or has an error/not_found status
        if (
          invoiceCode && 
          (!mainCode || mainCode === '') && 
          !processedInvoiceCodes.has(invoiceCode) &&
          (!searchStat || searchStat === 'not_started') 
        ) {
          // Add to the list of items to search
          itemsToSearch.push({ index, invoiceCode });
          processedInvoiceCodes.add(invoiceCode);
          
          // Set status to searching
          setSearchStatus(prev => ({
            ...prev,
            [index]: 'searching'
          }));
          
          setPendingSearches(prev => ({
            ...prev,
            [index]: invoiceCode
          }));
        }
      });
      
      // Search for each item
      itemsToSearch.forEach(({ index, invoiceCode }) => {
        functionRefs.current.searchProductByInvoiceCode(invoiceCode, index);
      });
    }, 500); // Short delay to ensure component is ready
    
    return () => clearTimeout(timer);
  }, [editableData, functionRefs, searchStatus, processedInvoiceCodes, setPendingSearches, setSearchStatus]);

  // Add a separate useEffect to handle initial data load auto-search
  useEffect(() => {
    // Only run on initial data load
    if (!data || !data.output || !data.output.items || data.output.items.length === 0) {
      return;
    }
    
    // Reset processed codes and search status for initial load
    processedInvoiceCodes.clear();
    setSearchStatus({});
    setPendingSearches({});
    
    // Set all items with invoice codes to 'not_started' to trigger the main search effect
    const initialSearchStatus = {};
    data.output.items.forEach((item, index) => {
      const invoiceCode = safeGet(item, 'kode_barang_invoice.value', '');
      if (invoiceCode) {
        initialSearchStatus[index] = 'not_started';
      }
    });
    
    setSearchStatus(initialSearchStatus);
  }, [data]);

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
    console.log(`OCRResultsTable: Direct lookup for code ${invoiceCode} for item ${itemIndex}`);
    
    if (!invoiceCode) {
      console.warn(`OCRResultsTable: Empty invoice code for direct lookup`);
      return;
    }
    
    // Update search status
    setSearchStatus(prev => ({
      ...prev,
      [itemIndex]: 'loading'
    }));
    
    try {
      // Get the current item to check its supplier unit
      const currentItem = editableData?.output?.items?.[itemIndex] || {};
      const supplierUnitValue = safeGet(currentItem, 'satuan.value', '').trim();
      const invoicePrice = parseFloat(safeGet(currentItem, 'harga_satuan.value', '0')) || 0;
      
      console.log(`OCRResultsTable: Item ${itemIndex} structure:`, {
        supplierUnit: supplierUnitValue,
        invoicePrice: invoicePrice
      });
      
      // Search by supplier code using direct API call
      console.log(`OCRResultsTable: Calling productItemApi.getProductBySupplierCode with code ${invoiceCode}`);
      const response = await productItemApi.getProductBySupplierCode(invoiceCode);
      console.log(`OCRResultsTable: Raw API response:`, response);
      
      // Handle different response formats
      let product = null;
      if (response && response.success === true && response.data) {
        // New API format: { success: true, data: {...} }
        product = response.data;
        console.log(`OCRResultsTable: Found product in response.data:`, product);
      } else if (response && response.ID_Produk) {
        // Direct product object format
        product = response;
        console.log(`OCRResultsTable: Found product object:`, product);
      } else if (response && Array.isArray(response) && response.length > 0) {
        // Array response format
        product = response[0];
        console.log(`OCRResultsTable: Found product in array response:`, product);
      }
      
      if (!product) {
        console.warn(`OCRResultsTable: No product found for ${invoiceCode}`);
        setSearchStatus(prev => ({
          ...prev,
          [itemIndex]: 'notfound'
        }));
        return;
      }
      
      console.log(`OCRResultsTable: Product found:`, product);
      
      // Update the product cache
      setProductCache(prev => ({
        ...prev,
        [invoiceCode]: product
      }));
      
      // Update the product data directly
      setEditableData(prevData => {
        // Safety check
        if (!prevData?.output?.items || !prevData.output.items[itemIndex]) {
          return prevData;
        }
        
        // Clone the data
        const newData = { ...prevData };
        const items = [...newData.output.items];
        const item = { ...items[itemIndex] };
        
        // Update the product data fields
        console.log(`OCRResultsTable: Updating item with product data:`, {
          kode: product.Kode_Item,
          nama: product.Nama_Item
        });
        
        // Update main code and name
        item.kode_barang_main = {
          value: product.Kode_Item || '',
          is_confident: true
        };
        
        item.nama_barang_main = {
          value: product.Nama_Item || '',
          is_confident: true
        };
        
        // Process units if available (handle both uppercase 'Units' and lowercase 'units')
        const productUnits = product.Units || product.units || [];
        
        if (Array.isArray(productUnits) && productUnits.length > 0) {
          console.log(`OCRResultsTable: Available units:`, productUnits);
          
          // Extract the array of available unit names for the dropdown
          const availableUnits = productUnits.map(u => u.Nama_Satuan);
          console.log(`OCRResultsTable: Available unit names for dropdown:`, availableUnits);
          
          // Find base unit for reference
          const baseUnit = productUnits.find(u => u.Is_Base === 1) || productUnits[0];
          
          // Try to find matching unit by supplier code
          let matchingUnit = null;
          let matchReason = '';
          
          // Priority 1: Find direct match with supplier unit
          if (supplierUnitValue) {
            matchingUnit = productUnits.find(unit => {
              const normalizedSupplierUnit = supplierUnitValue.toLowerCase().trim();
              const normalizedUnitSupplier = (unit.Satuan_Supplier || '').toLowerCase().trim();
              return normalizedUnitSupplier && normalizedUnitSupplier === normalizedSupplierUnit;
            });
            
            if (matchingUnit) {
              matchReason = 'exact supplier unit match';
              console.log(`OCRResultsTable: Found exact supplier unit match: ${matchingUnit.Satuan_Supplier} → ${matchingUnit.Nama_Satuan}`);
            }
          }
          
          // Priority 2: If no direct match, try fuzzy match
          if (!matchingUnit && supplierUnitValue) {
            matchingUnit = productUnits.find(unit => {
              if (!unit.Satuan_Supplier) return false;
              
              const normalizedSupplierUnit = supplierUnitValue.toLowerCase().trim();
              const normalizedUnitSupplier = unit.Satuan_Supplier.toLowerCase().trim();
              
              return normalizedUnitSupplier.includes(normalizedSupplierUnit) || 
                    normalizedSupplierUnit.includes(normalizedUnitSupplier);
            });
            
            if (matchingUnit) {
              matchReason = 'fuzzy supplier unit match';
              console.log(`OCRResultsTable: Found fuzzy supplier unit match: ${matchingUnit.Satuan_Supplier} → ${matchingUnit.Nama_Satuan}`);
            }
          }
          
          // Fallback to base unit if no match found
          if (!matchingUnit) {
            matchingUnit = baseUnit;
            matchReason = 'fallback to base unit';
            console.log(`OCRResultsTable: No matching unit found, using base unit: ${baseUnit.Nama_Satuan}`);
          }
          
          // Build the unit prices mapping for calculations
          const unitPrices = {};
          
          // Check both formats for prices: standalone Prices array or nested inside units
          if (product.Prices && Array.isArray(product.Prices)) {
            product.Prices.forEach(price => {
              unitPrices[price.Nama_Satuan] = parseFloat(price.Harga_Pokok || 0);
            });
          } else {
            // Look for prices inside unit objects
            productUnits.forEach(unit => {
              if (unit.prices && Array.isArray(unit.prices) && unit.prices.length > 0) {
                unitPrices[unit.Nama_Satuan] = parseFloat(unit.prices[0].Harga_Pokok || 0);
              }
            });
          }
          
          // Build supplier unit mapping in the exact format that ItemsTable expects
          // This is crucial! ItemsTable expects: { mainUnit: supplierUnit, ... }
          const supplierUnits = {};
          productUnits.forEach(unit => {
            if (unit.Satuan_Supplier) {
              supplierUnits[unit.Nama_Satuan] = unit.Satuan_Supplier;
            }
          });
          
          console.log(`OCRResultsTable: Unit mapping for ItemsTable:`, supplierUnits);
          
          // Update the satuan_main field with all necessary data for the dropdown
          item.satuan_main = {
            value: matchingUnit.Nama_Satuan,
            is_confident: true,
            available_units: availableUnits,
            supplier_unit: supplierUnitValue,
            supplier_units: supplierUnits,
            unit_prices: unitPrices,
            matchReason: matchReason
          };
          
          console.log(`OCRResultsTable: Set satuan_main for dropdown:`, item.satuan_main);
          
          // Set the base price if available for this unit
          const selectedUnit = matchingUnit.Nama_Satuan;
          if (unitPrices[selectedUnit]) {
            item.harga_dasar_main = {
              value: unitPrices[selectedUnit].toString(),
              is_confident: true
            };
          }
        }
        
        // Update the item in the array
        items[itemIndex] = item;
        newData.output.items = items;
        
        // Call onDataChange if provided
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
      console.error(`OCRResultsTable: Error in direct product lookup for ${invoiceCode}:`, error);
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
    
    // Process items with invoice codes
    const timer = setTimeout(() => {
      // Log all items and their code fields for debugging
      editableData.output.items.forEach((item, index) => {
        console.log(`OCRResultsTable: Item ${index} code fields:`, {
          kode_barang_invoice: safeGet(item, 'kode_barang_invoice.value', ''),
          kode_barang: safeGet(item, 'kode_barang.value', ''),
          nama_barang_invoice: safeGet(item, 'nama_barang_invoice.value', ''),
          kode_main: safeGet(item, 'kode_barang_main.value', '')
        });
      });
      
      // Check all items for codes to process
      editableData.output.items.forEach((item, index) => {
        // Check ALL possible invoice code field names
        const invoiceCode = 
          safeGet(item, 'kode_barang_invoice.value', '') || 
          safeGet(item, 'kode_barang.value', '') ||
          safeGet(item, 'supplier_code.value', '') ||
          safeGet(item, 'invoice_code.value', '');
        
        // Skip if no invoice code or already has main code
        const hasMainCode = !!safeGet(item, 'kode_barang_main.value', '');
        
        if (!invoiceCode) {
          console.log(`OCRResultsTable: Item ${index} - No invoice code found, skipping lookup`);
          return;
        }
        
        if (hasMainCode) {
          console.log(`OCRResultsTable: Item ${index} - Already has main code, skipping lookup`);
          return;
        }
        
        console.log(`OCRResultsTable: Will look up item ${index} with code ${invoiceCode}`);
        
        // Use setTimeout to stagger lookups
        setTimeout(() => {
          directProductLookup(invoiceCode, index);
        }, index * 500); // Increase timeout to 500ms between items
      });
    }, 1500); // Increase initial delay to 1.5 seconds
    
    return () => clearTimeout(timer);
  }, [editableData?.output?.items?.length]);

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