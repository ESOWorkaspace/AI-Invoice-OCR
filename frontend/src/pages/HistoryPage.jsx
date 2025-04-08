import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';

// Debug flag - set to true to enable more detailed logging
const DEBUG = true;

export default function HistoryPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [error, setError] = useState(null);
  const [productDetails, setProductDetails] = useState({});
  
  // Helper function for debugger logging
  const debugLog = (message, data) => {
    if (DEBUG) {
      console.log(`[HistoryPage] ${message}`, data);
    }
  };
  
  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        debugLog('Fetching invoices from:', `${API_BASE_URL}/api/invoices`);
        
        const response = await axios.get(`${API_BASE_URL}/api/invoices`, {
          timeout: 15000 // 15s timeout
        });
        
        debugLog('API Response:', response.data);
        
        if (response.data && Array.isArray(response.data.data)) {
          // New response format with pagination
          setInvoices(response.data.data);
          debugLog('Parsed invoices count:', response.data.data.length);
        } else if (response.data && Array.isArray(response.data)) {
          // Older/alternative response format (direct array)
          setInvoices(response.data);
          debugLog('Parsed invoices count:', response.data.length);
        } else {
          console.error('Unexpected response format:', response.data);
          setError('Received invalid data format from server');
          toast.error('Failed to parse invoice data. Please try refreshing the page.');
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        
        // Provide more detailed error information
        let errorMessage = 'Failed to fetch invoices';
        let userMessage = 'Could not load invoice data. Please try again later.';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const statusCode = error.response.status;
          errorMessage = error.response.data?.error?.message || 
                        error.response.data?.message || 
                        `Server error: ${statusCode}`;
          
          // Customize message based on status code
          if (statusCode === 500) {
            userMessage = 'There was a problem with the server. The development team has been notified.';
            // Additional details for debugging
            if (error.response.data?.error?.details) {
              debugLog('Error details:', error.response.data.error.details);
            }
          } else if (statusCode === 404) {
            userMessage = 'The invoice data endpoint could not be found. Please check your configuration.';
          } else if (statusCode === 403) {
            userMessage = 'You do not have permission to access invoice data.';
          }
          
          debugLog('Error response data:', error.response.data);
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response from server';
          userMessage = 'Could not connect to the server. Please check your internet connection.';
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = error.message || 'Unknown error occurred';
          userMessage = 'An unexpected error occurred. Please try refreshing the page.';
        }
        
        // Log the detailed error for debugging
        debugLog('Error details:', errorMessage);
        
        // Set the error for UI display and show toast notification
        setError(userMessage);
        toast.error(userMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);
  
  // Format date strings
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Format currency values
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage values
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${parseFloat(value).toFixed(2)}%`;
  };
  
  // Toggle row expansion
  const toggleRowExpansion = async (invoiceId) => {
    // If already expanded, just close it
    if (expandedRows[invoiceId]) {
      setExpandedRows(prev => {
        const newState = { ...prev };
        delete newState[invoiceId];
        return newState;
      });
      return;
    }
    
    // If not expanded, load the product details
    try {
      // Check if we already have the details cached
      if (!productDetails[invoiceId]) {
        debugLog(`Fetching product details for invoice ID:`, invoiceId);
        
        const response = await axios.get(`${API_BASE_URL}/api/invoices/${invoiceId}/details`, {
          timeout: 10000 // 10s timeout
        });
        
        debugLog('Product details response:', response.data);
        
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          // Cache the product details
          setProductDetails(prev => ({
            ...prev,
            [invoiceId]: response.data.data
          }));
          debugLog(`Found ${response.data.data.length} items for invoice`, invoiceId);
        } else if (response.data && Array.isArray(response.data)) {
          // Alternative format (direct array)
          setProductDetails(prev => ({
            ...prev,
            [invoiceId]: response.data
          }));
          debugLog(`Found ${response.data.length} items for invoice`, invoiceId);
        } else if (response.data && Array.isArray(response.data.items)) {
          // Another possible format with items array
          setProductDetails(prev => ({
            ...prev,
            [invoiceId]: response.data.items
          }));
          debugLog(`Found ${response.data.items.length} items for invoice`, invoiceId);
        } else {
          console.error('Unexpected product details format:', response.data);
          toast.error('Failed to load product details: invalid data format');
          return;
        }
      }
      
      // Mark the row as expanded
      setExpandedRows(prev => ({
        ...prev,
        [invoiceId]: true
      }));
    } catch (error) {
      console.error('Error fetching product details:', error);
      let errorMessage = 'Error loading product details';
      
      if (error.response) {
        const statusCode = error.response.status;
        errorMessage = error.response.data?.error?.message || 
                      `Server error (${statusCode})`;
        
        if (statusCode === 404) {
          errorMessage = 'No details found for this invoice';
        }
      } else if (error.request) {
        errorMessage = 'Could not connect to server';
      } else {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };
  
  // Render expanded product details
  const renderProductDetails = (invoiceId) => {
    const details = productDetails[invoiceId] || [];
    
    if (details.length === 0) {
      return (
        <tr>
          <td colSpan="11" className="px-4 py-2 text-center text-gray-500">
            No product details available
          </td>
        </tr>
      );
    }
    
    return (
      <>
        <tr className="bg-gray-50">
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Barang</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barang</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Dasar</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kenaikan %</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kenaikan Rp</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saran Kenaikan %</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saran Kenaikan Rp</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diskon</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Harga</th>
        </tr>
        {details.map((product, idx) => (
          <tr key={`${invoiceId}-${idx}`} className="hover:bg-gray-50">
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.product_code || product.kode_barang_main || product.kode_barang}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.product_name || product.nama_barang_main || product.nama_barang}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.base_price || product.harga_dasar_main || product.harga_pokok)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.price_increase_percent || product.kenaikan_persen)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.price_increase_amount || product.kenaikan_rp)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.suggested_increase_percent || product.saran_kenaikan_persen)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.suggested_increase_amount || product.saran_kenaikan_rp)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.quantity || product.qty}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.unit || product.satuan_main || product.satuan}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.discount || product.diskon_persen)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.total_price || product.jumlah_netto || product.total)}</td>
          </tr>
        ))}
      </>
    );
  };
  
  // Main render function
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoice History</h1>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold">Error Loading Data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Include Tax</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-4 text-center text-gray-500">
                      {error ? 'Error loading invoice data' : 'No invoices found'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice, index) => (
                    <React.Fragment key={invoice.id || invoice.invoice_id || index}>
                      <tr 
                        className={`hover:bg-gray-50 ${expandedRows[invoice.id || invoice.invoice_id] ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleRowExpansion(invoice.id || invoice.invoice_id)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button className="focus:outline-none">
                            <svg 
                              className={`h-5 w-5 transform transition-transform ${expandedRows[invoice.id || invoice.invoice_id] ? 'rotate-90' : ''}`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoices.length - index}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.document_type || 'Invoice'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.supplier_name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.due_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.include_tax ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.salesman || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.tax_rate || '0'}%</td>
                      </tr>
                      {expandedRows[invoice.id || invoice.invoice_id] && (
                        <tr>
                          <td colSpan="10" className="px-0 py-0 border-b">
                            <div className="bg-gray-100 p-4">
                              <h3 className="text-md font-semibold mb-3">Product Details</h3>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border">
                                  <tbody>
                                    {renderProductDetails(invoice.id || invoice.invoice_id)}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 