from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class InvoiceItemCreate(BaseModel):
    ocr_result_id: int  # Relasi ke hasil OCR
    nomor_referensi: str
    kode_barang_master: str
    kode_barang_invoice: str
    nama_barang_master: str
    nama_barang_invoice: str
    qty: int
    satuan: str
    harga_satuan: float
    harga_bruto: float
    diskon_persen: float
    diskon_rp: float
    jumlah_netto: float
    tgl_jatuh_tempo: Optional[datetime] = None
    tanggal_faktur: datetime
    tipe_dokumen: str
    tipe_pembayaran: str
    salesman: str

class InvoiceItemResponse(InvoiceItemCreate):
    id: int

    class Config:
        from_attributes = True
