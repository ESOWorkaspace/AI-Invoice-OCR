from fastapi import FastAPI
import os
from dotenv import load_dotenv
from pathlib import Path
import asyncio
from contextlib import asynccontextmanager
from database import init_db
from models import OCRResult, InvoiceItemFromOCR
from routers import ocr_result, invoice_item
from routers import calculation
from routers import upload

# Tentukan path ke .env
ROOT_DIR = Path(__file__).resolve().parent.parent  
ENV_PATH = ROOT_DIR / ".env"

# Load dotenv
if not load_dotenv(ENV_PATH, override=True):
    print(f"⚠️  Gagal membaca .env di {ENV_PATH}")

# Cek apakah nilai terbaca
HOST = os.getenv("UVICORN_HOST", "127.0.0.1")
PORT = int(os.getenv("UVICORN_PORT") or 8000)

print(f"🔍 HOST: {HOST}, PORT: {PORT}")  # Debugging

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield  
    print("🔻 Aplikasi FastAPI sedang dimatikan...")

app = FastAPI(lifespan=lifespan)
app.include_router(ocr_result.router)
app.include_router(invoice_item.router)
app.include_router(calculation.router)
app.include_router(upload.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    print(f"🟢 Menjalankan di {HOST}:{PORT}")
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, reload=True)
