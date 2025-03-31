# Migration Guide: FastAPI to Express.js

This guide provides comprehensive instructions for migrating the OCR Invoice Processing System backend from FastAPI (Python) to Express.js (Node.js).

## Migration Overview

The migration preserves:
- Database schema and relationships
- API endpoints and routes
- Business logic and functionality
- Frontend compatibility (no frontend changes required)

## Migration Steps

### 1. Setup and Installation

1. Install Node.js dependencies:
   ```bash
   cd backend_express
   npm install
   ```

2. Configure environment variables:
   The `.env` file has been updated with equivalent settings. No action required.

3. Initialize the database:
   ```bash
   node migrate.js update
   ```

### 2. Running Both Backends During Transition

During the transition phase, you can run both backends simultaneously for testing:

1. Run the FastAPI backend (original):
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 1512
   ```

2. Run the Express.js backend (in a separate terminal):
   ```bash
   cd backend_express
   npm run dev
   ```
   
   Note: You'll need to use a different port for the Express.js backend during testing.

### 3. API Endpoint Comparison

| Functionality | FastAPI Endpoint | Express.js Endpoint | Status |
|---------------|------------------|---------------------|--------|
| Get all invoices | GET /api/invoices | GET /api/invoices | ✅ Compatible |
| Get invoice by ID | GET /api/invoices/{id} | GET /api/invoices/:id | ✅ Compatible |
| Update invoice | PUT /api/invoices/{id} | PUT /api/invoices/:id | ✅ Compatible |
| Delete invoice | DELETE /api/invoices/{id} | DELETE /api/invoices/:id | ✅ Compatible |
| Get invoice image | GET /api/invoices/{id}/image | GET /api/invoices/image/:id | ✅ Compatible |
| Save OCR data | POST /api/ocr/save | POST /api/ocr/save | ✅ Compatible |
| Get products | GET /api/products | GET /api/products | ✅ Compatible |

### 4. Database Migration

The Express.js backend uses Sequelize ORM instead of SQLAlchemy, but maintains the same database schema:

1. ProcessedInvoice - For storing invoice details and images
2. RawOCRData - For storing raw OCR data with relationship to ProcessedInvoice
3. Product - For the product master database

The `migrate.js` script provides equivalent functionality to the Python migrations.

### 5. Key Technical Differences

| Component | FastAPI (Python) | Express.js (Node.js) | Notes |
|-----------|----------------|-------------------|-------|
| ORM | SQLAlchemy | Sequelize | Similar functionality |
| Image Storage | LargeBinary column | BLOB column | Compatible |
| Validation | Pydantic | Express Validator | Equivalent validation rules |
| Authentication | python-jose | jsonwebtoken | Same JWT approach |
| File Upload | python-multipart | multer | Similar functionality |
| Error Handling | HTTPException | Express error middleware | Consistent error format |

### 6. Switching to Express.js

Once you're ready to switch completely:

1. Stop the FastAPI backend
2. Start the Express.js backend on port 1512:
   ```bash
   cd backend_express
   PORT=1512 npm start
   ```

3. The frontend will continue to work without modifications since the API contracts remain the same.

### 7. Monitoring and Troubleshooting

The Express.js backend includes detailed logging with request IDs for tracking issues. Monitor the console output during the transition to identify any integration problems.

## Rollback Plan

If issues arise during migration:
1. Stop the Express.js backend
2. Restart the FastAPI backend
3. Review logs to identify and fix issues

No database schema changes are needed for rollback since both backends use the same schema structure.
