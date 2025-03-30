from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class OCRResultCreate(BaseModel):
    filename: str
    extracted_text: str
    nomor_referensi: Optional[str] = None  # Boleh kosong

class OCRResultResponse(OCRResultCreate):
    id: int
    created_at: datetime  # Jika tabel punya timestamp

    class Config:
        from_attributes = True  # Agar bisa dikonversi dari SQLAlchemy model
