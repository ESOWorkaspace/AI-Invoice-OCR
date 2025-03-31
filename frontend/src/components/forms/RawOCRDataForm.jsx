import { useState, useEffect } from 'react';
import { rawOcrApi } from '../../services/api';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function RawOCRDataForm({ ocrData = null, onSuccess, onCancel }) {
  const isEditMode = !!ocrData;
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date(),
    raw_data: '{}'
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rawDataJson, setRawDataJson] = useState('{}');
  
  // Initialize form with OCR data if in edit mode
  useEffect(() => {
    if (isEditMode && ocrData) {
      // Parse date
      const invoiceDate = ocrData.invoice_date ? new Date(ocrData.invoice_date) : new Date();
      
      // Parse raw data JSON
      let rawData = {};
      try {
        rawData = typeof ocrData.raw_data === 'string' ? JSON.parse(ocrData.raw_data) : ocrData.raw_data || {};
      } catch (error) {
        console.error('Error parsing raw data JSON:', error);
      }
      
      setFormData({
        invoice_number: ocrData.invoice_number || '',
        invoice_date: invoiceDate,
        raw_data: rawData
      });
      
      setRawDataJson(JSON.stringify(rawData, null, 2));
    }
  }, [isEditMode, ocrData]);
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      invoice_date: date
    }));
    
    // Clear error for this field
    if (errors.invoice_date) {
      setErrors(prev => ({
        ...prev,
        invoice_date: null
      }));
    }
  };
  
  // Handle raw data JSON change
  const handleRawDataChange = (e) => {
    setRawDataJson(e.target.value);
    
    try {
      const rawData = JSON.parse(e.target.value);
      setFormData(prev => ({
        ...prev,
        raw_data: rawData
      }));
      
      // Clear error
      if (errors.raw_data) {
        setErrors(prev => ({
          ...prev,
          raw_data: null
        }));
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        raw_data: 'Invalid JSON format'
      }));
    }
  };
  
  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Invoice number is required';
    }
    
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Invoice date is required';
    }
    
    try {
      if (typeof formData.raw_data === 'string') {
        JSON.parse(formData.raw_data);
      }
    } catch (error) {
      newErrors.raw_data = 'Invalid JSON format';
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
    
    // Prepare data for API
    const apiData = {
      ...formData,
      invoice_date: formData.invoice_date.toISOString().split('T')[0],
      raw_data: JSON.stringify(formData.raw_data)
    };
    
    try {
      let response;
      
      if (isEditMode) {
        // Update existing OCR data
        response = await rawOcrApi.update(ocrData.id, apiData);
        toast.success('OCR data updated successfully');
      } else {
        // Create new OCR data
        response = await rawOcrApi.create(apiData);
        toast.success('OCR data created successfully');
      }
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Error saving OCR data:', error);
      
      // Handle API error responses
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        
        if (apiErrors.detail) {
          toast.error(apiErrors.detail);
        } else {
          toast.error('Failed to save OCR data');
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
        toast.error('An error occurred while saving the OCR data');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            }`}
            disabled={isEditMode} // Don't allow editing invoice number in edit mode
          />
          {errors.invoice_number && (
            <p className="mt-1 text-sm text-red-500">{errors.invoice_number}</p>
          )}
        </div>
        
        {/* Invoice Date */}
        <div>
          <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={formData.invoice_date}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.invoice_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.invoice_date && (
            <p className="mt-1 text-sm text-red-500">{errors.invoice_date}</p>
          )}
        </div>
      </div>
      
      {/* Raw Data JSON */}
      <div>
        <label htmlFor="raw_data" className="block text-sm font-medium text-gray-700 mb-1">
          Raw OCR Data (JSON format) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            id="raw_data"
            name="raw_data"
            value={rawDataJson}
            onChange={handleRawDataChange}
            rows={15}
            className={`w-full px-3 py-2 border rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.raw_data ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.raw_data && (
            <p className="mt-1 text-sm text-red-500">{errors.raw_data}</p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Format: {"{"}"text": "OCR extracted text", "confidence": 0.95, "boxes": [[x1, y1, x2, y2], ...]{"}"}
        </p>
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
            isEditMode ? 'Update OCR Data' : 'Create OCR Data'
          )}
        </button>
      </div>
    </form>
  );
}
