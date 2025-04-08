import React from 'react';

export default function PricesTab({ prices, units, handlePriceChange }) {
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-800">Harga Produk</h3>
      
      <div className="space-y-4">
        {prices.map((price, index) => {
          const matchingUnit = units.find(unit => unit.Nama_Satuan === price.unitName) || {};
          
          return (
            <div key={index} className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="mb-3">
                <h4 className="text-md font-medium text-gray-700">
                  Harga untuk <span className="bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded font-semibold">{price.unitName || 'Satuan Belum Dipilih'}</span>
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor={`price-min-qty-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Minimal Qty
                  </label>
                  <input
                    type="number"
                    id={`price-min-qty-${index}`}
                    name="Minimal_Qty"
                    value={price.Minimal_Qty || ''}
                    onChange={(e) => handlePriceChange(e, index)}
                    className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimal pembelian"
                    min="1"
                    step="1"
                  />
                </div>
                
                <div>
                  <label htmlFor={`price-max-qty-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimal Qty
                  </label>
                  <input
                    type="number"
                    id={`price-max-qty-${index}`}
                    name="Maksimal_Qty"
                    value={price.Maksimal_Qty || ''}
                    onChange={(e) => handlePriceChange(e, index)}
                    className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kosongkan jika tidak ada batas"
                    min={price.Minimal_Qty > 0 ? price.Minimal_Qty : 1}
                    step="1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor={`price-cost-${index}`} className="block text-sm font-medium text-gray-700">
                      Harga Pokok (HPP)
                    </label>
                    {price.Harga_Pokok_Sebelumnya > 0 && (
                      <span className="text-xs text-gray-500">
                        Sebelumnya: {formatCurrency(price.Harga_Pokok_Sebelumnya)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">Rp</span>
                    </div>
                    <input
                      type="number"
                      id={`price-cost-${index}`}
                      name="Harga_Pokok"
                      value={price.Harga_Pokok || ''}
                      onChange={(e) => handlePriceChange(e, index)}
                      className="w-full rounded-md bg-white border border-gray-300 text-gray-800 pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Harga pokok"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor={`price-selling-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Jual
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">Rp</span>
                    </div>
                    <input
                      type="number"
                      id={`price-selling-${index}`}
                      name="Harga_Jual"
                      value={price.Harga_Jual || ''}
                      onChange={(e) => handlePriceChange(e, index)}
                      className="w-full rounded-md bg-white border border-gray-300 text-gray-800 pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Harga jual"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
              </div>
              
              {price.Harga_Pokok > 0 && price.Harga_Jual > 0 && (
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Margin:</span>
                    <span className={`text-sm font-medium ${
                      ((price.Harga_Jual - price.Harga_Pokok) / price.Harga_Pokok) * 100 < 
                      (matchingUnit.Threshold_Margin || 0) 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {price.Harga_Pokok > 0 
                        ? ((price.Harga_Jual - price.Harga_Pokok) / price.Harga_Pokok * 100).toFixed(2) 
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Profit:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {formatCurrency(price.Harga_Jual - price.Harga_Pokok)}
                    </span>
                  </div>
                  {price.Harga_Pokok_Sebelumnya > 0 && price.Harga_Pokok_Sebelumnya !== price.Harga_Pokok && (
                    <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Perubahan HPP:</span>
                      <span className={`text-sm font-medium ${
                        price.Harga_Pokok > price.Harga_Pokok_Sebelumnya ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {((price.Harga_Pokok - price.Harga_Pokok_Sebelumnya) / price.Harga_Pokok_Sebelumnya * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p>Catatan: Anda dapat mengatur harga berbeda untuk setiap satuan dan berdasarkan jumlah pembelian.</p>
      </div>
    </div>
  );
} 