from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.invoice_item import InvoiceItemFromOCR
from schemas.invoice_item import InvoiceItemCreate, InvoiceItemResponse
from sqlalchemy.future import select

router = APIRouter(prefix="/invoice_items", tags=["Invoice Items"])

@router.post("/", response_model=InvoiceItemResponse)
async def create_invoice_item(data: InvoiceItemCreate, db: AsyncSession = Depends(get_db)):
    new_item = InvoiceItemFromOCR(**data.dict())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

@router.get("/{item_id}", response_model=InvoiceItemResponse)
async def get_invoice_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InvoiceItemFromOCR).where(InvoiceItemFromOCR.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice Item not found")
    return item
