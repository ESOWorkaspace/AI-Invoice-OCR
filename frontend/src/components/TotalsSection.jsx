import React, { useMemo } from 'react';
import { safeGet } from '../utils/dataHelpers';
import { formatCurrency, parseNumber } from '../utils/dataFormatters';

/**
 * Component for displaying invoice totals
 */
const TotalsSection = ({ editableData }) => {
  // Memoize the total calculations to avoid recalculation on every render
  const totals = useMemo(() => {
    const items = safeGet(editableData, 'output.items', []);
    const includePpn = safeGet(editableData, 'output.include_ppn.value', false);
    
    const jumlahNetto = items.reduce((sum, item) => sum + parseNumber(safeGet(item, 'jumlah_netto.value', 0)), 0);
    const ppnTotal = items.reduce((sum, item) => sum + parseNumber(safeGet(item, 'ppn.value', 0)), 0);
    
    return {
      hargaBruto: items.reduce((sum, item) => sum + parseNumber(safeGet(item, 'harga_bruto.value', 0)), 0),
      diskonRp: items.reduce((sum, item) => sum + parseNumber(safeGet(item, 'diskon_rp.value', 0)), 0),
      jumlahNetto: jumlahNetto,
      ppn: ppnTotal,
      // When include_ppn is true, the total should be the same as jumlahNetto (VAT is already included)
      // When include_ppn is false, add the VAT to the jumlahNetto
      includePpn: includePpn ? jumlahNetto : jumlahNetto + ppnTotal,
      marginRp: items.reduce((sum, item) => sum + parseNumber(safeGet(item, 'margin_rp.value', 0)), 0)
    };
  }, [editableData]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Totals</h2>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-1">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Harga Bruto:</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                    {formatCurrency(totals.hargaBruto)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Diskon Rp:</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                    {formatCurrency(totals.diskonRp)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Jumlah Netto:</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                    {formatCurrency(totals.jumlahNetto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="col-span-1">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total PPN:</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                    {formatCurrency(totals.ppn)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">
                    {safeGet(editableData, 'output.include_ppn.value', false) ? 'Total (PPN Termasuk):' : 'Total (PPN Ditambahkan):'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white font-bold">
                    {formatCurrency(totals.includePpn)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-b border-gray-100 border-r border-gray-50">Total Margin Rp:</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-100 border-r border-gray-50 bg-white">
                    {formatCurrency(totals.marginRp)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalsSection; 