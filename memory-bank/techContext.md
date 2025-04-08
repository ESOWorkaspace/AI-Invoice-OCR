# Technical Context

## Technology Stack

### Frontend
- **Framework**: React 19.0.0
- **Build Tool**: Vite 6.2.0
- **Styling**: TailwindCSS 3.4.17
- **HTTP Client**: Axios 1.8.4
- **Table Component**: TanStack React Table 8.21.2
- **Date Handling**: date-fns 4.1.0
- **Routing**: React Router DOM 7.4.1
- **Form Components**: React Datepicker 8.2.1
- **Notifications**: React Hot Toast 2.5.2
- **Icons**: Heroicons 2.2.0

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **ORM**: Sequelize (PostgreSQL)
- **Security**: Helmet, CORS
- **File Upload**: Multer
- **Logging**: Morgan
- **Environment**: dotenv

### Database
- **RDBMS**: PostgreSQL
- **Connection**: Managed via Sequelize ORM

## Development Setup

### Environment Configuration
All environment variables are defined in a single `.env` file at the project root. The application uses the following key environment variables:

```
# Database Configuration
DB_CONNECTION=postgresql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ocr_db
DB_USERNAME=postgres
DB_PASSWORD=123123

# Server Configuration
NODE_ENV=development
PORT=1512
HOST=0.0.0.0
UPLOAD_DIR=uploads/invoices

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:1512
VITE_API_OCR_AUTH_TOKEN=a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8

# OCR API Configuration
OCR_API_ENDPOINT=http://amien-server:5678/webhook/80a29ab4-40b4-49c8-935e-9e40f628477e
OCR_API_TOKEN=a3f5d6e8b9c0a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8
FALLBACK_OCR_API_ENDPOINT=http://localhost:1880/testingupload
USE_MOCK_DATA=false
```

### Frontend Environment Variable Access
Frontend accesses environment variables using Vite's `import.meta.env` mechanism. Variables must be prefixed with `VITE_` to be accessible in the frontend code.

```javascript
// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';
```

### Backend Environment Variable Access
Backend uses Node.js `dotenv` package to load environment variables from the root `.env` file:

```javascript
// In server.js
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Access variables directly
const PORT = process.env.PORT || 1512;
```

## API Structure

### Base URL
All API endpoints are prefixed with `/api` and follow RESTful conventions:

```
/api/invoices
/api/ocr
/api/products
/api/product-items
/api/raw-ocr
```

### Response Format
API responses generally follow this structure:

```json
{
  "success": true,
  "data": [...],
  "message": "Operation successful"
}
```

## Development Workflow

### Running the Application
- **Backend**: `cd backend && npm run dev`
- **Frontend**: `cd frontend && npm run dev`

### Development Server
- Backend runs on port 1512 (configurable in .env)
- Frontend runs on port 5173 (default Vite port)

## Technical Constraints

### Environment Variable Requirements
- Single `.env` file at project root
- Frontend must use variables prefixed with `VITE_`
- Backend must load the root `.env` file correctly

### API Communication
- Frontend must use the correct API_BASE_URL
- API endpoints must include `/api` prefix
- CORS configured to allow frontend-to-backend communication

### Database Schema
- Processed invoices stored in `processed_invoice` table
- Invoice items stored in `processed_invoice_item` table 
- Products stored in `produk` table with related tables for pricing and units
- Supplier codes in `processed_invoice_item` must map to product database

### Error Handling Requirements
- Frontend must handle API errors gracefully
- Backend must return structured error responses
- All errors must include appropriate status codes and messages

## Testing & Validation
- Cell background colors indicate data confidence
  - White: confident data (is_confident = true)
  - Orange: not confident data (is_confident = false)
  - Red: null or undefined data
- OCR validation includes checking line item calculations
- Invoice totals must be verified against line items 