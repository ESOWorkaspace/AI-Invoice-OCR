import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { productApi } from '../../services/api';

export default function EnhancedProductForm({ product = null, onSuccess, onCancel }) {
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
  const [units, setUnits] = useState([{ Nama_Satuan: '', Jumlah_Dalam_Satuan_Dasar: 1 }]);
  const [prices, setPrices] = useState([{ unitName: '', Minimal_Qty: 1, Maksimal_Qty: null, Harga_Pokok: 0, Harga_Jual: 0 }]);
  const [stocks, setStocks] = useState([{ unitName: '', Jumlah_Stok: 0 }]);
  
  // Form state
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('product'); // 'product', 'variants', 'units', 'prices', 'stocks'
  
  // Initialize form with product data if in edit mode
  useEffect(() => {
    if (isEditMode && product) {
      // Set main product data
      setProductData({
        Kode_Item: product.Kode_Item || '',
        Supplier_Code: product.Supplier_Code || '',
        Nama_Item: product.Nama_Item || '',
        Jenis: product.Jenis || '',
      });
      
      // Set variants data
      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants.map(variant => ({
          ID_Varian: variant.ID_Varian,
          Deskripsi: variant.Deskripsi || ''
        })));
      }
      
      // Set units data
      if (product.units && product.units.length > 0) {
        setUnits(product.units.map(unit => ({
          ID_Satuan: unit.ID_Satuan,
          Nama_Satuan: unit.Nama_Satuan || '',
          Jumlah_Dalam_Satuan_Dasar: unit.Jumlah_Dalam_Satuan_Dasar || 1
        })));
        
        // Extract unit names for reference in prices and stocks
        const unitNames = product.units.map(unit => unit.Nama_Satuan);
        
        // Set prices data if available
        if (product.prices && product.prices.length > 0) {
          setPrices(product.prices.map(price => {
            const unitName = product.units.find(u => u.ID_Satuan === price.ID_Satuan)?.Nama_Satuan || '';
            return {
              ID_Harga: price.ID_Harga,
              unitName,
              Minimal_Qty: price.Minimal_Qty || 1,
              Maksimal_Qty: price.Maksimal_Qty || null,
              Harga_Pokok: price.Harga_Pokok || 0,
              Harga_Jual: price.Harga_Jual || 0
            };
          }));
        } else {
          // Create default price entries for each unit
          setPrices(unitNames.map(unitName => ({
            unitName,
            Minimal_Qty: 1,
            Maksimal_Qty: null,
            Harga_Pokok: 0,
            Harga_Jual: 0
          })));
        }
        
        // Set stocks data if available
        if (product.stocks && product.stocks.length > 0) {
          setStocks(product.stocks.map(stock => {
            const unitName = product.units.find(u => u.ID_Satuan === stock.ID_Satuan)?.Nama_Satuan || '';
            return {
              ID_Stok: stock.ID_Stok,
              unitName,
              Jumlah_Stok: stock.Jumlah_Stok || 0
            };
          }));
        } else {
          // Create default stock entries for each unit
          setStocks(unitNames.map(unitName => ({
            unitName,
            Jumlah_Stok: 0
          })));
        }
      }
    }
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
  const handleVariantChange = (index, value) => {
    const updatedVariants = [...variants];
    updatedVariants[index].Deskripsi = value;
    setVariants(updatedVariants);
  };
  
  // Add new variant
  const addVariant = () => {
    setVariants([...variants, { Deskripsi: '' }]);
  };
  
  // Remove variant
  const removeVariant = (index) => {
    const updatedVariants = [...variants];
    updatedVariants.splice(index, 1);
    setVariants(updatedVariants);
  };
  
  // Handle unit changes
  const handleUnitChange = (index, field, value) => {
    const updatedUnits = [...units];
    updatedUnits[index][field] = field === 'Jumlah_Dalam_Satuan_Dasar' ? parseFloat(value) : value;
    setUnits(updatedUnits);
    
    // Update unit names in prices and stocks
    if (field === 'Nama_Satuan') {
      const oldName = units[index].Nama_Satuan;
      
      // Update in prices
      const updatedPrices = [...prices];
      updatedPrices.forEach(price => {
        if (price.unitName === oldName) {
          price.unitName = value;
        }
      });
      setPrices(updatedPrices);
      
      // Update in stocks
      const updatedStocks = [...stocks];
      updatedStocks.forEach(stock => {
        if (stock.unitName === oldName) {
          stock.unitName = value;
        }
      });
      setStocks(updatedStocks);
    }
  };
  
  // Add new unit
  const addUnit = () => {
    const newUnit = { Nama_Satuan: '', Jumlah_Dalam_Satuan_Dasar: 1 };
    setUnits([...units, newUnit]);
    
    // Also add default price and stock for the new unit
    setPrices([...prices, { 
      unitName: '', 
      Minimal_Qty: 1, 
      Maksimal_Qty: null, 
      Harga_Pokok: 0, 
      Harga_Jual: 0 
    }]);
    
    setStocks([...stocks, { 
      unitName: '', 
      Jumlah_Stok: 0 
    }]);
  };
  
  // Remove unit
  const removeUnit = (index) => {
    const unitName = units[index].Nama_Satuan;
    
    // Remove the unit
    const updatedUnits = [...units];
    updatedUnits.splice(index, 1);
    setUnits(updatedUnits);
    
    // Remove associated prices
    const updatedPrices = prices.filter(price => price.unitName !== unitName);
    setPrices(updatedPrices);
    
    // Remove associated stocks
    const updatedStocks = stocks.filter(stock => stock.unitName !== unitName);
    setStocks(updatedStocks);
  };
  
  // Handle price changes
  const handlePriceChange = (index, field, value) => {
    const updatedPrices = [...prices];
    updatedPrices[index][field] = field === 'unitName' ? value : parseFloat(value);
    setPrices(updatedPrices);
  };
  
  // Handle stock changes
  const handleStockChange = (index, value) => {
    const updatedStocks = [...stocks];
    updatedStocks[index].Jumlah_Stok = parseFloat(value);
    setStocks(updatedStocks);
  };
  
  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    // Validate main product data
    if (!productData.Kode_Item.trim()) {
      newErrors.Kode_Item = 'Kode item harus diisi';
    }
    
    if (!productData.Nama_Item.trim()) {
      newErrors.Nama_Item = 'Nama item harus diisi';
    }
    
    // Validate variants
    const variantErrors = [];
    variants.forEach((variant, index) => {
      if (!variant.Deskripsi.trim()) {
        variantErrors[index] = 'Deskripsi varian harus diisi';
      }
    });
    if (variantErrors.length > 0) {
      newErrors.variants = variantErrors;
    }
    
    // Validate units
    const unitErrors = [];
    const unitNames = new Set();
    units.forEach((unit, index) => {
      const unitError = {};
      
      if (!unit.Nama_Satuan.trim()) {
        unitError.Nama_Satuan = 'Nama satuan harus diisi';
      } else if (unitNames.has(unit.Nama_Satuan)) {
        unitError.Nama_Satuan = 'Nama satuan harus unik';
      } else {
        unitNames.add(unit.Nama_Satuan);
      }
      
      if (unit.Jumlah_Dalam_Satuan_Dasar <= 0) {
        unitError.Jumlah_Dalam_Satuan_Dasar = 'Jumlah harus lebih dari 0';
      }
      
      if (Object.keys(unitError).length > 0) {
        unitErrors[index] = unitError;
      }
    });
    if (unitErrors.length > 0) {
      newErrors.units = unitErrors;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare data for submission
      const formData = {
        product: productData,
        variants: variants.filter(v => v.Deskripsi.trim() !== ''),
        units: units.filter(u => u.Nama_Satuan.trim() !== ''),
        prices: prices.filter(p => p.unitName !== ''),
        stocks: stocks.filter(s => s.unitName !== '')
      };
      
      let response;
      
      if (isEditMode) {
        // Update existing product
        response = await productApi.updateProduct(product.ID_Produk, formData);
        toast.success('Produk berhasil diperbarui');
      } else {
        // Create new product
        response = await productApi.createProduct(formData);
        toast.success('Produk berhasil ditambahkan');
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      
      const errorMessage = error.response?.data?.error?.message || 'Gagal menyimpan produk';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <div className="mb-6">
        <ul className="flex border-b">
          <li className="-mb-px mr-1">
            <button
              className={`inline-block py-2 px-4 font-semibold ${
                activeTab === 'product' 
                  ? 'border-l border-t border-r rounded-t text-blue-700'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('product')}
            >
              Produk
            </button>
          </li>
          <li className="-mb-px mr-1">
            <button
              className={`inline-block py-2 px-4 font-semibold ${
                activeTab === 'variants' 
                  ? 'border-l border-t border-r rounded-t text-blue-700'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('variants')}
            >
              Varian
            </button>
          </li>
          <li className="-mb-px mr-1">
            <button
              className={`inline-block py-2 px-4 font-semibold ${
                activeTab === 'units' 
                  ? 'border-l border-t border-r rounded-t text-blue-700'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('units')}
            >
              Satuan
            </button>
          </li>
          <li className="-mb-px mr-1">
            <button
              className={`inline-block py-2 px-4 font-semibold ${
                activeTab === 'prices' 
                  ? 'border-l border-t border-r rounded-t text-blue-700'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('prices')}
            >
              Harga
            </button>
          </li>
          <li className="-mb-px mr-1">
            <button
              className={`inline-block py-2 px-4 font-semibold ${
                activeTab === 'stocks' 
                  ? 'border-l border-t border-r rounded-t text-blue-700'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('stocks')}
            >
              Stok
            </button>
          </li>
        </ul>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Tab */}
        {activeTab === 'product' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="Kode_Item" className="block text-sm font-medium text-gray-700 mb-1">
                Kode Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="Kode_Item"
                name="Kode_Item"
                value={productData.Kode_Item}
                onChange={handleProductChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.Kode_Item ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isEditMode} // Don't allow editing code in edit mode
              />
              {errors.Kode_Item && (
                <p className="mt-1 text-sm text-red-500">{errors.Kode_Item}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="Supplier_Code" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Code
              </label>
              <input
                type="text"
                id="Supplier_Code"
                name="Supplier_Code"
                value={productData.Supplier_Code}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="Nama_Item" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="Nama_Item"
                name="Nama_Item"
                value={productData.Nama_Item}
                onChange={handleProductChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.Nama_Item ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.Nama_Item && (
                <p className="mt-1 text-sm text-red-500">{errors.Nama_Item}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="Jenis" className="block text-sm font-medium text-gray-700 mb-1">
                Jenis
              </label>
              <input
                type="text"
                id="Jenis"
                name="Jenis"
                value={productData.Jenis}
                onChange={handleProductChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        
        {/* Variants Tab */}
        {activeTab === 'variants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Varian Produk</h3>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Tambah Varian
              </button>
            </div>
            
            {variants.map((variant, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={variant.Deskripsi}
                    onChange={(e) => handleVariantChange(index, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.variants && errors.variants[index] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.variants && errors.variants[index] && (
                    <p className="mt-1 text-sm text-red-500">{errors.variants[index]}</p>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="mt-6 p-2 text-red-600 hover:text-red-800"
                  disabled={variants.length === 1}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Satuan & Konversi</h3>
              <button
                type="button"
                onClick={addUnit}
                className="flex items-center px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Tambah Satuan
              </button>
            </div>
            
            {units.map((unit, index) => (
              <div key={index} className="p-3 border border-gray-300 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Satuan #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeUnit(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                    disabled={units.length === 1}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Satuan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={unit.Nama_Satuan}
                      onChange={(e) => handleUnitChange(index, 'Nama_Satuan', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.units && errors.units[index]?.Nama_Satuan ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.units && errors.units[index]?.Nama_Satuan && (
                      <p className="mt-1 text-sm text-red-500">{errors.units[index].Nama_Satuan}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jumlah Dalam Satuan Dasar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={unit.Jumlah_Dalam_Satuan_Dasar}
                      onChange={(e) => handleUnitChange(index, 'Jumlah_Dalam_Satuan_Dasar', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.units && errors.units[index]?.Jumlah_Dalam_Satuan_Dasar ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.units && errors.units[index]?.Jumlah_Dalam_Satuan_Dasar && (
                      <p className="mt-1 text-sm text-red-500">{errors.units[index].Jumlah_Dalam_Satuan_Dasar}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Prices Tab */}
        {activeTab === 'prices' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Harga</h3>
            
            {prices.map((price, index) => (
              <div key={index} className="p-3 border border-gray-300 rounded-md">
                <h4 className="font-medium mb-2">Tingkat Harga #{index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satuan
                    </label>
                    <select
                      value={price.unitName}
                      onChange={(e) => handlePriceChange(index, 'unitName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih Satuan</option>
                      {units.map((unit, i) => (
                        <option key={i} value={unit.Nama_Satuan}>
                          {unit.Nama_Satuan}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimal Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={price.Minimal_Qty}
                      onChange={(e) => handlePriceChange(index, 'Minimal_Qty', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maksimal Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price.Maksimal_Qty || ''}
                      onChange={(e) => handlePriceChange(index, 'Maksimal_Qty', e.target.value === '' ? null : e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tidak terbatas"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga Pokok
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price.Harga_Pokok}
                      onChange={(e) => handlePriceChange(index, 'Harga_Pokok', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga Jual
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price.Harga_Jual}
                      onChange={(e) => handlePriceChange(index, 'Harga_Jual', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Stocks Tab */}
        {activeTab === 'stocks' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Stok</h3>
            
            {stocks.map((stock, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={stock.unitName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                  >
                    {units.map((unit, i) => (
                      <option key={i} value={unit.Nama_Satuan}>
                        {unit.Nama_Satuan}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-2/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stock.Jumlah_Stok}
                    onChange={(e) => handleStockChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            disabled={isLoading}
          >
            {isLoading ? 'Menyimpan...' : isEditMode ? 'Perbarui Produk' : 'Simpan Produk'}
          </button>
        </div>
      </form>
    </div>
  );
}
