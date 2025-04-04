import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';

export default function HistoryPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [error, setError] = useState(null);
  const [productDetails, setProductDetails] = useState({});
  
  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/invoices`);
        if (response.data && response.data.success) {
          setInvoices(response.data.data);
        } else {
          setError('Failed to fetch invoices');
          toast.error('Failed to fetch invoice history');
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setError(error.message || 'Failed to fetch invoices');
        toast.error('Error loading invoice history');
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
        const response = await axios.get(`${API_BASE_URL}/api/invoices/${invoiceId}/details`);
        
        if (response.data && response.data.success) {
          // Cache the product details
          setProductDetails(prev => ({
            ...prev,
            [invoiceId]: response.data.data
          }));
        } else {
          toast.error('Failed to load product details');
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
      toast.error('Error loading product details');
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
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.product_code}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.product_name}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.base_price)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.price_increase_percent)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.price_increase_amount)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.suggested_increase_percent)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.suggested_increase_amount)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.quantity}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{product.unit}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatPercentage(product.discount)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.total_price)}</td>
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
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
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
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice, index) => (
                    <React.Fragment key={invoice.id}>
                      <tr 
                        className={`hover:bg-gray-50 ${expandedRows[invoice.id] ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleRowExpansion(invoice.id)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button className="focus:outline-none">
                            <svg 
                              className={`h-5 w-5 transform transition-transform ${expandedRows[invoice.id] ? 'rotate-90' : ''}`} 
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.document_type}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.supplier_name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.due_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.include_tax ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.salesman || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.tax_rate}%</td>
                      </tr>
                      {expandedRows[invoice.id] && (
                        <tr>
                          <td colSpan="10" className="px-0 py-0 border-b">
                            <div className="bg-gray-100 p-4">
                              <h3 className="text-md font-semibold mb-3">Product Details</h3>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border">
                                  <tbody>
                                    {renderProductDetails(invoice.id)}
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