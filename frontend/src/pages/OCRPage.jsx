import { useState, useRef, useEffect } from 'react'
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

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';
const API_TOKEN = import.meta.env.VITE_API_OCR_AUTH_TOKEN || 'a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8';
  
// Buat endpoint dari base URL
const OCR_API_ENDPOINT = import.meta.env.VITE_API_OCR_PROCESS_FILE || 'http://amien-server:1880/testingupload';
const QUEUE_API_ENDPOINT = `${API_BASE_URL}/api/ocr/queue`;
const STATUS_API_ENDPOINT = `${API_BASE_URL}/api/ocr/status`;
const SAVE_API_ENDPOINT = `${API_BASE_URL}/api/ocr/save`;
  
console.log('API Configuration:', {
  API_BASE_URL,
  OCR_API_ENDPOINT,
  QUEUE_API_ENDPOINT,
  STATUS_API_ENDPOINT,
  SAVE_API_ENDPOINT,
  API_TOKEN: API_TOKEN ? '***' : 'undefined' // Tidak menampilkan token utuh
});

export default function OCRPage() {
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  
  // State untuk data OCR dan proses
  const [ocrResults, setOcrResults] = useState(null);
  const [data, setData] = useState([]);
  const [ocrResultsMap, setOcrResultsMap] = useState({});
  
  // State untuk loading dan proses
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State untuk antrian pemrosesan asinkron
  const [processingQueue, setProcessingQueue] = useState([]);
  const [statusPollingActive, setStatusPollingActive] = useState(false); // State untuk status polling
  const [processedResults, setProcessedResults] = useState([]);
  const [fileDataMap, setFileDataMap] = useState({});
  
  const [nomorReferensi, setNomorReferensi] = useState("");
  const [namaSupplier, setNamaSupplier] = useState("");
  const [tglJatuhTempo, setTglJatuhTempo] = useState("");
  const [tanggalFaktur, setTanggalFaktur] = useState("");
  
  // State untuk error modal
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const resultsRef = useRef(null);

  // Status polling interval
  useEffect(() => {
    const statusInterval = setInterval(() => {
      updateFileStatuses();
    }, 2000);
    
    return () => clearInterval(statusInterval);
  }, [processingQueue]);
  
  // Update statuses for all queued files
  const updateFileStatuses = async () => {
    if (processingQueue.length === 0) return;
    
    try {
      console.log(`Fetching file statuses from: ${STATUS_API_ENDPOINT}`);
      
      // Gunakan endpoint yang benar dengan URL lengkap
      const response = await fetch(STATUS_API_ENDPOINT, {
        headers: {
          Authorization: API_TOKEN,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching statuses: ${response.status}`);
        return; // Keluar dari fungsi jika terjadi error
      }
      
      let data;
      try {
        data = await response.json();
        console.log("Status response data:", data);
      } catch (err) {
        console.error(`Failed to parse status response: ${err.message}`);
        return;
      }
      
      if (data && Array.isArray(data.statuses)) {
        console.log(`Received ${data.statuses.length} status items`);
        
        // Buat map dari statuses untuk lookup yang lebih efisien
        const statusMap = new Map();
        data.statuses.forEach(status => {
          statusMap.set(status.id, status);
        });
        
        // Update queue dengan status terbaru dari server
        const updatedQueue = processingQueue.map(queueItem => {
          const serverStatus = statusMap.get(queueItem.id);
          
          // Jika status ditemukan di server, update item queue
          if (serverStatus) {
            return {
              ...queueItem,
              status: serverStatus.status,
              progress: serverStatus.progress || 0,
              // Tambahkan flag untuk tracking
              updatedFromServer: true
            };
          }
          
          // Jika tidak ditemukan di server, pertahankan status saat ini
          return queueItem;
        });
        
        // Tambahkan status baru yang belum ada di queue
        data.statuses.forEach(serverStatus => {
          const existingIndex = updatedQueue.findIndex(item => item.id === serverStatus.id);
          
          // Jika status tidak ada di queue, tambahkan
          if (existingIndex === -1) {
            // Cari info file dari fileDataMap
            const fileInfo = fileDataMap[serverStatus.id];
            
            if (fileInfo) {
              updatedQueue.push({
                id: serverStatus.id,
                name: fileInfo.fileName || 'Unknown File',
                status: serverStatus.status,
                progress: serverStatus.progress || 0,
                fileIndex: fileInfo.fileIndex,
                updatedFromServer: true
              });
            } else {
              // Skip unknown files that don't have corresponding entries in fileDataMap
              console.log(`Skipping unknown file ID: ${serverStatus.id} (not in current session)`);
            }
          }
        });
        
        // Proses hasil OCR untuk file yang sudah selesai
        updatedQueue.forEach(queueItem => {
          if (queueItem.status === 'completed') {
            const serverStatus = statusMap.get(queueItem.id);
            
            if (serverStatus && serverStatus.result) {
              // Handle completed file with OCR results
              let ocrData = serverStatus.result.ocrData;
              const fileId = serverStatus.id;
              
              console.log(`Processing completed OCR data for ${fileId}`);
              
              // Validasi dan normalisasi struktur data OCR
              if (!ocrData) {
                console.warn(`OCR data missing for file ${fileId}`);
                ocrData = { output: { items: [] } };
              } else if (!ocrData.output) {
                console.warn(`OCR data missing output property for file ${fileId}`);
                ocrData.output = { items: [] };
              } else if (!ocrData.output.items) {
                console.warn(`OCR data missing items array for file ${fileId}`);
                ocrData.output.items = [];
              } else if (!Array.isArray(ocrData.output.items)) {
                console.warn(`OCR data items is not an array for file ${fileId}`);
                ocrData.output.items = [];
              }
              
              // Get file information for correlation
              const fileInfo = fileDataMap[fileId];
              
              if (fileInfo) {
                console.log(`Found file info for ${fileId}, fileIndex: ${fileInfo.fileIndex}`);
                
                // Mark file as processed
                setFileDataMap(prev => ({
                  ...prev,
                  [fileId]: {
                    ...prev[fileId],
                    processed: true,
                    ocrData: ocrData
                  }
                }));
                
                // Store OCR results in the map
                const fileIndex = fileInfo.fileIndex;
                setOcrResultsMap(prev => ({
                  ...prev,
                  [fileIndex]: ocrData
                }));
                
                // If this is the current file, set it as active
                if (currentFileIndex === fileIndex) {
                  console.log(`This is the current active file (index: ${fileIndex}), loading OCR data`);
                  setOcrResults(ocrData);
                  loadOcrData(ocrData);
                  setIsDataLoaded(true);
                  toast.success(`File ${serverStatus.result.filename} berhasil diproses!`);
                } else {
                  // Hindari duplikasi dengan memeriksa apakah file sudah ada di daftar hasil
                  const isDuplicate = processedResults.some(
                    item => item.fileIndex === fileInfo.fileIndex && 
                           item.filename === serverStatus.result.filename
                  );
                  
                  if (!isDuplicate) {
                    console.log(`Adding file ${serverStatus.result.filename} to processed results list`);
                    // Add to processed results for later use with a unique identifier
                    setProcessedResults(prev => [
                      ...prev, 
                      { 
                        id: `${serverStatus.id}-${Date.now()}`, // Ensure unique ID dengan timestamp
                        filename: serverStatus.result.filename,
                        fileIndex: fileInfo.fileIndex,
                        data: ocrData,
                        processedAt: serverStatus.result.processedAt
                      }
                    ]);
                    
                    toast.success(`File ${serverStatus.result.filename} berhasil diproses dan tersedia di daftar hasil`);
                  }
                }
              } else {
                // Skip processing for unknown files
                console.log(`Skipping processing for unknown file ID: ${fileId} (not in current session)`);
              }
            }
            
            // Remove from queue after processing is complete (dengan delay)
            if (queueItem.status === 'completed') {
              setTimeout(() => {
                setProcessingQueue(currentQueue => 
                  currentQueue.filter(item => item.id !== queueItem.id)
                );
              }, 3000); // Keep in queue for 3 seconds so user can see it completed
            }
          } else if (queueItem.status === 'error') {
            // Handle error dengan menampilkan toast
            const serverStatus = statusMap.get(queueItem.id);
            if (serverStatus && serverStatus.result) {
              toast.error(`Error memproses file: ${serverStatus.result.message || 'Unknown error'}`);
            }
            
            // Remove from queue after error (dengan delay)
            setTimeout(() => {
              setProcessingQueue(currentQueue => 
                currentQueue.filter(item => item.id !== queueItem.id)
              );
            }, 5000); // Keep error in queue for 5 seconds
          }
        });
        
        // Update queue state
        setProcessingQueue(updatedQueue);
      } else {
        console.warn('Invalid status response format:', data);
      }
    } catch (error) {
      console.error('Error fetching file statuses:', error);
    }
  };
  
  // Load OCR data into editable state
  const loadOcrData = (ocrData) => {
    console.log("Loading OCR data into editable state:", ocrData);
    
    if (!ocrData || !ocrData.output) {
      console.warn("Invalid OCR data structure, cannot load");
      return;
    }
    
    // Set invoice header fields
    if (ocrData.output.nomor_referensi) {
      setNomorReferensi(ocrData.output.nomor_referensi.value || "");
    }
    
    if (ocrData.output.nama_supplier) {
      setNamaSupplier(ocrData.output.nama_supplier.value || "");
    }
    
    if (ocrData.output.tgl_jatuh_tempo) {
      setTglJatuhTempo(ocrData.output.tgl_jatuh_tempo.value || "");
    }
    
    if (ocrData.output.tanggal_faktur) {
      setTanggalFaktur(ocrData.output.tanggal_faktur.value || "");
    }
    
    // Set invoice items
    if (Array.isArray(ocrData.output.items)) {
      // Make sure items have all required fields for editing
      const normalizedItems = ocrData.output.items.map(item => {
        // Create a normalized item with defaults for missing properties
        return {
          kode_barang_invoice: ensureProperty(item.kode_barang_invoice),
          nama_barang_invoice: ensureProperty(item.nama_barang_invoice),
          kode_barang_main: ensureProperty(item.kode_barang_main),
          nama_barang_main: ensureProperty(item.nama_barang_main),
          qty: ensureProperty(item.qty),
          satuan: ensureProperty(item.satuan),
          harga_satuan: ensureProperty(item.harga_satuan),
          harga_bruto: ensureProperty(item.harga_bruto),
          diskon_persen: ensureProperty(item.diskon_persen),
          diskon_rp: ensureProperty(item.diskon_rp),
          jumlah_netto: ensureProperty(item.jumlah_netto),
          ppn: ensureProperty(item.ppn),
          margin_persen: ensureProperty(item.margin_persen, ""),
          margin_rp: ensureProperty(item.margin_rp, ""),
          kenaikan_persen: ensureProperty(item.kenaikan_persen, 0),
          kenaikan_rp: ensureProperty(item.kenaikan_rp, 0),
          saran_margin_persen: ensureProperty(item.saran_margin_persen, 0),
          saran_margin_rp: ensureProperty(item.saran_margin_rp, 0)
        };
      });
      
      console.log(`Setting ${normalizedItems.length} normalized items`);
      setData(normalizedItems);
    } else {
      console.warn("Missing or invalid items array in OCR data");
      setData([]);
    }
  };
  
  // Helper function to ensure property exists with value and is_confident
  const ensureProperty = (prop, defaultValue = "") => {
    if (!prop) {
      return { value: defaultValue, is_confident: false };
    }
    if (typeof prop === 'object' && 'value' in prop) {
      return prop;
    }
    return { value: prop, is_confident: true };
  };

  // Handle file change
  const handleFileChange = (index) => {
    if (index >= 0 && index < files.length) {
      setCurrentFileIndex(index);
      setRotation(0);
      
      // Check if OCR results exist for this file
      const fileOcrResults = ocrResultsMap[index];
      if (fileOcrResults) {
        setOcrResults(fileOcrResults);
        loadOcrData(fileOcrResults);
        setIsDataLoaded(true);
      } else {
        // Reset OCR results if no data available for this file
        setOcrResults(null);
        setIsDataLoaded(false);
      }
    }
  };

  // Handle file delete
  const handleFileDelete = (index) => {
    if (index < 0 || index >= files.length) return;
    
    // Get the file to be deleted
    const fileToDelete = files[index];
    
    // Find any associated fileId in the fileDataMap
    let fileIdToDelete = null;
    Object.entries(fileDataMap).forEach(([fileId, data]) => {
      if (data.fileIndex === index) {
        fileIdToDelete = fileId;
      }
    });
    
    // Remove file from files array
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    // Update current file index if needed
    if (newFiles.length === 0) {
      setCurrentFileIndex(0);
      setRotation(0);
      setOcrResults(null);
      setIsDataLoaded(false); // Gunakan state yang sudah ditambahkan
    } else if (currentFileIndex >= index) {
      // If we're deleting the current file or one before it, adjust the index
      const newIndex = Math.max(0, currentFileIndex - 1);
      setCurrentFileIndex(newIndex);
      
      // Load OCR results for the new current file if available
      const newFileOcrResults = ocrResultsMap[newIndex];
      if (newFileOcrResults) {
        setOcrResults(newFileOcrResults);
        loadOcrData(newFileOcrResults);
        setIsDataLoaded(true);
      } else {
        setOcrResults(null);
        setIsDataLoaded(false);
      }
    }
    
    // Clean up OCR results map
    const newOcrResultsMap = { ...ocrResultsMap };
    delete newOcrResultsMap[index];
    
    // Reindex the OCR results map for files after the deleted one
    const updatedOcrResultsMap = {};
    Object.keys(newOcrResultsMap).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        updatedOcrResultsMap[keyNum - 1] = newOcrResultsMap[keyNum];
      } else {
        updatedOcrResultsMap[keyNum] = newOcrResultsMap[keyNum];
      }
    });
    
    setOcrResultsMap(updatedOcrResultsMap);
    
    // Remove from fileDataMap if found
    if (fileIdToDelete) {
      const newFileDataMap = { ...fileDataMap };
      delete newFileDataMap[fileIdToDelete];
      setFileDataMap(newFileDataMap);
      
      // Remove from processing queue if it exists
      setProcessingQueue(prev => prev.filter(item => item.id !== fileIdToDelete));
    }
    
    // Remove from processed results if it exists
    setProcessedResults(prev => prev.filter(item => 
      item.fileIndex !== index
    ));
    
    toast.success(`File "${fileToDelete.name}" berhasil dihapus`);
  };

  // Handle next image navigation
  const handleNextImage = () => {
    if (currentFileIndex < files.length - 1) {
      handleFileChange(currentFileIndex + 1);
    }
  };

  // Handle previous image navigation
  const handlePrevImage = () => {
    if (currentFileIndex > 0) {
      handleFileChange(currentFileIndex - 1);
    }
  };

  // Handle file upload
  const handleFileUpload = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      
      // Filter files untuk tipe yang didukung
      const validFiles = acceptedFiles.filter(file => {
        const fileType = file.type.toLowerCase();
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const isValidType = validTypes.includes(fileType);
        const isValidSize = file.size <= 25 * 1024 * 1024; // 25MB limit
        
        if (!isValidType) {
          toast.error(`File ${file.name} ditolak: Hanya file .jpeg, .jpg, .png, dan .pdf yang diperbolehkan.`);
        } else if (!isValidSize) {
          toast.error(`File ${file.name} ditolak: Ukuran file maksimal 25MB.`);
        }
        
        return isValidType && isValidSize;
      });
      
      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }
      
      // Tambahkan semua file ke daftar files terlebih dahulu
      const newFiles = [...files];
      const fileStartIndex = newFiles.length;
      
      // Tambahkan semua file ke state
      validFiles.forEach(file => newFiles.push(file));
      setFiles(newFiles);
      
      // Set file yang baru diupload sebagai aktif
      if (validFiles.length > 0 && newFiles.length > 0) {
        setCurrentFileIndex(fileStartIndex);
      }
      
      // Tambahkan file ke daftar saja tanpa langsung mengantrian untuk diproses
      // File akan diproses ketika tombol "Process File" diklik
      toast.success(`${validFiles.length} file berhasil diunggah. Klik "Process File" untuk memproses.`);
      setIsUploading(false);
    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error('Terjadi kesalahan saat upload file');
      setIsUploading(false);
    }
  };

  // Fungsi handleProcessFile untuk legacy mode
  const handleProcessFile = async () => {
    // Jika tidak ada file, tampilkan error
    if (!files || files.length === 0) {
      toast.error('Silakan upload file terlebih dahulu');
      return;
    }

    // If files are already in the queue but not being processed, just show a notification
    const queuedFiles = processingQueue.filter(item => 
      item.status === 'queued' || item.status === 'processing'
    );
    
    if (queuedFiles.length > 0) {
      toast.success('File sudah dalam proses pemrosesan asinkron');
      
      // Trigger processing for any queued files that haven't been processed yet
      for (const queueItem of queuedFiles.filter(item => item.status === 'queued')) {
        try {
          console.log(`Triggering processing for queued file ID: ${queueItem.id}`);
          
          // Call the /process/:fileId endpoint to start processing
          const response = await fetch(`${API_BASE_URL}/api/ocr/process/${queueItem.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': API_TOKEN
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error triggering processing for file ${queueItem.id}: ${errorText}`);
            toast.error(`Gagal memproses file: ${response.status}`);
          } else {
            const result = await response.json();
            console.log(`Processing triggered for file ${queueItem.id}`, result);
            toast.info(`Memproses file ${queueItem.name}...`);
            
            // Update status in UI immediately
            setProcessingQueue(prev => prev.map(item => 
              item.id === queueItem.id ? {...item, status: 'processing', progress: 5} : item
            ));
          }
        } catch (error) {
          console.error(`Error triggering processing for file ${queueItem.id}:`, error);
          toast.error(`Gagal memproses file: ${error.message}`);
        }
      }
      
      return;
    }

    setIsProcessing(true);
    
    try {
      // Tambahkan file yang ada ke antrian pemrosesan
      const filesToProcess = [];
      
      // First collect all the files that need processing
      for (const [index, file] of files.entries()) {
        // Skip if file already has OCR results
        if (ocrResultsMap[index]) continue;
        filesToProcess.push({ file, index });
      }
      
      console.log(`Processing ${filesToProcess.length} files`);
      
      // Then process each file
      for (const { file, index } of filesToProcess) {
        try {
          // Gunakan formData tanpa manipulasi tambahan (tidak mengkonversi tipe file)
          const formData = new FormData();
          formData.append('file', file); // File langsung dikirim apa adanya tanpa konversi
          
          console.log(`Mengirim file ${file.name} ke server untuk diproses...`);
          
          // Queue file for processing with retry mechanism
          let retries = 0;
          const maxRetries = 2;
          let success = false;
          let error = null;
          
          while (retries <= maxRetries && !success) {
            try {
              console.log(`Sending file to ${QUEUE_API_ENDPOINT} (attempt ${retries + 1})`);
              
              const response = await fetch(QUEUE_API_ENDPOINT, {
                method: 'POST',
                headers: {
                  'Authorization': API_TOKEN
                },
                body: formData
              });
              
              // Log response status
              console.log(`Server response status: ${response.status}`);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response from server: ${errorText}`);
                throw new Error(`Error uploading file: ${response.status}`);
              }
              
              // Handle response
              const responseText = await response.text();
              console.log(`Raw server response: ${responseText}`);
              
              let result;
              try {
                // Attempt to parse JSON
                result = JSON.parse(responseText);
              } catch (jsonError) {
                console.error(`Failed to parse JSON response: ${jsonError.message}`);
                console.log(`Invalid JSON response: ${responseText}`);
                throw new Error(`Failed to parse server response`);
              }
              
              if (result && result.fileId) {
                const fileId = result.fileId;
                
                // Tambahkan ke antrian pemrosesan - use a callback to ensure we get the latest state
                setProcessingQueue(prev => {
                  // Check if this file is already in the queue
                  const existingIndex = prev.findIndex(item => item.id === fileId);
                  
                  if (existingIndex !== -1) {
                    // File already in queue, just update it
                    const updatedQueue = [...prev];
                    updatedQueue[existingIndex] = {
                      ...updatedQueue[existingIndex],
                      status: 'queued',
                      progress: 0
                    };
                    return updatedQueue;
                  } else {
                    // Add new file to queue
                    return [
                      ...prev, 
                      { 
                        id: fileId,
                        name: file.name,
                        status: 'queued',
                        progress: 0,
                        originalFile: file,
                        fileIndex: index
                      }
                    ];
                  }
                });
                
                // Tambahkan korelasi antara fileId dan fileIndex
                setFileDataMap(prev => ({
                  ...prev,
                  [fileId]: {
                    fileIndex: index,
                    fileName: file.name,
                    fileUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                    processed: false,
                    uniqueId: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` // Tambahkan ID unik
                  }
                }));
                
                toast.success(`File ${file.name} ditambahkan ke antrian pemrosesan`);
                success = true;
                
                // Immediately trigger processing for this file
                try {
                  console.log(`Triggering processing for file ID: ${fileId}`);
                  
                  const processResponse = await fetch(`${API_BASE_URL}/api/ocr/process/${fileId}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': API_TOKEN
                    }
                  });
                  
                  if (!processResponse.ok) {
                    const processErrorText = await processResponse.text();
                    console.error(`Error triggering processing for file ${fileId}: ${processErrorText}`);
                    // Don't show toast for this error as the file is still queued
                  } else {
                    const processResult = await processResponse.json();
                    console.log(`Processing triggered for file ${fileId}`, processResult);
                    
                    // Update status in UI immediately
                    setProcessingQueue(prev => prev.map(item => 
                      item.id === fileId ? {...item, status: 'processing', progress: 5} : item
                    ));
                  }
                } catch (processError) {
                  console.error(`Error triggering processing for file ${fileId}:`, processError);
                  // Don't show toast for this error as the file is still queued
                }
              } else {
                throw new Error(`Server tidak mengembalikan fileId`);
              }
            } catch (err) {
              error = err;
              retries++;
              if (retries <= maxRetries) {
                console.log(`Mencoba ulang pengiriman file ${file.name} (percobaan ke-${retries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
              }
            }
          }
          
          if (!success) {
            console.error(`Gagal mengantrian file ${file.name} setelah ${maxRetries} percobaan:`, error);
            toast.error(`Gagal mengantrian file ${file.name}: ${error.message}`);
          }
        } catch (fileError) {
          console.error(`Error queueing file ${file.name}:`, fileError);
          toast.error(`Error queueing file ${file.name}: ${fileError.message}`);
        }
      }
    } catch (error) {
      console.error('Error in process file:', error);
      toast.error(`Terjadi kesalahan saat memproses file: ${error.message}`);
    } finally {
      setIsProcessing(false);
      
      // Mulai polling untuk status file
      if (!statusPollingActive) {
        setStatusPollingActive(true);
      }
    }
  };

  // Fungsi handleSubmitData untuk menyimpan data OCR
  const handleSubmitData = async () => {
    if (!ocrResults) {
      toast.error('Tidak ada hasil OCR untuk disimpan');
      return;
    }

    setIsSaving(true);
    try {
      // Dapatkan data gambar saat ini
      const currentFile = files[currentFileIndex];
      let imageData = null;
      
      // Jika file adalah gambar, konversi ke base64
      if (currentFile && currentFile.type.startsWith('image/')) {
        try {
          const reader = new FileReader();
          imageData = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Gagal membaca file'));
            reader.readAsDataURL(currentFile);
          });
        } catch (err) {
          console.error('Error converting image to base64:', err);
        }
      }
      
      // Data yang akan dikirim - backend mengharapkan editedData
      const dataToSend = {
        originalData: ocrResults,  // Data OCR original
        editedData: ocrResults,    // Tambahkan editedData yang sama dengan ocrResults karena OCRResultsTable sudah mengupdate ocrResults
        imageData: imageData       // Data gambar
      };
      
      console.log('Sending data to server:', {
        hasOriginalData: !!dataToSend.originalData,
        hasEditedData: !!dataToSend.editedData,
        hasImageData: !!dataToSend.imageData
      });
      
      // Kirim data ke API
      const response = await fetch(SAVE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN
        },
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        // Coba ambil pesan error dari respons
        let errorMessage = `Server responded with status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      toast.success('Data berhasil disimpan!');
      
    } catch (error) {
      console.error('Failed to save data:', error);
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle data change dari OCRResultsTable
  const handleDataChange = (updatedData) => {
    if (!ocrResults) return;
    
    // Pastikan updatedData memiliki struktur yang benar
    if (!updatedData.output) {
      console.error('Updated data tidak memiliki properti output');
      return;
    }
    
    // Pastikan items adalah array
    if (!updatedData.output.items || !Array.isArray(updatedData.output.items)) {
      console.warn('updatedData.output.items tidak valid, menggunakan array kosong');
      updatedData.output.items = [];
    }
    
    // Update data state
    setData(updatedData.output.items || []);
    
    // Update ocrResults dengan data yang baru
    const updatedOcrResults = {
      ...ocrResults,
      output: {
        ...ocrResults.output,
        ...updatedData.output
      }
    };
    
    // Update ocrResults state
    setOcrResults(updatedOcrResults);
    
    // Update ocrResultsMap untuk file saat ini
    setOcrResultsMap(prev => ({
      ...prev,
      [currentFileIndex]: updatedOcrResults
    }));
    
    // Update fileDataMap jika file ini ada dalam map
    Object.entries(fileDataMap).forEach(([fileId, fileInfo]) => {
      if (fileInfo.fileIndex === currentFileIndex) {
        setFileDataMap(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            ocrData: updatedOcrResults
          }
        }));
      }
    });
  };

  // Render the processing queue section
  const renderProcessingQueue = () => {
    if (processingQueue.length === 0) {
      return null; // Don't show empty queue
    }
    
    return (
      <div className="fixed bottom-0 right-0 p-4 w-96 max-h-96 overflow-y-auto bg-white shadow-lg rounded-t-lg z-50">
        <h3 className="text-lg font-semibold mb-3">Antrian Pemrosesan ({processingQueue.length})</h3>
        <div className="space-y-4">
          {processingQueue.map(item => (
            <div 
              key={`queue-${item.id}`} 
              className="bg-gray-50 p-3 rounded border border-gray-200"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm truncate" title={item.name}>
                  {item.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  item.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {item.status === 'queued' ? 'Dalam Antrian' : 
                   item.status === 'processing' ? 'Sedang Diproses' : 
                   item.status === 'completed' ? 'Selesai' : 'Error'}
                </span>
              </div>
              
              {/* Progress bar */}
              {item.status !== 'completed' && item.status !== 'error' && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full text-black">
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
                  <FileUpload onFilesUploaded={handleFileUpload} />
                </div>
              ) : (
                <>
                  <div className="w-full mb-8">
                    <FileUpload onFilesUploaded={handleFileUpload} />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    <div>
                      <h2 className="text-2xl font-semibold mb-4 text-gray-800">File List</h2>
                      <FileList
                        files={files}
                        currentIndex={currentFileIndex}
                        onFileSelect={handleFileChange}
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
      {/* Processing Queue Section */}
      {processingQueue.length > 0 && (
        renderProcessingQueue()
      )}
      {/* Processed Results Section */}
      {processedResults.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Hasil OCR Tersedia</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama File
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu Proses
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedResults.map((result, index) => (
                  <tr key={`processed-result-${index}-${result.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.processedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          // Alihkan ke file yang sesuai
                          if (result.fileIndex !== undefined) {
                            handleFileChange(result.fileIndex);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Lihat Data
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* File list section */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-lg mb-2">File Tersedia</h3>
          <div className="flex flex-wrap gap-3">
            {files.map((file, index) => (
              <div 
                key={index}
                onClick={() => handleFileChange(index)}
                className={`
                  relative border p-1 rounded cursor-pointer 
                  ${index === currentFileIndex ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}
                `}
              >
                {file.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`File ${index + 1}`} 
                    className="w-20 h-20 object-cover" 
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-gray-100">
                    <span className="text-xs text-center p-1">PDF Document</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-0.5 truncate">
                  {file.name}
                </div>
                {ocrResultsMap[index] && (
                  <div className="absolute top-0 right-0 bg-green-500 w-4 h-4 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Error Modal */}
      <ErrorModal 
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        errorMessage={errorMessage}
      />
    </div>
  )
}
