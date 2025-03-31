# OCR Invoice Processing System - Express.js Backend

This is the Express.js backend for the OCR Invoice Processing System, migrated from the original FastAPI implementation. The backend provides RESTful APIs for processing and managing invoice data extracted from OCR.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Update the `.env` file with your database credentials and other settings.

3. Initialize the database:
   ```bash
   node migrate.js init
   ```
   
   **Warning**: This will drop existing tables! Use this command only for fresh installations.

   For updating an existing database without losing data, use:
   ```bash
   node migrate.js update
   ```

### Running the Server

Start the development server:
```bash
npm run dev
```

Start the production server:
```bash
npm start
```

## API Endpoints

The backend provides the following API endpoints:

### Invoice Endpoints

- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/image/:id` - Get invoice image
- `GET /api/invoices/search/:query` - Search invoices

### OCR Endpoints

- `POST /api/ocr/save` - Save OCR data
- `GET /api/ocr/results/:invoice_number` - Get OCR results
- `POST /api/ocr/upload` - Upload file for OCR processing
- `GET /api/ocr/test-connection` - Test database connection

### Product Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search/:query` - Search products

## Project Structure

- `src/` - Source code
  - `controllers/` - API controllers
  - `models/` - Sequelize models
  - `routes/` - Express routes
  - `middleware/` - Middleware functions
  - `config/` - Configuration files
  - `utils/` - Utility functions
  - `services/` - Business logic services
  - `server.js` - Main server entry point
- `uploads/` - Upload directory for files
- `migrations/` - Database migration scripts

## Environment Variables

- `DB_TYPE` - Database type (postgres)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `PORT` - Server port
- `NODE_ENV` - Environment (development, production)
- `FRONTEND_URL` - Frontend URL for CORS
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration time
- `UPLOAD_DIR` - Upload directory
- `MAX_FILE_SIZE` - Maximum file upload size
