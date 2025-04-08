import React from 'react';

export default function StocksTab({ stocks, units, baseUnit, handleStockChange }) {
  // Pastikan baseUnit tersedia, jika tidak gunakan unit dengan nilai konversi terkecil
  const getBaseUnitName = () => {
    if (baseUnit && baseUnit.Nama_Satuan) {
      return baseUnit.Nama_Satuan;
    }
    
    if (!units.length) return 'unit';
    
    // Cari unit dengan nilai konversi terkecil
    let smallestUnit = units[0];
    for (const unit of units) {
      if (unit.Jumlah_Dalam_Satuan_Dasar < smallestUnit.Jumlah_Dalam_Satuan_Dasar 
          || (unit.Jumlah_Dalam_Satuan_Dasar === smallestUnit.Jumlah_Dalam_Satuan_Dasar 
              && unit.Nama_Satuan.length < smallestUnit.Nama_Satuan.length)) {
        smallestUnit = unit;
      }
    }
    
    return smallestUnit.Nama_Satuan;
  };
  
  const baseUnitName = getBaseUnitName();
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-800">Stok Produk</h3>
      
      <div className="space-y-4">
        {stocks.map((stock, index) => {
          // Find matching unit to get the conversion rate
          const matchingUnit = units.find(unit => unit.Nama_Satuan === stock.unitName) || {};
          const conversionRate = matchingUnit.Jumlah_Dalam_Satuan_Dasar || 1;
          
          return (
            <div key={index} className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="mb-3">
                <h4 className="text-md font-medium text-gray-700">
                  Stok untuk <span className="bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded font-semibold">{stock.unitName || 'Satuan Belum Dipilih'}</span>
                </h4>
              </div>
              
              <div className="mb-4">
                <label htmlFor={`stock-qty-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Stok
                </label>
                <input
                  type="number"
                  id={`stock-qty-${index}`}
                  name="Jumlah_Stok"
                  value={stock.Jumlah_Stok || ''}
                  onChange={(e) => handleStockChange(e, index)}
                  className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan jumlah stok"
                  min="0"
                  step="any"
                />
              </div>
              
              {stock.unitName && conversionRate > 0 && (
                <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Dalam satuan dasar <span className="font-medium text-blue-800">({baseUnitName})</span>:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {Number(stock.Jumlah_Stok || 0) * conversionRate} {baseUnitName}
                    </span>
                  </div>
                  {conversionRate > 1 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <div>Konversi: 1 {stock.unitName} = {conversionRate} {baseUnitName}</div>
                      <div className="mt-1">Stok di-convert otomatis ke satuan dasar ({baseUnitName}) untuk perhitungan internal.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p className="mb-2"><span className="font-medium">Tentang Stok:</span></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Stok dikonversi otomatis antar satuan berdasarkan rasio yang telah Anda tetapkan</li>
          <li>Satuan dasar ({baseUnitName}) digunakan sebagai acuan untuk semua konversi</li>
          <li>Contoh: Jika 1 BOX = 12 PCS, maka stok 2 BOX sama dengan 24 PCS</li>
        </ul>
      </div>
    </div>
  );
} 