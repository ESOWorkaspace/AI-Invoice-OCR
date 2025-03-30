from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.ocr_result import OCRResult
from backend.schemas.ocr_result import OCRResultSchema

async def create_ocr_result(db: AsyncSession, ocr_data: OCRResultSchema):
    db_result = OCRResult(**ocr_data.dict())
    db.add(db_result)
    await db.commit()
    await db.refresh(db_result)
    return db_result

async def get_ocr_results(db: AsyncSession):
    result = await db.execute(select(OCRResult))
    return result.scalars().all()
