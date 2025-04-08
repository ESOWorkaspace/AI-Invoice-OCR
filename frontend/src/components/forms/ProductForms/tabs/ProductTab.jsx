import React from 'react';

export default function ProductTab({ productData, handleProductChange, availableCategories = [], errors }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-800">Detail Produk</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kode Item Field */}
        <div>
          <label htmlFor="Kode_Item" className="block text-sm font-medium text-gray-700 mb-2">
            Kode Item <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="Kode_Item"
            name="Kode_Item"
            value={productData.Kode_Item || ''}
            onChange={handleProductChange}
            className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan kode item"
            required
          />
          {errors.Kode_Item && (
            <p className="mt-1 text-sm text-red-500">{errors.Kode_Item}</p>
          )}
        </div>
        
        {/* Supplier Code Field */}
        <div>
          <label htmlFor="Supplier_Code" className="block text-sm font-medium text-gray-700 mb-2">
            Kode Supplier
          </label>
          <input
            type="text"
            id="Supplier_Code"
            name="Supplier_Code"
            value={productData.Supplier_Code || ''}
            onChange={handleProductChange}
            className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan kode supplier"
          />
        </div>
        
        {/* Nama Item Field */}
        <div className="md:col-span-2">
          <label htmlFor="Nama_Item" className="block text-sm font-medium text-gray-700 mb-2">
            Nama Item <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="Nama_Item"
            name="Nama_Item"
            value={productData.Nama_Item || ''}
            onChange={handleProductChange}
            className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan nama item"
            required
          />
          {errors.Nama_Item && (
            <p className="mt-1 text-sm text-red-500">{errors.Nama_Item}</p>
          )}
        </div>
        
        {/* Jenis Field */}
        <div className="md:col-span-2">
          <label htmlFor="Jenis" className="block text-sm font-medium text-gray-700 mb-2">
            Jenis/Kategori
          </label>
          <input
            type="text"
            id="Jenis"
            name="Jenis"
            value={productData.Jenis || ''}
            onChange={handleProductChange}
            className="w-full rounded-md bg-white border border-gray-300 text-gray-800 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan jenis/kategori produk"
          />
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p>Catatan: Field dengan tanda <span className="text-red-500">*</span> wajib diisi</p>
      </div>
    </div>
  );
} 