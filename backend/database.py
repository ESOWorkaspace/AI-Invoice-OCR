import asyncpg
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# Load environment variables
if not os.getenv("DB_HOST"):
    from pathlib import Path
    ROOT_DIR = Path(__file__).resolve().parent.parent
    ENV_PATH = ROOT_DIR / ".env"
    load_dotenv(ENV_PATH)

# Database credentials
DB_CONNECTION = os.getenv("DB_CONNECTION", "postgresql")
DB_USERNAME = os.getenv("DB_USERNAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123123")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_DATABASE = os.getenv("DB_DATABASE", "ocr_db")

DATABASE_URL = f"{DB_CONNECTION}+asyncpg://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"
ADMIN_URL = f"{DB_CONNECTION}+asyncpg://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"

# Create async engines
engine = create_async_engine(DATABASE_URL, echo=True)
admin_engine = create_async_engine(ADMIN_URL, echo=True)

SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def create_database():
    """Cek apakah database ada, jika tidak buat baru."""
    try:
        # Gunakan asyncpg langsung untuk cek database karena SQLAlchemy tidak mendukung CREATE DATABASE dalam transaksi
        conn = await asyncpg.connect(user=DB_USERNAME, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT, database="postgres")
        result = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname=$1", DB_DATABASE)
        
        if result is None:
            await conn.execute(f'CREATE DATABASE "{DB_DATABASE}"')
            print(f"✅ Database '{DB_DATABASE}' berhasil dibuat!")
        else:
            print(f"🔹 Database '{DB_DATABASE}' sudah ada.")

        await conn.close()
    except OperationalError as e:
        print(f"❌ Error saat mencoba membuat database: {e}")

async def init_db():
    """Inisialisasi database (cek dan buat jika perlu)."""
    from models.ocr_result import OCRResult  # Import model langsung di sini
    from models.invoice_item import InvoiceItemFromOCR
    await create_database()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Semua tabel berhasil dibuat (jika belum ada).")

# Dependency untuk mendapatkan session
async def get_db():
    async with SessionLocal() as session:
        yield session
