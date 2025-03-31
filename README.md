# 📊 AI Invoice OCR Processing System

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)

> ✨ **A modern web application to extract and process invoice data using OCR technology**

## 🌟 Overview

The AI Invoice OCR Processing System is a powerful microservice designed to automate the extraction of data from invoice images using Optical Character Recognition (OCR) technology. This application streamlines the invoice processing workflow by automatically extracting key information such as invoice numbers, dates, vendor details, and line items.

![App Demo](https://via.placeholder.com/800x400?text=AI+Invoice+OCR+Demo)

## ✅ Key Features

- 🖼️ **OCR Processing**: Upload and process invoice images to extract structured data
- 📋 **Data Validation**: Confidence indicators for extracted data
- 📝 **Manual Editing**: Interactive UI to review and correct OCR results
- 🗃️ **Database Management**: Store, search, and manage processed invoices
- 🔄 **API Integration**: RESTful API for integration with other systems
- 📊 **Product Catalog**: Maintain a database of products for invoice matching
- 🔍 **Search Functionality**: Find invoices by number, vendor, or content

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database
- Web browser (Chrome, Firefox, Edge recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-invoice-ocr.git
   cd ai-invoice-ocr
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and settings
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Initialize the database**
   ```bash
   cd ../backend
   node migrate.js init
   ```

## 🖥️ Running the Application

### Development Mode

1. **Start backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:1512

### Production Mode

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start backend server**
   ```bash
   cd ../backend
   npm start
   ```

## 📋 Usage Guide

1. **Upload Invoice**: Navigate to the OCR page and upload an invoice image
2. **Review Extraction**: Check the extracted data with confidence indicators
3. **Edit if Needed**: Modify any incorrect data (low confidence fields highlighted in orange/red)
4. **Save to Database**: Save the processed invoice to the database
5. **Manage Invoices**: Use the Database Management page to view, edit, or delete invoices

## 🏗️ Project Structure

```
ai-invoice-ocr/
├── backend/               # Express.js server
│   ├── src/               # Backend source code
│   ├── migrations/        # Database migrations
│   └── uploads/           # Temporary file uploads
├── frontend/              # React frontend application
│   ├── src/               # Frontend source code
│   ├── public/            # Static assets
│   └── dist/              # Compiled frontend (production)
├── .env                   # Environment variables
└── .env.example           # Example environment configuration
```

## 🔌 API Reference

Refer to the backend README for detailed API documentation.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Created by [Engineer Setengah Otak](https://github.com/engineersetengahotak)

---

⭐ **Star this repository if you find it useful!** ⭐
