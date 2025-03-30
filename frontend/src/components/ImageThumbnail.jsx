import { useState, useEffect } from 'react';

export default function ImageThumbnail({ file, rotation = 0 }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden shadow-md">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Invoice preview"
          className="w-full h-full object-contain"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-400">Loading...</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 truncate">
        {file.name}
      </div>
    </div>
  );
}
