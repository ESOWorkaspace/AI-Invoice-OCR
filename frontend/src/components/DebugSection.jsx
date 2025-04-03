import React from 'react';
import { safeGet } from '../utils/dataHelpers';

/**
 * Component for displaying debug information
 */
const DebugSection = ({ editableData }) => {
  const hasDebugMessages = safeGet(editableData, 'output.debug', []).length > 0;
  const hasDebugSummary = (
    safeGet(editableData, 'output.debug_summary', {}) || 
    safeGet(editableData, 'output.summary_debug', {})
  );
  
  if (!hasDebugMessages && !hasDebugSummary) {
    return null;
  }
  
  return (
    <>
      {/* Debug Messages */}
      {hasDebugMessages && (
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Debug Messages</h2>
          </div>
          <div className="p-4">
            <ul className="list-disc pl-5 space-y-2">
              {safeGet(editableData, 'output.debug', []).map((message, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {typeof message === 'string' 
                    ? message 
                    : message && typeof message === 'object'
                      ? (message.message || JSON.stringify(message))
                      : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Debug Summary */}
      {hasDebugSummary && (
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Debug Summary</h2>
          </div>
          <div className="p-4">
            {/* Handle summary_debug with value property */}
            {safeGet(editableData, 'output.summary_debug', {}) && (
              <p className="text-sm text-gray-700 mb-4">
                {typeof safeGet(editableData, 'output.summary_debug', {}) === 'object' && safeGet(editableData, 'output.summary_debug', {}) !== null
                  ? (
                      // Check if object is empty before displaying
                      Object.keys(safeGet(editableData, 'output.summary_debug', {})).length === 0 
                      ? '' 
                      : (safeGet(editableData, 'output.summary_debug.value', '') || JSON.stringify(safeGet(editableData, 'output.summary_debug', {})))
                    )
                  : safeGet(editableData, 'output.summary_debug', '')
                }
              </p>
            )}
            
            {/* Handle debug_summary */}
            {safeGet(editableData, 'output.debug_summary', {}) && (
              <p className="text-sm text-gray-700">
                {typeof safeGet(editableData, 'output.debug_summary', {}) === 'object' && safeGet(editableData, 'output.debug_summary', {}) !== null
                  ? (
                      // Check if object is empty before displaying
                      Object.keys(safeGet(editableData, 'output.debug_summary', {})).length === 0
                      ? ''
                      : (safeGet(editableData, 'output.debug_summary.value', '') || JSON.stringify(safeGet(editableData, 'output.debug_summary', {})))
                    )
                  : safeGet(editableData, 'output.debug_summary', '')
                }
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DebugSection; 