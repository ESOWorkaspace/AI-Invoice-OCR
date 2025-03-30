import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf']
}

export default function FileUpload({ onFilesUploaded }) {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(file => {
        toast.error(`${file.file.name} is not a valid file. Only JPG, JPEG, PNG, and PDF files are allowed.`)
      })
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      onFilesUploaded(acceptedFiles)
      toast.success(`${acceptedFiles.length} file(s) uploaded successfully`)
    }
  }, [onFilesUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: 26214400, // 25MB
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(file => {
        if (file.errors[0]?.code === 'file-too-large') {
          toast.error(`${file.file.name} is too large. Maximum size is 25MB.`)
        }
      })
    }
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8
        flex flex-col items-center justify-center
        min-h-[200px] cursor-pointer
        transition-all duration-300 ease-in-out
        ${isDragActive
          ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-emerald-50'
          : 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-violet-50/30 to-emerald-50/30 hover:from-violet-100/50 hover:to-emerald-100/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <ArrowUpTrayIcon className={`
        w-12 h-12 mb-4 transition-colors duration-300
        ${isDragActive ? 'text-violet-500' : 'text-emerald-500'}
      `} />
      <p className="text-lg text-center text-gray-800 font-medium mb-2">
        {isDragActive
          ? 'Drop the files here...'
          : 'Drag & drop files here, or click to select files'
        }
      </p>
      <p className="text-sm text-emerald-600">
        Supports JPG, JPEG, PNG, and PDF files (max 25MB)
      </p>
    </div>
  )
}
