import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parseDate } from '../utils/dataFormatters';

/**
 * Renders a date picker component
 * @param {Object} data - Cell data object
 * @param {Function} onChange - Change handler
 * @param {Object} options - Additional options
 * @returns {JSX.Element} Rendered date picker
 */
export const DatePickerComponent = ({ data, onChange, minDate, maxDate }) => {
  const datePickerId = `date-${data?._fieldName || Math.random().toString(36).substring(2, 9)}`;
  const dateValue = data?.value ? parseDate(data.value) : null;
  
  return (
    <div className="w-full h-full">
      <style jsx="true">{`
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker__input-container {
          width: 100%;
        }
        .react-datepicker__input-container input {
          color: #1f2937 !important;
          background-color: transparent !important;
          cursor: pointer;
          width: 100%;
          padding: 0.5rem;
          border: none;
          outline: none;
        }
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .react-datepicker__header {
          background-color: #f3f4f6 !important;
        }
        .react-datepicker__month-select,
        .react-datepicker__year-select {
          background-color: white !important;
          color: #1f2937 !important;
        }
        .react-datepicker__day {
          color: #1f2937 !important;
        }
        .react-datepicker__day--selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        .react-datepicker__current-month {
          color: #1f2937 !important;
        }
        .react-datepicker__day-name {
          color: #6b7280 !important;
        }
      `}</style>
      <DatePicker
        id={datePickerId}
        selected={dateValue}
        onChange={(date) => {
          onChange(date ? date.getTime() : null);
        }}
        dateFormat="dd-MM-yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        placeholderText="DD-MM-YYYY"
        minDate={minDate}
        maxDate={maxDate}
        popperProps={{
          positionFixed: true,
          modifiers: [
            {
              name: "preventOverflow",
              options: {
                rootBoundary: "viewport",
                padding: 8
              }
            },
            {
              name: "offset",
              options: {
                offset: [0, 10]
              }
            }
          ]
        }}
      />
    </div>
  );
};

/**
 * Renders a boolean field with dropdown
 * @param {Object} data - Cell data object
 * @param {Function} onChange - Change handler
 * @param {Array} options - Dropdown options
 * @returns {JSX.Element} Rendered boolean field
 */
export const BooleanField = ({ data, onChange, options = ['Ya', 'Tidak'] }) => {
  const value = data?.value;
  
  // Determine background color based on confidence level
  let bgColor = 'bg-white'; // Default
  
  if (data?.from_database) {
    bgColor = 'bg-green-100'; // Green for database fields
  } else if (value === null || value === undefined) {
    bgColor = 'bg-red-100'; // Red for null values
  } else if (data?.is_confident === false) {
    bgColor = 'bg-orange-100'; // Orange for low confidence
  } else if (data?.is_confident === true) {
    bgColor = 'bg-white'; // White for high confidence
  }
  
  return (
    <select
      value={value === true ? options[0] : options[1]}
      onChange={(e) => onChange(e.target.value === options[0])}
      className={`w-full border-0 focus:ring-0 ${bgColor}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

/**
 * Renders an editable cell based on type
 * @param {Object} item - Cell data
 * @param {Function} onChange - Change handler
 * @param {string} type - Cell type
 * @param {number} rowIndex - Row index
 * @param {string} columnId - Column ID
 * @param {Function} handleProductCellClick - Product cell click handler
 * @returns {JSX.Element} Rendered editable cell
 */
export const EditableCell = ({ item, onChange, type = 'text', rowIndex, columnId, handleProductCellClick = null }) => {
  // Handle product searchable fields differently
  if (['kode_barang_main', 'nama_barang_main'].includes(columnId) && handleProductCellClick) {
    const isEmpty = !item?.value && item?.value !== 0;
    const isSearching = item?._searching === true;
    
    return (
      <div
        id={`cell-${columnId}-${rowIndex}`}
        className={`w-full cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
        onClick={() => handleProductCellClick(rowIndex, columnId, rowIndex)}
      >
        {isSearching ? (
          <div className="flex items-center">
            <span className="mr-2">Loading...</span>
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className={isEmpty ? 'text-gray-400 italic' : ''}>
              {isEmpty ? 'Click to search' : item.value}
            </span>
            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>
    );
  }
  
  // For regular editable fields
  switch (type) {
    case 'number':
      return (
        <input
          type="text"
          value={item?.value !== undefined && item?.value !== null ? item.value : ''}
          onChange={(e) => {
            const val = e.target.value;
            // Allow only numbers, commas, and decimal points
            if (/^[0-9,.\s]*$/.test(val) || val === '') {
              onChange(val);
            }
          }}
          className="w-full border-0 focus:ring-0 bg-transparent"
        />
      );
    
    case 'percentage':
      return (
        <div className="flex items-center">
          <input
            type="text"
            value={item?.value !== undefined && item?.value !== null ? item.value : ''}
            onChange={(e) => {
              const val = e.target.value;
              // Allow only numbers and decimal points for percentages
              if (/^[0-9.\s]*$/.test(val) || val === '') {
                onChange(val);
              }
            }}
            className="w-full border-0 focus:ring-0 bg-transparent"
          />
          <span className="ml-1">%</span>
        </div>
      );
    
    default:
      return (
        <input
          type="text"
          value={item?.value !== undefined && item?.value !== null ? item.value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 focus:ring-0 bg-transparent"
        />
      );
  }
}; 