from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import base64
import httpx  # Library untuk HTTP request

router = APIRouter(prefix="/upload", tags=["Upload"])

EXTERNAL_API_URL = "https://85ef-36-85-220-83.ngrok-free.app/webhook-test/80a29ab4-40b4-49c8-935e-9e40f628477e"  # Ganti dengan URL API tujuan
AUTH_TOKEN = "a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8"  # Token Authorization

@router.post("/")
async def upload_files(files: List[UploadFile] = File(...)):  
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
    image_types = {"image/jpeg", "image/jpg", "image/png"}
    results = []

    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"File {file.filename} memiliki tipe {file.content_type} yang tidak diperbolehkan.")

        file_bytes = await file.read()

        if file.content_type in image_types:
            base64_string = base64.b64encode(file_bytes).decode("utf-8")
            results.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "base64_preview": base64_string[:50] + "...(truncated)"
            })
        else:
            results.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "message": "PDF file uploaded successfully"
            })

    headers = {
        "Authorization": AUTH_TOKEN,
        "Content-Type": "application/json"
    }

    # Kirim hasil ke API eksternal dan tunggu respons
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(EXTERNAL_API_URL, json={"uploaded_files": results}, headers=headers)
            response.raise_for_status()  # Jika ada error HTTP, akan dilempar exception
            processed_data = response.json()  # Ambil respons dari API eksternal

        return processed_data  # Kembalikan hasil dari API eksternal ke client
    except httpx.HTTPStatusError as http_err:
        raise HTTPException(status_code=http_err.response.status_code, detail=f"API error: {http_err.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
