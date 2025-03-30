from fastapi import APIRouter
from schemas.calculation import PriceCalculationRequest, PriceCalculationResponse

router = APIRouter(prefix="/calculate", tags=["Calculation"])

@router.post("/", response_model=PriceCalculationResponse)
async def calculate_price(data: PriceCalculationRequest):
    harga_bruto = data.harga_satuan * data.qty
    jumlah_netto = harga_bruto - (harga_bruto * (data.diskon_persen / 100)) - data.diskon_rp
    return {"harga_bruto": harga_bruto, "jumlah_netto": jumlah_netto}
