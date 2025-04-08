ex.js
- E:\ONIGIRI\ESO_\Jasa mekatronik\personal project\03. Web App\04. AI for POS\backend\src\controllers\invoiceController.js
- E:\ONIGIRI\ESO_\Jasa mekatronik\personal project\03. Web App\04. AI for POS\backend\src\routes\invoiceRoutes.js
- E:\ONIGIRI\ESO_\Jasa mekatronik\personal project\03. Web App\04. AI for POS\backend\src\server.js 
    at Module._resolveFilename (node:internal/modules/cjs/loader:1186:15)
    at Module._load (node:internal/modules/cjs/loader:1012:27)
    at Module.require (node:internal/modules/cjs/loader:1271:19)
    at require (node:internal/modules/helpers:123:16)
    at Object.<anonymous> (E:\ONIGIRI\ESO_\Jasa mekatronik\personal project\03. Web App\04. AI for POS\backend\src\models\index.js:12:30)
    at Module._compile (node:internal/modules/cjs/loader:1434:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1518:10)
    at Module.load (node:internal/modules/cjs/loader:1249:32)
    at Module._load (node:internal/modules/cjs/loader:1065:12)
    at Module.require (node:internal/modules/cjs/loader:1271:19) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'E:\\ONIGIRI\\ESO_\\Jasa mekatronik\\personal project\\03. Web App\\04. AI for POS\\backend\\src\\models\\index.js',
    'E:\\ONIGIRI\\ESO_\\Jasa mekatronik\\personal project\\03. Web App\\04. AI for POS\\backend\\src\\controllers\\invoiceController.js',
    'E:\\ONIGIRI\\ESO_\\Jasa mekatronik\\personal project\\03. Web App\\04. AI for POS\\backend\\src\\routes\\invoiceRoutes.js',
    'E:\\ONIGIRI\\ESO_\\Jasa mekatronik\\personal project\\03. Web App\\04. AI for POS\\backend\\src\\server.js'
  ]
}

Node.js v22.2.0
[nodemon] app crashed - waiting for file changes before starting...
# Active Context

## Current Development Focus

### Product Management Enhancement

We are currently improving the product management system with focus on:

1. **Enhanced Product Form**:
   - Completed implementation of form with tabs for product info, variants, units, prices, and stocks
   - Added unit dropdown with data loaded from backend API
   - Improved margin field to accept 2-3 decimal places for precision
   - Added currency formatting with Rupiah symbol (Rp) for price fields
   - Fixed stock display to show conversion to base units and improved text visibility
   - Added backend endpoint for retrieving unit data (/api/units)

2. **OCR Results Processing**:
   - Implementing automatic mapping between supplier units and internal product units
   - Improving product matching algorithms based on supplier codes
   - Adding validation for price data with threshold margin calculations

3. **Data Formatting and Display**:
   - Ensuring all currency values display with thousand separators
   - Using proper color coding for confidence levels (white, orange, red)
   - Implementing responsive designs for all tables and forms

### Next Tasks

1. **Product Pricing System**:
   - Extend price management to support tiered pricing (qty-based)
   - Add batch price update functionality
   - Implement margin calculations and warnings

2. **User Interface Refinements**:
   - Improve form validation and error messages
   - Add tooltips and help text for complex fields
   - Enhance responsiveness on mobile devices

3. **Data Integration**:
   - Connect product database to invoice processing for auto-completion
   - Implement bulk import/export with validation

### Key Decisions

1. We've decided to use dropdown selects for units instead of free text inputs to ensure consistency
2. We're using the `EnhancedProductForm` as the standard for all product data entry
3. Prices will include automatic margin calculation display
4. Stock quantities will show conversions between units for better user understanding

### Technical Notes

1. All API endpoints now follow the standard response format of `{ success: true, data: [...], message: "..." }`
2. The units endpoint returns standard and supplier-specific units
3. Margin calculations should use at least 3 decimal places for precision
4. Text colors in forms must maintain proper contrast (no white text on light backgrounds)

## Modularity Approach

We are emphasizing modularity and self-explanatory component naming:

1. Component names clearly reflect their purpose (e.g., `EnhancedProductForm` vs `ProductForm`)
2. Components are organized by function in dedicated folders
3. Each component focuses on a single responsibility
4. Larger components compose smaller, focused components
5. Business logic is separated from presentation

These principles are now documented in `systemPatterns.md` for consistent application across the project.

## Current Focus
The current focus is on resolving environment variable loading issues between the frontend and backend, specifically ensuring the application correctly loads environment variables from the single `.env` file at the project root.

## Development Rules
- Do not change existing styles.
- Do not change existing data structures.
- Do not cause other features to be deleted or create errors.
- Focus only on the commanded feature/task.

## Recent Changes

### Environment Variable Configuration
1. **Backend Changes**:
   - Updated `dotenv` configuration in `backend/src/server.js` to point to the root `.env` file:
     ```javascript
     require('dotenv').config({ path: path.join(__dirname, '../../.env') });
     ```
   - This ensures the backend loads environment variables from the project root

2. **Frontend Changes**:
   - Updated Vite configuration in `frontend/vite.config.js` to load environment variables from the root:
     ```javascript
     export default defineConfig(({ mode }) => {
       // Load env file based on `mode` in the current working directory
       const env = loadEnv(mode, process.cwd(), '')
       return {
         // ... other config
         envDir: path.resolve(__dirname, '..')  // Points to project root
       }
     })
     ```
   - Added debugging in `frontend/src/main.jsx` to log loaded environment variables:
     ```javascript
     console.log('Environment variables loaded:');
     console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '(not set)');
     console.log('NODE_ENV:', import.meta.env.MODE);
     ```
   - Created a test script `frontend/test-env.js` to document Vite's environment variable loading behavior

3. **API Base URL Usage**:
   - Frontend components use `API_BASE_URL` from environment variables to make API requests
   - Example from `frontend/src/pages/HistoryPage.jsx`:
     ```javascript
     const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1512';
     // ...
     const response = await axios.get(`${API_BASE_URL}/api/invoices`, {
       timeout: 15000 // 15s timeout
     });
     ```

## Active Issues

### Environment Variable Loading
- The frontend is defaulting to fallback values for `API_BASE_URL` instead of loading from `.env`
- The backend was loading from its own directory instead of the project root
- Verify that both frontend and backend are correctly loading the same `.env` file

### API URL Configuration
- Ensure consistent use of `/api` prefix in API requests
- Confirm that the proxy settings in Vite config correctly handle API requests

### HistoryPage Product Details
- The expandable rows in HistoryPage need to display product details from the product database
- Map supplier codes (from processed_invoice_items) to internal product codes (from product database)
- Show both supplier and internal product information in the expanded rows

## Current Decisions

1. **Environment Variable Strategy**:
   - Use a single `.env` file at the project root for all configuration
   - Frontend uses `import.meta.env.VITE_*` for accessing variables
   - Backend uses `process.env.*` for accessing variables
   - Use `envDir` in Vite config to point to project root

2. **API URL Configuration**:
   - Use proxy configuration in Vite for development
   - Always include `/api` prefix in API endpoint URLs
   - Use environment variables for the base URL

3. **Product Data Lookup**:
   - Use SQL joins to fetch product data when expanding invoice rows
   - Map supplier codes to internal product codes
   - Display both invoice data and product database information

## Next Steps

1. **Verify Environment Configuration**:
   - Test that environment variables are correctly loaded in both frontend and backend
   - Check console logs for environment variable values
   - Ensure API calls use the correct base URL

2. **Fix HistoryPage Product Details**:
   - Update the backend `getInvoiceDetails` function to perform database lookups
   - Enhance the frontend to display both supplier and internal product information
   - Implement proper error handling for product lookups

3. **Testing and Validation**:
   - Test the HistoryPage expandable rows with real data
   - Verify that product information is correctly displayed
   - Ensure error handling works as expected 

## New Changes

### Direct Product Lookup
- Added proper supplier unit mapping:
  ```javascript
  // Format: { mainUnit: supplierUnit }
  // Example for your case: { "krt": "CTN" }
  ``` 