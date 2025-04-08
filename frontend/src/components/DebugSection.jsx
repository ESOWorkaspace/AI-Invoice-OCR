import React, { useState } from 'react';
import { safeGet } from '../utils/dataHelpers';

/**
 * Component for displaying debug information
 */
const DebugSection = ({ editableData }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Check for debug info in either root or output level
  const rootDebug = safeGet(editableData, 'debug', []);
  const outputDebug = safeGet(editableData, 'output.debug', []);
  const hasDebugMessages = rootDebug.length > 0 || outputDebug.length > 0;
  
  // Use the non-empty debug array or default to empty
  const debugMessages = rootDebug.length > 0 ? rootDebug : outputDebug;
  
  // Check for debug summary in either root or output level
  const rootDebugSummary = safeGet(editableData, 'debug_summary', null);
  const outputDebugSummary = safeGet(editableData, 'output.debug_summary', null);
  const summaryDebug = safeGet(editableData, 'output.summary_debug', null);
  
  // Determine which debug summary to use
  const hasDebugSummary = rootDebugSummary || outputDebugSummary || summaryDebug;
  
  // If there's no debug info, don't render anything
  if (!hasDebugMessages && !hasDebugSummary) {
    return null;
  }
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
      <div 
        className="bg-yellow-50 px-4 py-3 border-b border-yellow-200 flex justify-between items-center cursor-pointer"
        onClick={toggleExpanded}
      >
        <h2 className="text-lg font-medium text-yellow-800">Debug Information</h2>
        <div className="text-yellow-600">
          {expanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4">
          {/* Debug Summary */}
          {hasDebugSummary && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-md font-medium text-yellow-800 mb-2">Summary</h3>
              <p className="text-sm text-yellow-700">
                {rootDebugSummary?.value || 
                 outputDebugSummary?.value || 
                 summaryDebug?.value || 
                 (typeof rootDebugSummary === 'string' ? rootDebugSummary : '') ||
                 (typeof outputDebugSummary === 'string' ? outputDebugSummary : '') ||
                 (typeof summaryDebug === 'string' ? summaryDebug : '') ||
                 JSON.stringify(rootDebugSummary || outputDebugSummary || summaryDebug)}
              </p>
            </div>
          )}
          
          {/* Debug Messages */}
          {hasDebugMessages && (
            <div>
              <h3 className="text-md font-medium text-yellow-800 mb-2">Item Issues</h3>
              <ul className="list-disc pl-5 space-y-2">
                {debugMessages.map((message, index) => {
                  // Handle different debug message formats
                  let content = '';
                  if (typeof message === 'string') {
                    content = message;
                  } else if (message && typeof message === 'object') {
                    // Handle new structure with item and issue fields
                    if (message.item !== undefined && message.issue) {
                      content = `Item ${message.item}: ${message.issue}`;
                    }
                    // Handle old structure with item_index and message fields
                    else if (message.item_index !== undefined && message.message) {
                      content = `Item ${message.item_index + 1}: ${message.message}`;
                    }
                    // Fallback to JSON representation
                    else {
                      content = JSON.stringify(message);
                    }
                  }
                  
                  return (
                    <li key={index} className="text-sm text-yellow-700">
                      {content}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugSection; 