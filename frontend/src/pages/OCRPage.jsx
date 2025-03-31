import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import FileUpload from '../components/FileUpload'
import FileList from '../components/FileList'
import ImagePreview from '../components/ImagePreview'
import LoadingSpinner from '../components/LoadingSpinner'
import OCRResultsTable from '../components/OCRResultsTable'
import ImageThumbnail from '../components/ImageThumbnail'
import ErrorModal from '../components/ErrorModal'

// Import mock data for testing
const mockData = [
  {
    jatuh_tempo_epoch: "1741132800",
    is_confident: true,
    tanggal_faktur_epoch: "1740528000",
    is_confident: true,
    output: {
      nomor_referensi: { value: "SSP318905", is_confident: true },
      nama_supplier: { value: "PT SUKSES SEJATI PERKASA", is_confident: true },
      tgl_jatuh_tempo: { value: "05-03-2025", is_confident: true },
      tanggal_faktur: { value: "26-02-2025", is_confident: true },
      tipe_dokumen: { value: "FAKTUR", is_confident: true },
      tipe_pembayaran: { value: "Tidak disebutkan", is_confident: false },
      salesman: { value: "ZUN", is_confident: true },
      include_ppn: { value: true, is_confident: true },
      ppn_rate: { value: 11, is_confident: true },
      margin_threshold: { value: 5, is_confident: true },
      item_keys: ["1", "2", "3", "4", "5", "6", "7"],
      items: [
        {
          kode_barang_invoice: { value: "12540202", is_confident: true },
          nama_barang_invoice: { value: "MILO ACTIV-GO UHT Cabk 110ml/36", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 5, is_confident: true },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 95570, is_confident: true },
          harga_bruto: { value: 477850, is_confident: true },
          diskon_persen: { value: 3, is_confident: true },
          diskon_rp: { value: 14336, is_confident: true },
          jumlah_netto: { value: 463515, is_confident: true },
          ppn: { value: 49397, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 27811, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 18541, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12540203", is_confident: false },
          nama_barang_invoice: { value: "MILO ACTIV-GO UHT Cabk 180ml/36", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 5, is_confident: false },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 163490, is_confident: true },
          harga_bruto: { value: 817450, is_confident: true },
          diskon_persen: { value: 3, is_confident: true },
          diskon_rp: { value: 24524, is_confident: true },
          jumlah_netto: { value: 792927, is_confident: true },
          ppn: { value: 87222, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 47596, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 31758, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12578128", is_confident: true },
          nama_barang_invoice: { value: "DANCOW Coklat Fortigro UHT36x110ml/36", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 5, is_confident: true },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 95200, is_confident: true },
          harga_bruto: { value: 476000, is_confident: true },
          diskon_persen: { value: 3, is_confident: true },
          diskon_rp: { value: 14280, is_confident: true },
          jumlah_netto: { value: 461720, is_confident: true },
          ppn: { value: 49189, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 27643, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 18458, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12579952", is_confident: true },
          nama_barang_invoice: { value: "MILO ACTIV-GO SICH 20((10+1)x22g)/20", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 5, is_confident: true },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 372503, is_confident: true },
          harga_bruto: { value: 1862515, is_confident: true },
          diskon_persen: { value: 3, is_confident: true },
          diskon_rp: { value: 55875, is_confident: true },
          jumlah_netto: { value: 1806640, is_confident: true },
          ppn: { value: 198730, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 108398, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 72330, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12578170", is_confident: true },
          nama_barang_invoice: { value: "DANCO Instant Fortigro BIB 195g/40", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 6, is_confident: true },
          satuan: { value: "PCS", is_confident: true },
          harga_satuan: { value: 24764, is_confident: true },
          harga_bruto: { value: 148584, is_confident: true },
          diskon_persen: { value: 0, is_confident: true },
          diskon_rp: { value: 0, is_confident: true },
          jumlah_netto: { value: 148584, is_confident: true },
          ppn: { value: 16344, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 8927, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 5944, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12578171", is_confident: true },
          nama_barang_invoice: { value: "DANCOW Instant Frtgro SICH16(10x26g)/16", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 15, is_confident: true },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 578450, is_confident: true },
          harga_bruto: { value: 3676750, is_confident: true },
          diskon_persen: { value: 5, is_confident: true },
          diskon_rp: { value: 1426749, is_confident: true },
          jumlah_netto: { value: 8250001, is_confident: false },
          ppn: { value: 247500, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 495000, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 330000, is_confident: true }
        },
        {
          kode_barang_invoice: { value: "12612577", is_confident: true },
          nama_barang_invoice: { value: "DANCOW Fortgr Cok SICH ((10+1)x38g)/16", is_confident: true },
          kode_barang_main: { value: "", is_confident: true },
          nama_barang_main: { value: "", is_confident: true },
          qty: { value: 10, is_confident: true },
          satuan: { value: "CTN", is_confident: true },
          harga_satuan: { value: 578450, is_confident: true },
          harga_bruto: { value: 5734500, is_confident: true },
          diskon_persen: { value: 5, is_confident: true },
          diskon_rp: { value: 284499, is_confident: true },
          jumlah_netto: { value: 5500001, is_confident: false },
          ppn: { value: 600000, is_confident: true },
          margin_persen: { value: "", is_confident: true },
          margin_rp: { value: "", is_confident: true },
          kenaikan_persen: { value: 6, is_confident: true },
          kenaikan_rp: { value: 330000, is_confident: true },
          saran_margin_persen: { value: 4, is_confident: true },
          saran_margin_rp: { value: 220000, is_confident: true }
        }
      ],
      debug: [
        { item_index: 2, message: "Kuantitas diisi \"5\" berdasarkan pola baris sebelumnya karena data asli tidak terbaca." },
        { item_index: 6, message: "Jumlah Netto tidak sesuai (seharusnya ~2.250.001)" },
        { item_index: 7, message: "Jumlah Netto tidak sesuai (seharusnya ~5.450.001)" }
      ],
      summary_debug: {
        value: "Validasi dilakukan pada setiap item, beberapa items tidak memenuhi kriteria validitas.",
        is_confident: false
      },
      debug_summary: {
        total_bruto: 13194149,
        total_diskon: 1820263,
        total_netto: 17423388,
        total_ppn: 1248382,
        total_with_ppn: 18671770
      }
    }
  }
];

// API endpoint configuration
const API_ENDPOINT = import.meta.env.VITE_API_OCR_PROCESS_FILE || 'http://amien-server:1880/testingupload';
const API_TOKEN = import.meta.env.VITE_API_OCR_AUTH_TOKEN || 'a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8';
const SAVE_API_ENDPOINT = import.meta.env.VITE_API_SAVE_ENDPOINT || 'http://localhost:1512/api/ocr/save';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Log environment variables for debugging
console.log('Environment Variables:', {
  API_ENDPOINT,
  API_TOKEN,
  SAVE_API_ENDPOINT,
  DEV: import.meta.env.DEV,
  USE_MOCK_DATA
});

export default function OCRPage() {
  const [files, setFiles] = useState([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ocrResults, setOcrResults] = useState(null)
  // New state to store OCR results for each file
  const [ocrResultsMap, setOcrResultsMap] = useState({})
  // State for error modal
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const resultsRef = useRef(null)

  const handleFilesUploaded = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles])
    if (files.length === 0) {
      setCurrentFileIndex(0)
    }
    toast.success(`${newFiles.length} file(s) uploaded successfully`)
  }

  const handleFileSelect = (index) => {
    setCurrentFileIndex(index)
    setRotation(0) // Reset rotation when switching files
    // Load OCR results for selected image if they exist
    const resultsForSelectedImage = ocrResultsMap[index];
    setOcrResults(resultsForSelectedImage || null)
  }

  const handleFileDelete = (index) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      // Adjust current index if needed
      if (index <= currentFileIndex && currentFileIndex > 0) {
        setCurrentFileIndex(currentFileIndex - 1)
      }
      if (newFiles.length === 0) {
        setCurrentFileIndex(0)
        setRotation(0)
        setOcrResults(null)
        setOcrResultsMap({})
      }
      toast.success('File deleted successfully')
      return newFiles
    })
  }

  const handleProcessFile = async () => {
    if (!files || files.length === 0) {
      toast.error('Please upload a file first');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create a FormData object to send all files
      const formData = new FormData();
      
      // Add all uploaded files to the FormData
      files.forEach((file, index) => {
        formData.append('file', file);
      });
      
      let data;
      let useBackend = true;
      
      // Check if we're in development mode and should use mock data
      if (import.meta.env.DEV && USE_MOCK_DATA) {
        console.log('Using mock data directly (bypassing API call)');
        data = mockData;
        useBackend = false;
      }
      
      // Only make the API call if we're not using mock data
      if (useBackend) {
        try {
          console.log('Attempting to call API at:', API_ENDPOINT);
          // Make the API call to process the files with a timeout of 30 seconds
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': API_TOKEN
            },
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }
          
          data = await response.json();
          console.log('API response received:', data);
          
          // Check if data is an array or object and normalize it
          if (data) {
            // If data is not an array, wrap it in an array
            if (!Array.isArray(data)) {
              data = [data];
            }
            
            // If we have an empty array or the first element doesn't have output, use mock data
            if (data.length === 0 || !data[0] || (!data[0].output && !data[0].jatuh_tempo_epoch)) {
              console.log('API returned invalid data structure, using mock data');
              data = mockData;
            }
            
            // Handle case where data structure is different from expected
            // Some APIs return an array of objects where each property is a separate object
            // instead of a single object with all properties
            if (data.length > 1 && !data[0].output && data[0].jatuh_tempo_epoch) {
              console.log('Detected alternative API response format, normalizing...');
              // This is the case where each property is a separate object in the array
              // We need to combine them into a single object
              const normalizedData = [{
                jatuh_tempo_epoch: data.find(item => item.jatuh_tempo_epoch)?.jatuh_tempo_epoch,
                tanggal_faktur_epoch: data.find(item => item.tanggal_faktur_epoch || item.tannggal_faktur_epoch)?.tanggal_faktur_epoch,
                output: data.find(item => item.output)?.output || {}
              }];
              data = normalizedData;
            }
          }
          
          toast.success('Files processed successfully');
        } catch (error) {
          console.error('Error calling API:', error);
          
          // In development mode, fall back to mock data
          if (import.meta.env.DEV) {
            console.log('API call failed, falling back to mock data');
            data = mockData;
            
            // Show error in modal
            setErrorMessage(`${error.message}\n\nUsing mock data as fallback in development mode.`);
            setErrorModalOpen(true);
          } else {
            // In production, propagate the error
            throw error;
          }
        }
      }
      
      if (data) {
        // Log the normalized data structure
        console.log('Normalized data structure:', data);
        
        // Update the state with the API response for the current file
        if (data[0]) {
          setOcrResults(data[0]);
        }
        
        // Store results for all files
        const newResultsMap = {};
        data.forEach((result, index) => {
          if (index < files.length) {
            newResultsMap[index] = result;
          }
        });
        
        setOcrResultsMap(newResultsMap);
        
        // Scroll to results
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      
      // Show error in modal
      setErrorMessage(error.message || 'An error occurred while processing the files');
      setErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextImage = () => {
    if (currentFileIndex < files.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      setRotation(0);
      // Load OCR results for next image if they exist
      const nextResults = ocrResultsMap[nextIndex];
      // Explicitly set to null if no results exist
      setOcrResults(nextResults ? nextResults : null)
    }
  };

  const handlePrevImage = () => {
    if (currentFileIndex > 0) {
      const prevIndex = currentFileIndex - 1;
      setCurrentFileIndex(prevIndex);
      setRotation(0);
      // Load OCR results for previous image if they exist
      const prevResults = ocrResultsMap[prevIndex];
      // Explicitly set to null if no results exist
      setOcrResults(prevResults ? prevResults : null)
    }
  };

  const handleSubmitData = async () => {
    if (!ocrResults) {
      toast.error('No OCR results to save');
      return;
    }

    setIsSaving(true);
    try {
      // Get the current image data as base64
      const currentImage = files[currentFileIndex];
      let imageData = null;
      
      if (currentImage) {
        console.log('Processing image for submission:', currentImage.name);
        
        // If the image is already in base64 format
        if (typeof currentImage.preview === 'string' && currentImage.preview.startsWith('data:image')) {
          console.log('Image is already in base64 format');
          imageData = currentImage.preview;
        } else {
          // Convert the image to base64
          try {
            console.log('Converting image to base64');
            
            // If current image is a File object
            if (currentImage instanceof File) {
              console.log('Image is a File object, reading directly');
              const reader = new FileReader();
              imageData = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(currentImage);
              });
            } 
            // If current image has a preview URL
            else if (currentImage.preview) {
              console.log('Image has a preview URL, fetching blob');
              const response = await fetch(currentImage.preview);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
              }
              const blob = await response.blob();
              const reader = new FileReader();
              
              imageData = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read blob'));
                reader.readAsDataURL(blob);
              });
            } else {
              throw new Error('Invalid image format');
            }
            
            console.log('Successfully converted image to base64');
          } catch (error) {
            console.error('Error converting image to base64:', error);
            toast.error(`Error preparing image: ${error.message}`);
            // Continue without image data
            imageData = null;
          }
        }
      }

      console.log('Sending data to:', SAVE_API_ENDPOINT);
      console.log('Image data included:', imageData ? 'Yes' : 'No');
      
      // Make a copy of OCR results to avoid modifying the original
      const dataToSend = {
        originalData: ocrResults,
        editedData: ocrResults, // This will contain any edits made in the table
        imageIndex: currentFileIndex,
        imageData: imageData, // Include the base64 image data
      };
      
      // Log the shape of the data being sent without the full image content
      console.log('Data structure being sent:', {
        ...dataToSend,
        imageData: imageData ? `[Base64 string of length ${imageData.length}]` : null
      });
      
      const response = await fetch(SAVE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        let errorMessage = `Server responded with status: ${response.status} ${response.statusText}`;
        
        try {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          
          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = `Failed to save data: ${errorJson.detail || errorJson.message || errorMessage}`;
          } catch (parseError) {
            // If not JSON, use the raw text if it exists
            if (errorText && errorText.trim()) {
              errorMessage = `Failed to save data: ${errorText}`;
            }
          }
        } catch (responseError) {
          console.error('Error reading response:', responseError);
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Save result:', result);
      toast.success('Data saved successfully!');
      
      // If image was saved successfully and has an ID, we could do something with it here
      if (result && result.id) {
        console.log(`Invoice saved with ID: ${result.id}`);
      }
    } catch (error) {
      console.error('Failed to save data:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error. Please try again'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataChange = (newData) => {
    setOcrResults(newData);
    // Update results in the map when data changes
    setOcrResultsMap(prev => ({
      ...prev,
      [currentFileIndex]: newData
    }));
  };

  return (
    <div className="w-full h-full">
      <div className="w-full h-full flex flex-col">
        <main className="flex-1 w-full px-6 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto">
            <header className="text-center my-4">
              <h1 className="text-3xl font-bold text-gray-800 mb-1">
                📄 Modern OCR Interface
              </h1>
              <p className="text-emerald-600 text-sm">
                Upload multiple files for OCR processing
              </p>
            </header>

            <div className="flex flex-col items-center justify-center w-full">
              {files.length === 0 ? (
                <div className="w-full max-w-3xl mx-auto">
                  <FileUpload onFilesUploaded={handleFilesUploaded} />
                </div>
              ) : (
                <>
                  <div className="w-full mb-8">
                    <FileUpload onFilesUploaded={handleFilesUploaded} />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    <div>
                      <h2 className="text-2xl font-semibold mb-4 text-gray-800">File List</h2>
                      <FileList
                        files={files}
                        currentIndex={currentFileIndex}
                        onFileSelect={handleFileSelect}
                        onFileDelete={handleFileDelete}
                      />
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setFiles([])
                            setCurrentFileIndex(0)
                            setRotation(0)
                            setOcrResults(null)
                            setOcrResultsMap({})
                            toast.success('All files cleared')
                          }}
                          className="px-4 py-2 text-sm text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          Clear All Files
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Preview</h2>
                      {files[currentFileIndex] ? (
                        <ImagePreview
                          file={files[currentFileIndex]}
                          rotation={rotation}
                          onRotate={setRotation}
                          onNext={handleNextImage}
                          onPrev={handlePrevImage}
                          isFirst={currentFileIndex === 0}
                          isLast={currentFileIndex === files.length - 1}
                        />
                      ) : null}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleProcessFile}
                          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-emerald-600 text-white rounded-lg 
                            hover:from-violet-700 hover:to-emerald-700 focus:outline-none focus:ring-2 
                            focus:ring-violet-500 focus:ring-offset-2 shadow-md transition-all
                            hover:shadow-lg active:shadow"
                        >
                          Process File
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isProcessing && <LoadingSpinner />}

              {files.length > 0 && (
                <div ref={resultsRef} className="mt-8 w-full scroll-mt-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold text-gray-800">OCR Results</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {ocrResults ? 'Extracted from: ' : 'Ready to process: '}{files[currentFileIndex]?.name}
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={handlePrevImage}
                            disabled={currentFileIndex === 0}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous Image
                          </button>
                          <button
                            onClick={handleNextImage}
                            disabled={currentFileIndex === files.length - 1}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next Image
                          </button>
                        </div>
                        <button
                          onClick={handleSubmitData}
                          disabled={isSaving || !ocrResults}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 
                            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 
                            disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full"
                        >
                          {isSaving ? 'Saving...' : 'Save Data'}
                        </button>
                      </div>
                      <ImageThumbnail 
                        file={files[currentFileIndex]}
                        rotation={rotation}
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {ocrResults ? (
                      <OCRResultsTable 
                        data={ocrResults} 
                        onDataChange={handleDataChange}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No OCR results available for this image.</p>
                        <p className="text-sm mt-2">Click "Process File" to extract data from this image.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {/* Error Modal */}
      <ErrorModal 
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        errorMessage={errorMessage}
      />
    </div>
  )
}
