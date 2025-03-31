import { useState, useEffect } from 'react';
import { productApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProductForm({ product = null, onSuccess, onCancel }) {
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category: '',
    unit: '',
    price: 0,
    stock: 0,
    supplier_code: '',
    barcode: '',
    min_stock: 0
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with product data if in edit mode
  useEffect(() => {
    if (isEditMode && product) {
      setFormData({
        product_code: product.product_code || '',
        product_name: product.product_name || '',
        category: product.category || '',
        unit: product.unit || '',
        price: product.price || 0,
        stock: product.stock || 0,
        supplier_code: product.supplier_code || '',
        barcode: product.barcode || '',
        min_stock: product.min_stock || 0
      });
    }
  }, [isEditMode, product]);
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert numeric inputs to numbers
    const processedValue = type === 'number' ? 
      (value === '' ? '' : Number(value)) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error for this field when user types
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
    
    if (!formData.product_code.trim()) {
      newErrors.product_code = 'Product code is required';
    }
    
    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }
    
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    if (formData.min_stock < 0) {
      newErrors.min_stock = 'Minimum stock cannot be negative';
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
      
      if (isEditMode) {
        // Update existing product
        response = await productApi.update(product.id, formData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        response = await productApi.create(formData);
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
        
        if (apiErrors.detail) {
          toast.error(apiErrors.detail);
        } else {
          toast.error('Failed to save product');
        }
        
        // Map API validation errors to form fields
        if (apiErrors.errors) {
          const fieldErrors = {};
          apiErrors.errors.forEach(err => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        }
      } else {
        toast.error('An error occurred while saving the product');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Code */}
        <div>
          <label htmlFor="product_code" className="block text-sm font-medium text-gray-700 mb-1">
            Product Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="product_code"
            name="product_code"
            value={formData.product_code}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.product_code ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isEditMode} // Don't allow editing product code in edit mode
          />
          {errors.product_code && (
            <p className="mt-1 text-sm text-red-500">{errors.product_code}</p>
          )}
        </div>
        
        {/* Product Name */}
        <div>
          <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="product_name"
            name="product_name"
            value={formData.product_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.product_name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.product_name && (
            <p className="mt-1 text-sm text-red-500">{errors.product_name}</p>
          )}
        </div>
        
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.category && (
            <p className="mt-1 text-sm text-red-500">{errors.category}</p>
          )}
        </div>
        
        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
            Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.unit ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.unit && (
            <p className="mt-1 text-sm text-red-500">{errors.unit}</p>
          )}
        </div>
        
        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">Rp</span>
            </div>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-sm text-red-500">{errors.price}</p>
          )}
        </div>
        
        {/* Stock */}
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="stock"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            min="0"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.stock ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.stock && (
            <p className="mt-1 text-sm text-red-500">{errors.stock}</p>
          )}
        </div>
        
        {/* Supplier Code */}
        <div>
          <label htmlFor="supplier_code" className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Code
          </label>
          <input
            type="text"
            id="supplier_code"
            name="supplier_code"
            value={formData.supplier_code}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Barcode */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Minimum Stock */}
        <div>
          <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Stock
          </label>
          <input
            type="number"
            id="min_stock"
            name="min_stock"
            value={formData.min_stock}
            onChange={handleChange}
            min="0"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.min_stock ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.min_stock && (
            <p className="mt-1 text-sm text-red-500">{errors.min_stock}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            isEditMode ? 'Update Product' : 'Create Product'
          )}
        </button>
      </div>
    </form>
  );
}
