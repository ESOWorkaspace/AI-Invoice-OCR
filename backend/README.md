# 🔧 AI Invoice OCR - Backend API Service

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![NodeJS](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)
![Express](https://img.shields.io/badge/Express-4.x-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)

> 💻 **Express.js backend for the AI Invoice OCR Processing System**

## 📋 Overview

This is the Express.js backend for the AI Invoice OCR Processing System. It provides RESTful APIs for processing invoice images with OCR, storing the extracted data in a PostgreSQL database, and managing the invoice data through a comprehensive set of endpoints.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database (v14 or later)
- npm package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Create a .env file in the root directory with the following variables:
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=invoice_ocr
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=1512
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=10485760  # 10MB
   ```

3. **Initialize the database**
   ```bash
   # For fresh installation (WARNING: drops existing tables)
   node migrate.js init
   
   # For updating an existing database without data loss
   node migrate.js update
   ```

## 🏃‍♂️ Running the Server

**Development Mode**
```bash
npm run dev
```

**Production Mode**
```bash
npm start
```

## 🔌 API Endpoints

### 📄 Invoice Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | Get all invoices with pagination |
| GET | `/api/invoices/:id` | Get invoice by ID |
| POST | `/api/invoices` | Create new invoice |
| PUT | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Delete invoice |
| GET | `/api/invoices/image/:id` | Get invoice image |
| GET | `/api/invoices/search/:query` | Search invoices |

### 🔍 OCR Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr/save` | Save OCR data |
| GET | `/api/ocr/results/:invoice_number` | Get OCR results |
| POST | `/api/ocr/upload` | Upload file for OCR processing |
| GET | `/api/ocr/test-connection` | Test database connection |

### 📦 Product Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/products/search/:query` | Search products |

## 📊 Data Models

### ProcessedInvoice

```javascript
{
  invoice_number: String,        // Unique invoice identifier
  vendor_name: String,           // Name of the vendor
  invoice_date: Date,            // Date of the invoice
  total_amount: Number,          // Total invoice amount
  payment_status: String,        // Payment status (PAID, UNPAID, PARTIAL)
  items: Array,                  // Array of invoice line items
  image_data: Buffer,            // Binary image data
  image_content_type: String,    // MIME type of the image
  raw_ocr_data_id: String,       // Reference to raw OCR data
  notes: String,                 // Additional notes
  created_at: Date,              // Creation timestamp
  updated_at: Date               // Last update timestamp
}
```

### RawOCRData

```javascript
{
  id: UUID,                      // Unique identifier
  invoice_number: String,        // Reference to invoice number
  ocr_data: JSON,                // Raw OCR data as JSON
  created_at: Date,              // Creation timestamp
  updated_at: Date               // Last update timestamp
}
```

### Product

```javascript
{
  id: UUID,                      // Unique identifier
  code: String,                  // Product code
  name: String,                  // Product name
  price: Number,                 // Product price
  unit: String,                  // Unit of measurement
  created_at: Date,              // Creation timestamp
  updated_at: Date               // Last update timestamp
}
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── controllers/            # API controllers
│   │   ├── invoiceController.js
│   │   ├── ocrController.js
│   │   └── productController.js
│   ├── models/                 # Sequelize models
│   │   ├── ProcessedInvoice.js
│   │   ├── RawOCRData.js
│   │   └── Product.js
│   ├── routes/                 # Express routes
│   │   ├── invoiceRoutes.js
│   │   ├── ocrRoutes.js
│   │   └── productRoutes.js
│   ├── middleware/             # Middleware functions
│   │   └── uploadMiddleware.js
│   ├── config/                 # Configuration files
│   │   ├── database.js
│   │   └── migrations.js
│   └── server.js               # Main server entry point
├── uploads/                    # Upload directory for files
├── migrate.js                  # Database migration script
└── package.json                # Dependencies and scripts
```

## 📝 Development Notes

### Database Operations

This backend uses Sequelize ORM for database operations. Model relationships are defined as follows:

- ProcessedInvoice has one RawOCRData (one-to-one)
- Items are stored as a JSON array within the ProcessedInvoice

### Item Structure

Invoice items should follow this structure:

```javascript
{
  product_code: String,  // Product code
  product_name: String,  // Product name
  quantity: Number,      // Quantity
  unit: String,          // Unit of measurement
  price: Number,         // Unit price
  total: Number          // Total amount
}
```

### Error Handling

The API returns standard HTTP status codes:
- 200: Success
- 400: Bad request
- 404: Resource not found
- 500: Server error

All responses include a message field with details.

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 👨‍💻 Author

Created by [Engineer Setengah Otak](https://github.com/engineersetengahotak)

---

⭐ **Built with ❤️ and JavaScript** ⭐
