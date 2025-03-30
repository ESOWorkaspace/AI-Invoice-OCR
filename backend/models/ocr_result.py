from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base
from sqlalchemy.orm import relationship

class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    extracted_text = Column(Text)
    reference_number = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relasi ke invoice_items_from_ocr
    invoice_items = relationship("InvoiceItemFromOCR", back_populates="ocr_result", cascade="all, delete")
