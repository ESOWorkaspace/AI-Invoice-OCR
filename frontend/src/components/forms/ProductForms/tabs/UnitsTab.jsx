import React from 'react';

export default function UnitsTab({ 
  units, 
  handleUnitChange, 
  handleAddUnit, 
  handleRemoveUnit, 
  errors = {} 
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Satuan Produk</h3>
        <button
          type="button"
          onClick={handleAddUnit}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Tambah Satuan
        </button>
      </div>
      
      <div className="space-y-4">
        {units.map((unit, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-md font-medium text-gray-700">Satuan #{index + 1}</h4>
              {units.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveUnit(index)}
                  className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  Hapus
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor={`unit-name-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Satuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id={`unit-name-${index}`}
                  name="Nama_Satuan"
                  value={unit.Nama_Satuan || ''}
                  onChange={(e) => handleUnitChange(e, index)}
                  className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan nama satuan"
                  required
                />
                {errors[`unit_${index}_name`] && (
                  <p className="mt-1 text-sm text-red-500">{errors[`unit_${index}_name`]}</p>
                )}
              </div>
              
              <div>
                <label htmlFor={`unit-ratio-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Dalam Satuan Dasar <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-500">(konversi)</span>
                </label>
                <input
                  type="number"
                  id={`unit-ratio-${index}`}
                  name="Jumlah_Dalam_Satuan_Dasar"
                  value={unit.Jumlah_Dalam_Satuan_Dasar || ''}
                  onChange={(e) => handleUnitChange(e, index)}
                  className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Jumlah dalam satuan dasar"
                  min="1"
                  step="any"
                  required
                />
                {errors[`unit_${index}_ratio`] && (
                  <p className="mt-1 text-sm text-red-500">{errors[`unit_${index}_ratio`]}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`supplier-unit-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                  Satuan Supplier
                </label>
                <input
                  type="text"
                  id={`supplier-unit-${index}`}
                  name="Satuan_Supplier"
                  value={unit.Satuan_Supplier || ''}
                  onChange={(e) => handleUnitChange(e, index)}
                  className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan satuan supplier"
                />
              </div>
              
              <div>
                <label htmlFor={`threshold-margin-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                  Batas Margin
                </label>
                <input
                  type="number"
                  id={`threshold-margin-${index}`}
                  name="Threshold_Margin"
                  value={unit.Threshold_Margin || ''}
                  onChange={(e) => handleUnitChange(e, index)}
                  className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Persentase minimal margin (opsional)"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {unit.Nama_Satuan && (
              <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                <div className="text-sm text-gray-700">
                  <span className="font-medium text-blue-600">{unit.Nama_Satuan}</span> dipilih sebagai satuan.
                  {unit.Jumlah_Dalam_Satuan_Dasar > 1 ? (
                    <div className="mt-1">
                      <span className="font-medium">Konversi:</span> 1 {unit.Nama_Satuan} = {unit.Jumlah_Dalam_Satuan_Dasar} satuan dasar
                      <div className="mt-1 text-xs text-gray-600">
                        Nilai konversi ini digunakan untuk menghitung jumlah stok dan harga antar satuan.
                        Satuan dengan nilai konversi 1 adalah satuan dasar/terkecil.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-gray-600">
                      Dengan nilai konversi 1, {unit.Nama_Satuan} menjadi satuan dasar (satuan terkecil).
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p className="mb-2"><span className="font-medium">Tentang Satuan:</span></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Satuan dasar adalah satuan terkecil dari produk (nilai konversi = 1)</li>
          <li>Nilai konversi menunjukkan berapa banyak satuan dasar dalam satuan ini</li>
          <li>Contoh: Jika 1 BOX = 12 PCS, maka nilai konversi BOX adalah 12</li>
          <li>Konversi digunakan untuk perhitungan otomatis stok dan harga antar satuan</li>
        </ul>
      </div>
    </div>
  );
} 