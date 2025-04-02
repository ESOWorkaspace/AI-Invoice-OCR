import { useState, useEffect } from 'react';
import { productItemApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductForm({ product = null, onSuccess, onCancel }) {
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState({
    Kode_Item: '',
    Nama_Item: '',
    Jenis: '',
    Supplier_Code: '',
    Supplier_Name: '',
    Satuan: '',
    Harga: 0,
    Stok: 0,
    Barcode: '',
    Stok_Minimum: 0
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with product data if in edit mode
  useEffect(() => {
    if (isEditMode && product) {
      setFormData({
        Kode_Item: product.Kode_Item || '',
        Nama_Item: product.Nama_Item || '',
        Jenis: product.Jenis || '',
        Supplier_Code: product.Supplier_Code || '',
        Supplier_Name: product.Supplier_Name || '',
        Satuan: product.Satuan || '',
        Harga: product.Harga || 0,
        Stok: product.Stok || 0,
        Barcode: product.Barcode || '',
        Stok_Minimum: product.Stok_Minimum || 0
      });
    }
  }, [isEditMode, product]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert numeric inputs to numbers
    const processedValue = type === 'number' ? 
      (value === '' ? '' : Number(value)) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.Kode_Item) {
      newErrors.Kode_Item = 'Product code is required';
    }
    
    if (!formData.Nama_Item) {
      newErrors.Nama_Item = 'Product name is required';
    }
    
    if (!formData.Jenis) {
      newErrors.Jenis = 'Category is required';
    }
    
    if (!formData.Satuan) {
      newErrors.Satuan = 'Unit is required';
    }
    
    if (formData.Harga < 0) {
      newErrors.Harga = 'Price cannot be negative';
    }
    
    if (formData.Stok < 0) {
      newErrors.Stok = 'Stock cannot be negative';
    }
    
    if (formData.Stok_Minimum < 0) {
      newErrors.Stok_Minimum = 'Minimum stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let response;
      
      // Format the data correctly for the backend
      const productData = {
        product: {
          Kode_Item: formData.Kode_Item,
          Nama_Item: formData.Nama_Item,
          Jenis: formData.Jenis,
          Supplier_Code: formData.Supplier_Code,
          Supplier_Name: formData.Supplier_Name,
          Satuan: formData.Satuan,
          Harga: formData.Harga,
          Stok: formData.Stok,
          Barcode: formData.Barcode,
          Stok_Minimum: formData.Stok_Minimum
        },
        variants: [],
        units: [
          {
            Nama_Satuan: formData.Satuan,
            Jumlah_Dalam_Satuan_Dasar: 1.0
          }
        ]
      };
      
      console.log('Sending product data:', productData);
      
      if (isEditMode) {
        // Update existing product
        response = await productItemApi.updateProduct(product.ID_Produk, productData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        response = await productItemApi.createProduct(productData);
        toast.success('Product created successfully');
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Handle API error responses
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        
        if (apiErrors.error) {
          toast.error(apiErrors.error.message || 'Failed to save product');
        } else {
          toast.error('Failed to save product');
        }
      } else {
        toast.error('Failed to save product');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Product Code
        </label>
        <input
          type="text"
          name="Kode_Item"
          value={formData.Kode_Item}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Kode_Item ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          disabled={isEditMode}
        />
        {errors.Kode_Item && (
          <p className="mt-1 text-sm text-red-500">{errors.Kode_Item}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Product Name
        </label>
        <input
          type="text"
          name="Nama_Item"
          value={formData.Nama_Item}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Nama_Item ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Nama_Item && (
          <p className="mt-1 text-sm text-red-500">{errors.Nama_Item}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <input
          type="text"
          name="Jenis"
          value={formData.Jenis}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Jenis ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Jenis && (
          <p className="mt-1 text-sm text-red-500">{errors.Jenis}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Unit
        </label>
        <input
          type="text"
          name="Satuan"
          value={formData.Satuan}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Satuan ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Satuan && (
          <p className="mt-1 text-sm text-red-500">{errors.Satuan}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Price
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">Rp</span>
          </div>
          <input
            type="number"
            name="Harga"
            value={formData.Harga}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`mt-1 pl-10 pr-3 py-2 block w-full border ${errors.Harga ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
        </div>
        {errors.Harga && (
          <p className="mt-1 text-sm text-red-500">{errors.Harga}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Stock
        </label>
        <input
          type="number"
          name="Stok"
          value={formData.Stok}
          onChange={handleChange}
          min="0"
          className={`mt-1 block w-full px-3 py-2 border ${errors.Stok ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Stok && (
          <p className="mt-1 text-sm text-red-500">{errors.Stok}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Supplier Code
        </label>
        <input
          type="text"
          name="Supplier_Code"
          value={formData.Supplier_Code}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Supplier_Code ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Supplier_Code && (
          <p className="mt-1 text-sm text-red-500">{errors.Supplier_Code}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Supplier Name
        </label>
        <input
          type="text"
          name="Supplier_Name"
          value={formData.Supplier_Name}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${errors.Supplier_Name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Supplier_Name && (
          <p className="mt-1 text-sm text-red-500">{errors.Supplier_Name}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Barcode
        </label>
        <input
          type="text"
          name="Barcode"
          value={formData.Barcode}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Minimum Stock
        </label>
        <input
          type="number"
          name="Stok_Minimum"
          value={formData.Stok_Minimum}
          onChange={handleChange}
          min="0"
          className={`mt-1 block w-full px-3 py-2 border ${errors.Stok_Minimum ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.Stok_Minimum && (
          <p className="mt-1 text-sm text-red-500">{errors.Stok_Minimum}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
