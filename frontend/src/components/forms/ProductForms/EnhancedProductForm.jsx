import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { productApi } from '../../../services/api';

// Import tab components
import ProductTab from './tabs/ProductTab';
import VariantsTab from './tabs/VariantsTab';
import UnitsTab from './tabs/UnitsTab';
import PricesTab from './tabs/PricesTab';
import StocksTab from './tabs/StocksTab';

// Import utilities
import { processProductData, prepareFormDataForSubmission, validateProductForm } from './utils/productFormUtils';

export default function EnhancedProductForm({ 
  product = null, 
  onSuccess, 
  onCancel,
  availableCategories = ['Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Peralatan Rumah Tangga', 'Lainnya']
}) {
  const isEditMode = !!product;
  
  // Main product form state
  const [productData, setProductData] = useState({
    Kode_Item: '',
    Supplier_Code: '',
    Nama_Item: '',
    Jenis: '',
  });
  
  // Related data state
  const [variants, setVariants] = useState([{ Deskripsi: '' }]);
  const [units, setUnits] = useState([{ 
    Nama_Satuan: '', 
    Jumlah_Dalam_Satuan_Dasar: 1,
    Satuan_Supplier: '',
    Threshold_Margin: 0
  }]);
  const [prices, setPrices] = useState([{ 
    unitName: '', 
    Minimal_Qty: 1, 
    Maksimal_Qty: null, 
    Harga_Pokok: 0,
    Harga_Pokok_Sebelumnya: 0,
    Harga_Jual: 0 
  }]);
  const [stocks, setStocks] = useState([{ unitName: '', Jumlah_Stok: 0 }]);
  
  // Form state
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('product'); // 'product', 'variants', 'units', 'prices', 'stocks'
  
  // Ref to track if units have been processed to avoid infinite re-renders
  const processedUnitsRef = useRef(false);

  // Initialize form with product data if in edit mode
  useEffect(() => {
    // Return early if not in edit mode or no product data
    if (!isEditMode || !product) return;
    
    // Return early if units have already been processed to avoid infinite re-renders
    if (processedUnitsRef.current) return;
    
    // Process the product data and update all states
    const processedData = processProductData(product);
    
    // Update all form states
    setProductData(processedData.productData);
    setVariants(processedData.variants);
    setUnits(processedData.units);
    setPrices(processedData.prices);
    setStocks(processedData.stocks);
    
    // Mark units as processed
    processedUnitsRef.current = true;
  }, [isEditMode, product]);
  
  // Handle main product data change
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    
    setProductData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle variant changes
  const handleVariantChange = (e, index) => {
    const { name, value } = e.target;
    const updatedVariants = [...variants];
    updatedVariants[index][name] = value;
    setVariants(updatedVariants);
  };
  
  // Add new variant
  const handleAddVariant = () => {
    setVariants([...variants, { Deskripsi: '' }]);
  };
  
  // Remove variant
  const handleRemoveVariant = (index) => {
    const updatedVariants = [...variants];
    updatedVariants.splice(index, 1);
    
    // Always keep at least one variant field
    if (updatedVariants.length === 0) {
      updatedVariants.push({ Deskripsi: '' });
    }
    
    setVariants(updatedVariants);
  };
  
  // Handle unit changes
  const handleUnitChange = (e, index) => {
    const { name, value } = e.target;
    const updatedUnits = [...units];
    updatedUnits[index][name] = name === 'Jumlah_Dalam_Satuan_Dasar' ? parseFloat(value) : value;
    setUnits(updatedUnits);
    
    // Update unit names in prices and stocks if the unit name changes
    if (name === 'Nama_Satuan') {
      const oldName = units[index].Nama_Satuan;
      
      // Update in prices
      setPrices(prevPrices => 
        prevPrices.map(price => 
          price.unitName === oldName ? { ...price, unitName: value } : price
        )
      );
      
      // Update in stocks
      setStocks(prevStocks => 
        prevStocks.map(stock => 
          stock.unitName === oldName ? { ...stock, unitName: value } : stock
        )
      );
    }
  };
  
  // Add new unit
  const handleAddUnit = () => {
    const newUnit = { 
      Nama_Satuan: '', 
      Jumlah_Dalam_Satuan_Dasar: 1,
      Satuan_Supplier: '',
      Threshold_Margin: 0
    };
    setUnits([...units, newUnit]);
    
    // Also add default price and stock for the new unit
    setPrices([...prices, { 
      unitName: '', 
      Minimal_Qty: 1, 
      Maksimal_Qty: null, 
      Harga_Pokok: 0,
      Harga_Pokok_Sebelumnya: 0,
      Harga_Jual: 0 
    }]);
    
    setStocks([...stocks, { 
      unitName: '', 
      Jumlah_Stok: 0 
    }]);
  };
  
  // Remove unit
  const handleRemoveUnit = (index) => {
    const unitName = units[index].Nama_Satuan;
    
    // Remove the unit
    const updatedUnits = [...units];
    updatedUnits.splice(index, 1);
    
    // Always keep at least one unit field
    if (updatedUnits.length === 0) {
      updatedUnits.push({ 
        Nama_Satuan: '', 
        Jumlah_Dalam_Satuan_Dasar: 1,
        Satuan_Supplier: '',
        Threshold_Margin: 0
      });
    }
    
    setUnits(updatedUnits);
    
    // Remove associated prices and stocks
    setPrices(prevPrices => {
      const filtered = prevPrices.filter(price => price.unitName !== unitName);
      return filtered.length ? filtered : [{ 
        unitName: '', 
        Minimal_Qty: 1, 
        Maksimal_Qty: null, 
        Harga_Pokok: 0,
        Harga_Pokok_Sebelumnya: 0,
        Harga_Jual: 0 
      }];
    });
    
    setStocks(prevStocks => {
      const filtered = prevStocks.filter(stock => stock.unitName !== unitName);
      return filtered.length ? filtered : [{ 
        unitName: '', 
        Jumlah_Stok: 0 
      }];
    });
  };
  
  // Handle price changes
  const handlePriceChange = (e, index) => {
    const { name, value } = e.target;
    const updatedPrices = [...prices];
    
    // Handle numeric fields
    if (['Minimal_Qty', 'Maksimal_Qty', 'Harga_Pokok', 'Harga_Jual'].includes(name)) {
      updatedPrices[index][name] = value === '' ? '' : parseFloat(value);
      
      // Save previous price when Harga_Pokok changes and it's not the first change
      if (name === 'Harga_Pokok' && updatedPrices[index].Harga_Pokok !== 0) {
        updatedPrices[index].Harga_Pokok_Sebelumnya = updatedPrices[index].Harga_Pokok;
      }
    } else {
      updatedPrices[index][name] = value;
    }
    
    setPrices(updatedPrices);
  };
  
  // Handle stock changes
  const handleStockChange = (e, index) => {
    const { name, value } = e.target;
    const updatedStocks = [...stocks];
    updatedStocks[index][name] = value === '' ? '' : parseFloat(value);
    setStocks(updatedStocks);
  };
  
  // Validate and handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateProductForm(productData, variants, units);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Form memiliki kesalahan, silakan periksa kembali.');
      return;
    }
    
    // Prepare data for submission
    const formData = prepareFormDataForSubmission(productData, variants, units, prices, stocks);
    
    // Submit form
    setIsLoading(true);
    try {
      let response;
      if (isEditMode) {
        // Update existing product - use ID_Produk as the identifier
        response = await productApi.updateProduct(product.ID_Produk, formData);
      } else {
        // Create new product
        response = await productApi.createProduct(formData);
      }
      
      toast.success(`Produk berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}`);
      
      // Call the success callback
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(`Gagal ${isEditMode ? 'memperbarui' : 'menambahkan'} produk`);
    } finally {
      setIsLoading(false);
    }
  };

  // Find the smallest conversion rate unit for StocksTab
  const getBaseUnit = () => {
    if (!units.length) return null;
    
    let baseUnit = units[0];
    for (const unit of units) {
      if (unit.Jumlah_Dalam_Satuan_Dasar < baseUnit.Jumlah_Dalam_Satuan_Dasar) {
        baseUnit = unit;
      }
    }
    return baseUnit;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <form onSubmit={handleSubmit} className="p-0">
        {/* Modern tab navigation */}
        <div className="bg-gray-50 border-b border-gray-200 pt-3">
          <div className="mx-6 flex">
            <div 
              className={`cursor-pointer py-3 px-5 text-sm font-medium border-t-2 rounded-t-lg -mb-[1px]
              ${activeTab === 'product' 
                ? 'border-t-blue-500 border-l border-r border-gray-200 border-b-0 bg-white text-blue-600 z-10' 
                : 'border-t-transparent border-b border-gray-200 hover:border-t-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('product')}
            >
              Produk
            </div>
            <div 
              className={`cursor-pointer py-3 px-5 text-sm font-medium border-t-2 rounded-t-lg -mb-[1px]
              ${activeTab === 'variants' 
                ? 'border-t-blue-500 border-l border-r border-gray-200 border-b-0 bg-white text-blue-600 z-10' 
                : 'border-t-transparent border-b border-gray-200 hover:border-t-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('variants')}
            >
              Varian
            </div>
            <div 
              className={`cursor-pointer py-3 px-5 text-sm font-medium border-t-2 rounded-t-lg -mb-[1px]
              ${activeTab === 'units' 
                ? 'border-t-blue-500 border-l border-r border-gray-200 border-b-0 bg-white text-blue-600 z-10' 
                : 'border-t-transparent border-b border-gray-200 hover:border-t-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('units')}
            >
              Satuan
            </div>
            <div 
              className={`cursor-pointer py-3 px-5 text-sm font-medium border-t-2 rounded-t-lg -mb-[1px]
              ${activeTab === 'prices' 
                ? 'border-t-blue-500 border-l border-r border-gray-200 border-b-0 bg-white text-blue-600 z-10' 
                : 'border-t-transparent border-b border-gray-200 hover:border-t-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('prices')}
            >
              Harga
            </div>
            <div 
              className={`cursor-pointer py-3 px-5 text-sm font-medium border-t-2 rounded-t-lg -mb-[1px]
              ${activeTab === 'stocks' 
                ? 'border-t-blue-500 border-l border-r border-gray-200 border-b-0 bg-white text-blue-600 z-10' 
                : 'border-t-transparent border-b border-gray-200 hover:border-t-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('stocks')}
            >
              Stok
            </div>
          </div>
        </div>
        
        {/* Tab Content with consistent padding */}
        <div className="bg-white p-6">
          {activeTab === 'product' && (
            <ProductTab 
              productData={productData} 
              handleProductChange={handleProductChange}
              availableCategories={availableCategories}
              errors={errors} 
            />
          )}
          
          {activeTab === 'variants' && (
            <VariantsTab 
              variants={variants} 
              handleAddVariant={handleAddVariant} 
              handleRemoveVariant={handleRemoveVariant} 
              handleVariantChange={handleVariantChange} 
              errors={errors} 
            />
          )}
          
          {activeTab === 'units' && (
            <UnitsTab 
              units={units}
              handleAddUnit={handleAddUnit}
              handleRemoveUnit={handleRemoveUnit}
              handleUnitChange={handleUnitChange}
              errors={errors}
            />
          )}
          
          {activeTab === 'prices' && (
            <PricesTab 
              prices={prices}
              units={units}
              handlePriceChange={handlePriceChange}
            />
          )}
          
          {activeTab === 'stocks' && (
            <StocksTab 
              stocks={stocks}
              units={units}
              baseUnit={getBaseUnit()}
              handleStockChange={handleStockChange}
            />
          )}
        </div>
        
        {/* Form Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 hover:bg-gray-50"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </span>
            ) : (
              isEditMode ? 'Perbarui' : 'Simpan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 