import { useRef, useEffect, useState } from 'react'
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function ImagePreview({ file, rotation = 0, onRotate, onNext, onPrev, isFirst, isLast }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const imageRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current
      const container = containerRef.current
      
      const updateDimensions = () => {
        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight
        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight
        const isRotated = rotation % 180 !== 0

        let width, height

        if (isRotated) {
          const rotatedRatio = naturalHeight / naturalWidth
          if (rotatedRatio > 1) {
            height = Math.min(containerHeight, containerWidth * rotatedRatio)
            width = height / rotatedRatio
          } else {
            width = Math.min(containerWidth, containerHeight / rotatedRatio)
            height = width * rotatedRatio
          }
        } else {
          const ratio = naturalWidth / naturalHeight
          if (ratio > 1) {
            width = Math.min(containerWidth, containerHeight * ratio)
            height = width / ratio
          } else {
            height = Math.min(containerHeight, containerWidth / ratio)
            width = height * ratio
          }
        }

        setDimensions({ width, height })
      }

      img.onload = updateDimensions
      updateDimensions()

      const resizeObserver = new ResizeObserver(updateDimensions)
      resizeObserver.observe(container)

      return () => resizeObserver.disconnect()
    }
  }, [rotation, imageUrl])

  if (!file || !imageUrl) {
    return (
      <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">No image selected</p>
      </div>
    )
  }

  return (
    <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '500px' }}>
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-4"
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Preview"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Navigation buttons */}
      <div className="absolute inset-y-0 left-0 flex items-center">
        {!isFirst && (
          <button
            onClick={onPrev}
            className="p-2 m-2 bg-white/90 rounded-full shadow-lg 
              hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500
              transition-colors duration-200"
            title="Previous file"
          >
            <ChevronLeftIcon className="w-6 h-6 text-violet-600" />
          </button>
        )}
      </div>

      <div className="absolute inset-y-0 right-0 flex items-center">
        {!isLast && (
          <button
            onClick={onNext}
            className="p-2 m-2 bg-white/90 rounded-full shadow-lg 
              hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500
              transition-colors duration-200"
            title="Next file"
          >
            <ChevronRightIcon className="w-6 h-6 text-emerald-600" />
          </button>
        )}
      </div>

      {/* Rotate button */}
      <button
        onClick={() => onRotate((prev) => (prev + 90) % 360)}
        className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-lg 
          hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500
          transition-colors duration-200"
        title="Rotate image"
      >
        <ArrowPathIcon className="w-5 h-5 text-violet-600" />
      </button>
    </div>
  )
}
