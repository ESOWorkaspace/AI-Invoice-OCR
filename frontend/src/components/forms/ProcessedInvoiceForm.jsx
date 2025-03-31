import { useState, useEffect, useRef } from 'react';
import { invoiceApi, productApi } from '../../services/api';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function ProcessedInvoiceForm({ invoice = null, onSuccess, onCancel }) {
  const isEditMode = !!invoice;
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    document_type: 'Invoice',
    supplier_name: '',
    invoice_date: new Date(),
    due_date: new Date(new Date().setDate(new Date().getDate() + 30)), // Default to 30 days from now
    payment_type: 'Credit',
    include_tax: true,
    salesman: '',
    tax_rate: 11.0,
    items: [],
    image_path: null
  });
  
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date(new Date().setDate(new Date().getDate() + 30)));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  
  // Item management
  const [currentItem, setCurrentItem] = useState({
    product_code: '',
    product_name: '',
    quantity: 1,
    unit: 'pcs',
    price: 0,
    total: 0
  });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  
  // Initialize form with invoice data if editing
  useEffect(() => {
    if (invoice) {
      // Parse items if they're stored as a string
      let items = [];
      try {
        items = typeof invoice.items === 'string' 
          ? JSON.parse(invoice.items) 
          : (Array.isArray(invoice.items) ? invoice.items : []);
      } catch (error) {
        console.error('Error parsing invoice items:', error);
        items = [];
      }
      
      // Format items for the form
      const formattedItems = items.map(item => {
        // Log the raw item data for debugging
        console.log('Raw item data:', item);
        
        // Extract quantity with fallbacks
        const qty = item.qty !== undefined ? item.qty : 
                   (item.quantity !== undefined ? item.quantity : 0);
                   
        return {
          product_code: item.kode_barang_invoice || item.product_code || '',
          product_name: item.nama_barang_invoice || item.product_name || '',
          quantity: parseFloat(qty),
          unit: item.satuan || item.unit || 'pcs',
          price: parseFloat(item.harga_satuan || item.price || 0),
          total: parseFloat(item.jumlah_netto || item.total || 0)
        };
      });
      
      // Set invoice dates
      if (invoice.invoice_date) {
        const invDate = new Date(invoice.invoice_date);
        setInvoiceDate(invDate);
      }
      
      if (invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        setDueDate(dueDate);
      }
      
      // Load invoice image if available
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';
      
      // We now check for either image_data or image_path
      if (invoice.id) {
        // Updated URL pattern to match the new backend route
        const imageUrl = `${apiBaseUrl}/api/invoices/${invoice.id}/image?t=${new Date().getTime()}`; // Add timestamp to prevent caching
        console.log('Attempting to load invoice image for ID:', invoice.id);
        
        // Always try to load the image from the API endpoint
        setImagePreview(imageUrl);
        
        // Also log so we can debug
        fetch(imageUrl, { method: 'HEAD' })
          .then(response => {
            if (!response.ok) {
              console.error('Image load check failed:', response.status, response.statusText);
              
              // Fallback to image_path if it's a URL
              if (invoice.image_path && invoice.image_path.startsWith('http')) {
                console.log('Falling back to direct image URL:', invoice.image_path);
                setImagePreview(invoice.image_path);
              }
            } else {
              console.log('Image available at endpoint:', imageUrl);
            }
          })
          .catch(error => {
            console.error('Error checking image availability:', error);
          });
      } else if (invoice.image_path && invoice.image_path.startsWith('http')) {
        // Direct URL as fallback
        console.log('Using direct image URL:', invoice.image_path);
        setImagePreview(invoice.image_path);
      }
      
      // Set form data
      setFormData({
        invoice_number: invoice.invoice_number || '',
        document_type: invoice.document_type || 'Invoice',
        supplier_name: invoice.supplier_name || '',
        invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(),
        due_date: invoice.due_date ? new Date(invoice.due_date) : null,
        payment_type: invoice.payment_type || 'Credit',
        include_tax: invoice.include_tax !== undefined ? invoice.include_tax : true,
        salesman: invoice.salesman || '',
        tax_rate: parseFloat(invoice.tax_rate || 11.0),
        items: formattedItems,
        image_path: invoice.image_path || null
      });
    }
  }, [invoice]);
  
  // Update form data when dates change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      invoice_date: invoiceDate,
      due_date: dueDate
    }));
  }, [invoiceDate, dueDate]);
  
  // Calculate total when currentItem changes
  useEffect(() => {
    if (currentItem.quantity && currentItem.price) {
      const total = parseFloat(currentItem.quantity) * parseFloat(currentItem.price);
      setCurrentItem(prev => ({
        ...prev,
        total: isNaN(total) ? 0 : total
      }));
    }
  }, [currentItem.quantity, currentItem.price]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : 
              value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle item field changes
  const handleItemChange = (e) => {
    const { name, value, type } = e.target;
    
    setCurrentItem(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };
  
  // Search for products
  const handleProductSearch = async (query) => {
    if (!query || query.length < 2) {
      setProductSearchResults([]);
      return;
    }
    
    setIsSearchingProducts(true);
    try {
      const results = await productApi.search(query);
      setProductSearchResults(results);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsSearchingProducts(false);
    }
  };
  
  // Select a product from search results
  const handleProductSelect = (product) => {
    setCurrentItem(prev => ({
      ...prev,
      product_code: product.product_code,
      product_name: product.product_name,
      unit: product.unit,
      price: product.price,
      total: prev.quantity * product.price
    }));
    
    setProductSearchResults([]);
  };
  
  // Add or update item
  const handleAddItem = () => {
    // Validate item
    if (!currentItem.product_name || currentItem.quantity <= 0 || currentItem.price <= 0) {
      return;
    }
    
    if (editingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = currentItem;
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
      
      setEditingItemIndex(-1);
    } else {
      // Add new item
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, currentItem]
      }));
    }
    
    // Reset current item
    setCurrentItem({
      product_code: '',
      product_name: '',
      quantity: 1,
      unit: 'pcs',
      price: 0,
      total: 0
    });
    
    setIsAddingItem(false);
  };
  
  // Edit an existing item
  const handleEditItem = (index) => {
    setCurrentItem(formData.items[index]);
    setEditingItemIndex(index);
    setIsAddingItem(true);
  };
  
  // Remove an item
  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };
  
  // Cancel item editing
  const handleCancelItem = () => {
    setCurrentItem({
      product_code: '',
      product_name: '',
      quantity: 1,
      unit: 'pcs',
      price: 0,
      total: 0
    });
    
    setEditingItemIndex(-1);
    setIsAddingItem(false);
    setProductSearchResults([]);
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Invoice number is required';
    }
    
    if (!formData.document_type.trim()) {
      newErrors.document_type = 'Document type is required';
    }
    
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required';
    }
    
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Invoice date is required';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    
    if (!formData.payment_type.trim()) {
      newErrors.payment_type = 'Payment type is required';
    }
    
    if (formData.tax_rate < 0) {
      newErrors.tax_rate = 'Tax rate cannot be negative';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Validate form
      if (!formData.invoice_number) {
        toast.error('Invoice number is required');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.supplier_name) {
        toast.error('Supplier name is required');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        invoice_date: invoiceDate.toISOString(),
        due_date: dueDate ? dueDate.toISOString() : null,
      };
      
      // Add image data if a new image was uploaded
      if (newImageFile) {
        const reader = new FileReader();
        reader.readAsDataURL(newImageFile);
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            submitData.image_data = reader.result;
            resolve();
          };
          reader.onerror = reject;
        });
      } else if (imagePreview && imagePreview.startsWith('data:')) {
        // If we have a data URL but no new file, it might be from a previous edit
        submitData.image_data = imagePreview;
      }
      
      console.log('Submitting form data:', JSON.stringify(submitData));
      
      // Validate items if present
      if (submitData.items) {
        // Ensure items is an array
        if (typeof submitData.items === 'string') {
          try {
            submitData.items = JSON.parse(submitData.items);
          } catch (error) {
            console.error('Error parsing items JSON:', error);
            toast.error('Invalid items format');
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      // Use the prop callback if provided, otherwise use saveInvoice
      if (typeof onSubmit === 'function') {
        onSubmit(submitData);
      } else {
        await saveInvoice(submitData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save invoice');
      setIsSubmitting(false);
    }
  };
  
  const saveInvoice = async (data) => {
    try {
      let response;
      
      // Ensure we have image data if there's a new image
      if (newImageFile && !data.image_data) {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(newImageFile);
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              data.image_data = reader.result;
              resolve();
            };
            reader.onerror = reject;
          });
          console.log("Image data prepared successfully");
        } catch (error) {
          console.error("Error preparing image data:", error);
        }
      }
      
      // Log the data being sent
      console.log(`Saving invoice in ${isEditMode ? 'edit' : 'create'} mode:`, data);
      
      if (isEditMode) {
        response = await invoiceApi.update(invoice.id, data);
      } else {
        response = await invoiceApi.create(data);
      }
      
      console.log(`Invoice ${isEditMode ? 'updated' : 'created'} response:`, response);
      toast.success(`Invoice ${isEditMode ? 'updated' : 'created'} successfully!`);
      onSuccess(response);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} invoice`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setNewImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };
  
  // Remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setNewImageFile(null);
    setFormData(prev => ({ ...prev, image_path: null }));
  };
  
  // Calculate subtotal, tax amount, and total
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = formData.include_tax ? subtotal * (formData.tax_rate / 100) : 0;
  const total = subtotal + taxAmount;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
        </h2>
      </div>
      
      {/* Invoice Image Section */}
      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Image</h3>
        
        <div className="flex flex-col items-center">
          {imagePreview ? (
            <div className="relative mb-4">
              <img 
                src={imagePreview} 
                alt="Invoice Preview" 
                className="max-w-full max-h-64 rounded-md shadow-sm"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                title="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-md mb-4 bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleBrowseClick}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
      
      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Number */}
        <div>
          <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="invoice_number"
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.invoice_number ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
            disabled={isEditMode} // Don't allow editing invoice number in edit mode
          />
          {errors.invoice_number && (
            <p className="mt-1 text-sm text-red-500">{errors.invoice_number}</p>
          )}
        </div>
        
        {/* Document Type */}
        <div>
          <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-1">
            Document Type <span className="text-red-500">*</span>
          </label>
          <select
            id="document_type"
            name="document_type"
            value={formData.document_type}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.document_type ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
          >
            <option value="Invoice">Invoice</option>
            <option value="Receipt">Receipt</option>
            <option value="Bill">Bill</option>
            <option value="Quotation">Quotation</option>
          </select>
          {errors.document_type && (
            <p className="mt-1 text-sm text-red-500">{errors.document_type}</p>
          )}
        </div>
        
        {/* Supplier Name */}
        <div>
          <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="supplier_name"
            name="supplier_name"
            value={formData.supplier_name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.supplier_name ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
          />
          {errors.supplier_name && (
            <p className="mt-1 text-sm text-red-500">{errors.supplier_name}</p>
          )}
        </div>
        
        {/* Invoice Date */}
        <div>
          <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={invoiceDate}
            onChange={(date) => setInvoiceDate(date)}
            dateFormat="dd/MM/yyyy"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.invoice_date ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
          />
          {errors.invoice_date && (
            <p className="mt-1 text-sm text-red-500">{errors.invoice_date}</p>
          )}
        </div>
        
        {/* Due Date */}
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={dueDate}
            onChange={(date) => setDueDate(date)}
            dateFormat="dd/MM/yyyy"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.due_date ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
          />
          {errors.due_date && (
            <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
          )}
        </div>
        
        {/* Payment Type */}
        <div>
          <label htmlFor="payment_type" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Type <span className="text-red-500">*</span>
          </label>
          <select
            id="payment_type"
            name="payment_type"
            value={formData.payment_type}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.payment_type ? 'border-red-500' : 'border-gray-300'
            } text-gray-900 bg-white`}
          >
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Check">Check</option>
          </select>
          {errors.payment_type && (
            <p className="mt-1 text-sm text-red-500">{errors.payment_type}</p>
          )}
        </div>
        
        {/* Include Tax */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="include_tax"
            name="include_tax"
            checked={formData.include_tax}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include_tax" className="ml-2 block text-sm text-gray-700">
            Include Tax
          </label>
        </div>
        
        {/* Tax Rate */}
        <div>
          <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-1">
            Tax Rate (%)
          </label>
          <input
            type="number"
            id="tax_rate"
            name="tax_rate"
            value={formData.tax_rate}
            onChange={handleChange}
            min="0"
            step="0.1"
            disabled={!formData.include_tax}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.tax_rate ? 'border-red-500' : 'border-gray-300'
            } ${!formData.include_tax ? 'bg-gray-100' : 'bg-white'} text-gray-900`}
          />
          {errors.tax_rate && (
            <p className="mt-1 text-sm text-red-500">{errors.tax_rate}</p>
          )}
        </div>
        
        {/* Salesman */}
        <div>
          <label htmlFor="salesman" className="block text-sm font-medium text-gray-700 mb-1">
            Salesman
          </label>
          <input
            type="text"
            id="salesman"
            name="salesman"
            value={formData.salesman}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>
      </div>
      
      {/* Items Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">Items</h3>
          <button
            type="button"
            onClick={() => setIsAddingItem(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Add Item
          </button>
        </div>
        
        {errors.items && (
          <p className="mt-1 text-sm text-red-500">{errors.items}</p>
        )}
        
        {/* Items Table */}
        {formData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-gray-500">{item.product_code}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {new Intl.NumberFormat('id-ID').format(item.price)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {new Intl.NumberFormat('id-ID').format(item.total)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <button
                        type="button"
                        onClick={() => handleEditItem(index)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Summary rows */}
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-3 py-2 text-sm text-right font-medium text-gray-700">
                    Subtotal:
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('id-ID').format(subtotal)}
                  </td>
                  <td></td>
                </tr>
                
                {formData.include_tax && (
                  <tr className="bg-gray-50">
                    <td colSpan="3" className="px-3 py-2 text-sm text-right font-medium text-gray-700">
                      Tax ({formData.tax_rate}%):
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                      {new Intl.NumberFormat('id-ID').format(taxAmount)}
                    </td>
                    <td></td>
                  </tr>
                )}
                
                <tr className="bg-gray-100">
                  <td colSpan="3" className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                    Total:
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                    {new Intl.NumberFormat('id-ID').format(total)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded">
            <p className="text-gray-500">No items added yet</p>
          </div>
        )}
      </div>
      
      {/* Item Form (shown when adding/editing an item) */}
      {isAddingItem && (
        <div className="bg-white p-4 rounded-md shadow">
          <h4 className="text-md font-medium mb-2 text-gray-900">
            {editingItemIndex >= 0 ? 'Edit Item' : 'Add New Item'}
          </h4>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Search Products
              </label>
              <input
                type="text"
                placeholder="Type to search products..."
                onChange={(e) => handleProductSearch(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
              
              {/* Search Results */}
              {productSearchResults.length > 0 && (
                <div className="mt-1 absolute z-10 w-64 bg-white shadow-lg rounded-md border">
                  <ul className="max-h-60 overflow-auto">
                    {productSearchResults.map((product) => (
                      <li 
                        key={product.id} 
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="font-medium text-gray-900">{product.product_name}</div>
                        <div className="text-sm text-gray-500">{product.product_code}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {isSearchingProducts && (
                <div className="mt-1 text-sm text-gray-500">Searching...</div>
              )}
            </div>
            
            {/* Product Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Code
              </label>
              <input
                type="text"
                name="product_code"
                value={currentItem.product_code}
                onChange={handleItemChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>
            
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={currentItem.product_name}
                onChange={handleItemChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
                required
              />
            </div>
            
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={currentItem.quantity}
                onChange={handleItemChange}
                min="0.01"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
                required
              />
            </div>
            
            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit
              </label>
              <input
                type="text"
                name="unit"
                value={currentItem.unit}
                onChange={handleItemChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
              />
            </div>
            
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={currentItem.price}
                onChange={handleItemChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 bg-white"
                required
              />
            </div>
            
            {/* Total (calculated automatically) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total
              </label>
              <input
                type="text"
                value={new Intl.NumberFormat('id-ID').format(currentItem.total || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm text-gray-900 sm:text-sm"
                disabled
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancelItem}
              className="px-3 py-1.5 border border-gray-300 text-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              {editingItemIndex >= 0 ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </div>
      )}
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-2 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-200 rounded text-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Invoice' : 'Create Invoice')}
        </button>
      </div>
    </form>
  );
}
