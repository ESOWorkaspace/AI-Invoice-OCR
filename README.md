# Modern OCR Interface

A modern web-based OCR processing interface built with Streamlit. This application provides a user-friendly way to extract text from images and PDFs with a clean, minimalistic design.

## Features

- Drag-and-drop file upload
- Support for images (PNG, JPG, JPEG) and PDF files
- Real-time document preview
- Editable extracted text table
- Export results to CSV
- Modern UI with responsive design

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Install Tesseract OCR:
- Windows: Download and install from https://github.com/UB-Mannheim/tesseract/wiki
- Linux: `sudo apt-get install tesseract-ocr`
- Mac: `brew install tesseract`

3. Run the application:
```bash
streamlit run app.py
```

## Usage

1. Open your web browser and navigate to the provided local URL (typically http://localhost:8501)
2. Drag and drop your image or PDF file into the upload area
3. Click "Process OCR" to extract text
4. Edit the extracted text in the table if needed
5. Click "Save Data" to download the results as CSV

## Requirements

See `requirements.txt` for a full list of Python dependencies.
