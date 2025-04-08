# System Patterns

## Architecture Overview
The OCR Invoice Processing System follows a modern web application architecture with clear separation of concerns:

- **Frontend**: React-based SPA (Single Page Application)
- **Backend**: Node.js/Express RESTful API server
- **Database**: PostgreSQL relational database
- **Environment Config**: Single .env file at project root

## Component Structure

### Frontend Components
The frontend follows a hierarchical component structure:

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Main page components
│   │   ├── OCRPage.jsx            # OCR processing interface
│   │   ├── HistoryPage.jsx        # Invoice history and details
│   │   └── database/              # Database management interfaces
│   │       ├── DatabaseManagePage.jsx
│   │       ├── InvoicesPage.jsx
│   │       └── ProductsPage.jsx
│   ├── services/       # API service layer
│   │   └── api.js      # API client with Axios
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main application component with routing
│   └── main.jsx        # Application entry point
```

### Backend Structure
The backend follows a layered architecture:

```
backend/
├── src/
│   ├── config/         # Configuration setup
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models (Sequelize)
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── server.js       # Main server entry point
```

## Modularity and Component Naming

### Self-Explanatory Component Names
All components must follow clear and descriptive naming that indicates their purpose:

1. **Component Naming Rules**:
   - Use PascalCase for component names (e.g., `ProductForm`, `InvoiceTable`)
   - Name should reflect the component's purpose and function
   - Use descriptive prefixes for specialized components:
     - `Enhanced` prefix for components with extended functionality (e.g., `EnhancedProductForm`)
     - `Basic` prefix for simpler versions (e.g., `BasicProductCard`)
     - `Custom` prefix for specialized implementation (e.g., `CustomDatePicker`)

2. **File Naming Conventions**:
   - Component files should match their component name (e.g., `InvoiceTable.jsx`)
   - Utility files should clearly indicate their purpose (e.g., `dataFormatters.js`, `validationUtils.js`)
   - Test files should append `.test` or `.spec` (e.g., `InvoiceTable.test.jsx`)

3. **Folder Organization**:
   - Group related components in dedicated folders (e.g., `forms/`, `tables/`, `modals/`)
   - Features should have their own folders with relevant components

### Modularity Principles

1. **Single Responsibility**:
   - Each component should have a single responsibility or function
   - Break complex components into smaller, focused components
   - Avoid components that exceed 300-400 lines of code

2. **Component Composition**:
   - Use composition over inheritance
   - Larger components should compose smaller, reusable components
   - Example: `EnhancedProductForm` should use `FormField` components

3. **Separation of Concerns**:
   - Separate UI rendering from business logic
   - Extract complex logic into custom hooks or utility functions
   - Keep data fetching separate from display components

4. **Props Interface**:
   - Component props should form a clear, intentional API
   - Provide sensible defaults for optional props
   - Use destructuring to make required props explicit

5. **Reusability**:
   - Design components for reuse across the application
   - Avoid hard-coding values that should be configurable
   - Use function parameters and component props for configuration

6. **Progressive Enhancement**:
   - Start with basic components and enhance as needed
   - Implement advanced features as extensions, not replacements
   - Example: `BasicTable` → `SortableTable` → `PaginatedTable` → `EnhancedDataTable`

## Design Patterns

### Frontend Patterns

1. **Component-Based Architecture**:
   - Reusable UI components with props for configuration
   - Container/presentation component pattern for separation of concerns

2. **Custom Hooks Pattern**:
   - Separating logic from UI components using custom React hooks
   - `useEffect` for data fetching and lifecycle management

3. **API Service Layer**:
   - Centralized API client (api.js) for all backend communication
   - Consistent error handling and response formatting

4. **Environment Variables Management**:
   - Using Vite's import.meta.env for accessing environment variables
   - Fallback values for development environments

### Backend Patterns

1. **MVC-like Pattern**:
   - Models: Database schema definitions (Sequelize)
   - Controllers: Request handling and response formatting
   - Routes: URL endpoint definitions
   
2. **Middleware Pattern**:
   - Authentication/authorization middleware
   - Error handling middleware
   - Request validation middleware
   
3. **Repository Pattern**:
   - Sequelize models abstract database operations
   - Service layers for business logic

4. **Environment Configuration Pattern**:
   - Centralized dotenv configuration in server.js
   - Configuration values passed to components as needed

## Data Flow Patterns

1. **OCR Processing Flow**:
   - Frontend uploads image to backend
   - Backend sends image to OCR service
   - OCR results returned to backend for processing
   - Processed data returned to frontend for display/verification
   
2. **Invoice History Flow**:
   - Frontend requests invoice data from backend
   - Backend retrieves invoice records from database
   - User expands row to see product details
   - Frontend fetches product details by invoice ID
   - Backend looks up product details and performs database joins between processed_invoice_items and product database
   - Frontend displays combined data

3. **Product Database Flow**:
   - Product data managed through CRUD operations
   - Supplier codes mapped to internal product codes
   - Products retrieved and filtered based on search criteria

## State Management

1. **React Component State**:
   - Local component state for UI elements
   - `useState` and `useReducer` for component-level state

2. **API Data State**:
   - Async data fetching with loading/error states
   - Data caching in component state

3. **Form State Management**:
   - Controlled components for form inputs
   - Form validation with error states

## Error Handling Patterns

1. **Frontend Error Handling**:
   - Try/catch blocks for async operations
   - Toast notifications for user feedback
   - Error state management for conditional rendering
   
2. **Backend Error Handling**:
   - Global error handling middleware
   - Structured error responses with status codes
   - Detailed error logging

## API Communication Patterns

1. **RESTful API Design**:
   - Resource-based URL structure
   - HTTP methods for CRUD operations
   - JSON request/response format
   
2. **API Response Format**:
   ```json
   {
     "success": true,
     "data": [...],
     "message": "Operation successful"
   }
   ```
   
3. **Environment-based API Configuration**:
   - API base URL from environment variables
   - Proxy configuration in development environment 