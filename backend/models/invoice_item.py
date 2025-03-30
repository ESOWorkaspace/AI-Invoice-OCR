from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Enum, func
from sqlalchemy.orm import relationship
from database import Base

class InvoiceItemFromOCR(Base):
    __tablename__ = "invoice_items_from_ocr"

    id = Column(Integer, primary_key=True, index=True)
    ocr_result_id = Column(Integer, ForeignKey("ocr_results.id"), nullable=False)  # FK ke hasil OCR
    nomor_referensi = Column(String, index=True)  # Sama dengan reference_number dari OCR
    nama_supplier = Column(String, index=True)
    kode_barang_master = Column(String, index=True)
    kode_barang_invoice = Column(String, index=True)
    nama_barang_master = Column(String)
    nama_barang_invoice = Column(String)
    qty = Column(Float, nullable=False)
    satuan = Column(String)
    harga_satuan = Column(Float, nullable=False)
    harga_bruto = Column(Float, nullable=False)  # qty * harga_satuan
    diskon_persen = Column(Float, default=0.0)
    diskon_rp = Column(Float, default=0.0)
    jumlah_netto = Column(Float, nullable=False)  # harga_bruto - diskon
    tgl_jatuh_tempo = Column(DateTime)
    tanggal_faktur = Column(DateTime)
    tipe_dokumen = Column(Enum("faktur", "invoice", "nota", name="tipe_dokumen_enum"), nullable=False)
    tipe_pembayaran = Column(Enum("tunai", "transfer", "kredit", name="tipe_pembayaran_enum"), nullable=False)
    salesman = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relasi ke OCRResult
    ocr_result = relationship("OCRResult", back_populates="invoice_items")
