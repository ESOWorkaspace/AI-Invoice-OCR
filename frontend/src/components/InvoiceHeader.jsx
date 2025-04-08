import React from 'react';
import { safeGet, getCellBackgroundColor } from '../utils/dataHelpers';
import { DatePickerComponent } from './UIComponents';
import { EditableCell } from './UIComponents';

/**
 * Component for displaying and editing invoice header information
 */
const InvoiceHeader = ({
  editableData,
  handleHeaderChange,
  renderBooleanField,
  handleIncludePPNChange
}) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Invoice Information</h2>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Faktur</label>
              <div className={`border border-gray-200 rounded overflow-hidden ${getCellBackgroundColor(safeGet(editableData, 'output.tanggal_faktur', { value: '', is_confident: false }))}`}>
                <DatePickerComponent
                  data={safeGet(editableData, 'output.tanggal_faktur', { value: '', is_confident: false })}
                  onChange={(value) => handleHeaderChange('tanggal_faktur', value)}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
              <div className={`border border-gray-200 rounded overflow-hidden ${getCellBackgroundColor(safeGet(editableData, 'output.tanggal_jatuh_tempo', { value: '', is_confident: false }))}`}>
                <DatePickerComponent
                  data={safeGet(editableData, 'output.tanggal_jatuh_tempo', { value: '', is_confident: false })}
                  onChange={(value) => handleHeaderChange('tanggal_jatuh_tempo', value)}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Include PPN</label>
              <div className={`border border-gray-200 rounded overflow-hidden ${getCellBackgroundColor(safeGet(editableData, 'output.include_ppn', { value: true, is_confident: true }))}`}>
                {renderBooleanField(
                  safeGet(editableData, 'output.include_ppn', { value: true, is_confident: true }),
                  handleIncludePPNChange
                )}
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                {safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false }) && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">No Invoice:</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.nomor_referensi', { value: '', is_confident: false })} 
                        onChange={(value) => handleHeaderChange('nomor_referensi', value)}
                      />
                    </td>
                  </tr>
                )}
                {safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false }) && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Supplier:</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.nama_supplier', { value: '', is_confident: false })} 
                        onChange={(value) => handleHeaderChange('nama_supplier', value)}
                      />
                    </td>
                  </tr>
                )}
                {/* Conditionally render document type field */}
                {safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false }).value && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Tipe Dokumen:</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.tipe_dokumen', { value: '', is_confident: false })} 
                        onChange={(value) => handleHeaderChange('tipe_dokumen', value)}
                      />
                    </td>
                  </tr>
                )}
                {/* Conditionally render payment type field */}
                {safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false }).value && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Tipe Pembayaran:</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.tipe_pembayaran', { value: '', is_confident: false })} 
                        onChange={(value) => handleHeaderChange('tipe_pembayaran', value)}
                      />
                    </td>
                  </tr>
                )}
                {safeGet(editableData, 'output.salesman', { value: '', is_confident: false }) && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Salesman:</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.salesman', { value: '', is_confident: false })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.salesman', { value: '', is_confident: false })} 
                        onChange={(value) => handleHeaderChange('salesman', value)}
                      />
                    </td>
                  </tr>
                )}
                {safeGet(editableData, 'output.ppn_rate', { value: '11', is_confident: true, from_database: true }) && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">PPN Rate (%):</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 border-r border-gray-50 ${getCellBackgroundColor(safeGet(editableData, 'output.ppn_rate', { value: '11', is_confident: true, from_database: true })) || 'bg-white'}`}>
                      <EditableCell 
                        item={safeGet(editableData, 'output.ppn_rate', { value: '11', is_confident: true, from_database: true })} 
                        onChange={(value) => handleHeaderChange('ppn_rate', value)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader; 