import React from 'react';

export default function VariantsTab({ variants, handleAddVariant, handleRemoveVariant, handleVariantChange, errors = {} }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Varian Produk</h3>
        <button
          type="button"
          onClick={handleAddVariant}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Tambah Varian
        </button>
      </div>
      
      <div className="space-y-4">
        {variants.map((variant, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-md font-medium text-gray-700">Varian #{index + 1}</h4>
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(index)}
                  className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  Hapus
                </button>
              )}
            </div>
            
            <div>
              <label htmlFor={`variant-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi Varian
              </label>
              <input
                type="text"
                id={`variant-${index}`}
                name="Deskripsi"
                value={variant.Deskripsi || ''}
                onChange={(e) => handleVariantChange(e, index)}
                className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Warna Merah, Ukuran S, dll."
              />
              {errors[`variant_${index}`] && (
                <p className="mt-1 text-sm text-red-500">{errors[`variant_${index}`]}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p>Catatan: Gunakan fitur varian untuk menjelaskan perbedaan dalam satu produk yang sama.</p>
      </div>
    </div>
  );
} 