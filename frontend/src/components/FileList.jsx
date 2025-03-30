import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function FileList({ files, currentIndex, onFileSelect, onFileDelete }) {
  const handleDelete = (index, fileName) => {
    onFileDelete(index)
    toast.success(`${fileName} deleted`)
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {files.map((file, index) => (
          <li
            key={file.name}
            className={`
              p-4 hover:bg-gray-50
              ${index === currentIndex ? 'bg-blue-50' : ''}
            `}
          >
            <div className="flex items-center space-x-4">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onFileSelect(index)}
              >
                <div className="flex items-center space-x-4">
                  <DocumentIcon className="h-6 w-6 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(index, file.name)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                title="Delete file"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
