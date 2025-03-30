from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.ocr_result import OCRResult
from schemas.ocr_result import OCRResultCreate, OCRResultResponse
from sqlalchemy.future import select

router = APIRouter(prefix="/ocr_results", tags=["OCR Results"])

@router.post("/", response_model=OCRResultResponse)
async def create_ocr_result(data: OCRResultCreate, db: AsyncSession = Depends(get_db)):
    new_ocr = OCRResult(**data.dict())
    db.add(new_ocr)
    await db.commit()
    await db.refresh(new_ocr)
    return new_ocr

@router.get("/{ocr_id}", response_model=OCRResultResponse)
async def get_ocr_result(ocr_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OCRResult).where(OCRResult.id == ocr_id))
    ocr = result.scalars().first()
    if not ocr:
        raise HTTPException(status_code=404, detail="OCR Result not found")
    return ocr
