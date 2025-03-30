from pydantic import BaseModel

class PriceCalculationRequest(BaseModel):
    harga_satuan: float
    qty: int
    diskon_persen: float
    diskon_rp: float

class PriceCalculationResponse(BaseModel):
    harga_bruto: float
    jumlah_netto: float
