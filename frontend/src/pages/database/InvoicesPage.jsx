import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { format } from 'date-fns';

// Mock data for testing - will be replaced with API calls
const mockInvoices = [
  {
    id: 1,
    invoice_number: "SSP318905",
    supplier_name: "PT SUKSES SEJATI PERKASA",
    date: "2025-02-26",
    due_date: "2025-03-05",
    total_amount: 17423388,
    status: "processed",
    edited: true,
    created_at: "2025-03-30T14:23:45Z"
  },
  {
    id: 2,
    invoice_number: "INV/2025/03/001",
    supplier_name: "CV MITRA ABADI",
    date: "2025-03-15",
    due_date: "2025-04-15",
    total_amount: 8750000,
    status: "processed",
    edited: false,
    created_at: "2025-03-29T09:12:30Z"
  },
  {
    id: 3,
    invoice_number: "FKT/2025/123",
    supplier_name: "PT SENTOSA JAYA",
    date: "2025-03-10",
    due_date: "2025-04-10",
    total_amount: 12450000,
    status: "processed",
    edited: true,
    created_at: "2025-03-28T16:45:20Z"
  },
  {
    id: 4,
    invoice_number: "INV-2025-0456",
    supplier_name: "PT MAKMUR SEJAHTERA",
    date: "2025-03-05",
    due_date: "2025-04-05",
    total_amount: 5678900,
    status: "processed",
    edited: true,
    created_at: "2025-03-27T11:30:15Z"
  },
  {
    id: 5,
    invoice_number: "F-2025-789",
    supplier_name: "CV BERKAH UTAMA",
    date: "2025-03-01",
    due_date: "2025-03-31",
    total_amount: 3456000,
    status: "processed",
    edited: false,
    created_at: "2025-03-26T13:20:10Z"
  }
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function InvoicesPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewMode, setViewMode] = useState('edited'); // 'edited' or 'raw'

  // Fetch invoices data
  useEffect(() => {
    // Simulate API call
    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would be an API call
        // const response = await fetch('/api/invoices');
        // const data = await response.json();
        
        // Using mock data for now
        setTimeout(() => {
          setInvoices(mockInvoices);
          setIsLoading(false);
        }, 800); // Simulate network delay
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.supplier_name.toLowerCase().includes(searchLower) ||
      invoice.status.toLowerCase().includes(searchLower)
    );
  });

  // Handle invoice selection
  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Invoice Database</h1>
        <p className="text-gray-600 mt-2">View and manage all processed invoices</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search invoices by number, supplier, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Invoices List */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Invoices</h2>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No invoices found matching your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr 
                        key={invoice.id} 
                        onClick={() => handleInvoiceSelect(invoice)}
                        className={classNames(
                          "cursor-pointer hover:bg-gray-50 transition-colors",
                          selectedInvoice?.id === invoice.id ? "bg-blue-50" : ""
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                              <div className="text-sm text-gray-500">{formatDate(invoice.created_at)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.supplier_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(invoice.date)}</div>
                          <div className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={classNames(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            invoice.edited ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          )}>
                            {invoice.edited ? "Edited" : "Original"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Detail View */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-800">
                {selectedInvoice ? 'Invoice Details' : 'Select an Invoice'}
              </h2>
              
              {selectedInvoice && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('edited')}
                    className={classNames(
                      "px-3 py-1 rounded text-sm font-medium",
                      viewMode === 'edited' 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    )}
                  >
                    Edited
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={classNames(
                      "px-3 py-1 rounded text-sm font-medium",
                      viewMode === 'raw' 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    )}
                  >
                    Raw
                  </button>
                </div>
              )}
            </div>
            
            {!selectedInvoice ? (
              <div className="p-6 text-center text-gray-500 h-64 flex items-center justify-center">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select an invoice from the list to view details</p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedInvoice.invoice_number}</h3>
                    <p className="text-gray-600">{selectedInvoice.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Invoice Date</div>
                    <div className="font-medium">{formatDate(selectedInvoice.date)}</div>
                    <div className="text-sm text-gray-500 mt-2">Due Date</div>
                    <div className="font-medium">{formatDate(selectedInvoice.due_date)}</div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-800 mb-3">
                    {viewMode === 'edited' ? 'Edited Invoice Data' : 'Raw OCR Data'}
                  </h4>
                  
                  {viewMode === 'edited' ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">This is the edited version of the invoice after manual corrections.</p>
                      
                      {/* Placeholder for edited invoice data */}
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium">{selectedInvoice.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Edited:</span>
                          <span className="font-medium">{formatDate(selectedInvoice.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h5 className="font-medium text-gray-700 mb-2">Items</h5>
                        <div className="bg-white rounded border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {/* Placeholder items - would be populated from actual data */}
                              <tr>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">MILO ACTIV-GO UHT Cabk 110ml/36</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">5 CTN</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp95.570</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp477.850</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">MILO ACTIV-GO UHT Cabk 180ml/36</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">5 CTN</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp163.490</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp817.450</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">DANCOW Coklat Fortigro UHT36x110ml/36</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">5 CTN</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp95.200</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Rp476.000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-right">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                          Export PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">This is the raw OCR data before any manual corrections.</p>
                      
                      {/* Placeholder for raw OCR data */}
                      <div className="mt-4">
                        <div className="bg-gray-100 p-3 rounded">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap">
{`{
  "invoice_number": "${selectedInvoice.invoice_number}",
  "supplier_name": "${selectedInvoice.supplier_name}",
  "date": "${selectedInvoice.date}",
  "due_date": "${selectedInvoice.due_date}",
  "total_amount": ${selectedInvoice.total_amount},
  "status": "${selectedInvoice.status}",
  "items": [
    {
      "kode_barang_invoice": { "value": "12540202", "is_confident": true },
      "nama_barang_invoice": { "value": "MILO ACTIV-GO UHT Cabk 110ml/36", "is_confident": true },
      "qty": { "value": 5, "is_confident": true },
      "satuan": { "value": "CTN", "is_confident": true },
      "harga_satuan": { "value": 95570, "is_confident": true },
      "harga_bruto": { "value": 477850, "is_confident": true }
    },
    {
      "kode_barang_invoice": { "value": "12540203", "is_confident": false },
      "nama_barang_invoice": { "value": "MILO ACTIV-GO UHT Cabk 180ml/36", "is_confident": true },
      "qty": { "value": 5, "is_confident": false },
      "satuan": { "value": "CTN", "is_confident": true },
      "harga_satuan": { "value": 163490, "is_confident": true },
      "harga_bruto": { "value": 817450, "is_confident": true }
    }
  ]
}`}
                          </pre>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-right">
                        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                          View Full JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
