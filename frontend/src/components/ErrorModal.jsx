import React from 'react';

export default function ErrorModal({ isOpen, onClose, errorMessage }) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Background overlay - removed onClick to prevent closing when clicking outside */}
      <div className="fixed inset-0 z-40 bg-black opacity-50"></div>
      
      {/* Modal content */}
      <div className="relative w-auto max-w-lg mx-auto my-6 z-50">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid rounded-t border-gray-300 bg-red-50">
            <h3 className="text-xl font-semibold text-red-600">
              Error
            </h3>
            <button
              className="float-right p-1 ml-auto text-3xl font-semibold leading-none text-black bg-transparent border-0 outline-none focus:outline-none hover:text-red-500"
              onClick={handleClose}
            >
              <span className="block w-6 h-6 text-gray-600 outline-none focus:outline-none hover:text-red-500">
                ×
              </span>
            </button>
          </div>
          {/* Body */}
          <div className="relative flex-auto p-6 bg-white">
            <p className="my-4 text-gray-700 text-lg leading-relaxed">
              {errorMessage}
            </p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-solid rounded-b border-gray-300 bg-gray-50">
            <button
              className="px-6 py-2 mb-1 mr-1 text-sm font-bold text-white uppercase transition-all duration-150 ease-linear bg-red-500 rounded shadow outline-none hover:bg-red-600 hover:shadow-lg focus:outline-none"
              type="button"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
