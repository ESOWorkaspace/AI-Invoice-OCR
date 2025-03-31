# 🎨 AI Invoice OCR - Frontend Application

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18%2B-blue.svg)
![Vite](https://img.shields.io/badge/Vite-4%2B-yellow.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)

> 🖌️ **Interactive React frontend for the AI Invoice OCR Processing System**

## 📋 Overview

This is the React frontend for the AI Invoice OCR Processing System. Built with modern web technologies, it provides an intuitive user interface for uploading invoices, reviewing OCR extraction results, editing data, and managing the invoice database.

## ✨ Key Features

- 📊 **OCR Processing Page**: Upload and process invoice images with real-time previews
- 🔄 **Interactive Editing**: Review and correct OCR extraction with confidence indicators
- 📱 **Responsive Design**: Works seamlessly across desktop and mobile devices
- 🗄️ **Database Management**: View, search, edit, and delete processed invoices
- 🎯 **Data Visualization**: Clearly highlights low-confidence data for review
- 🔍 **Search Functionality**: Find invoices by number, vendor, or content
- 🖼️ **Image Preview**: View original invoice images alongside extracted data

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm package manager
- Backend API server running (see backend README)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Create a .env or .env.local file with:
   VITE_API_URL=http://localhost:1512
   ```

## 🏃‍♂️ Running the Application

**Development Mode**
```bash
npm run dev
```

**Production Build**
```bash
npm run build
```

**Preview Production Build**
```bash
npm run preview
```

## 📱 Pages and Components

### Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `HomePage` | Welcome page with navigation to app features |
| `/ocr` | `OCRPage` | Main OCR processing page for invoice uploads |
| `/database/manage` | `DatabaseManagePage` | View and manage processed invoices |
| `/invoice/:id` | `InvoiceDetailPage` | Detailed view of a specific invoice |
| `/product/manage` | `ProductManagePage` | Manage product catalog |

### Key Components

- **`ProcessedInvoiceForm`**: Form for reviewing and editing OCR data
- **`InvoiceTable`**: Displays invoice line items with confidence indicators
- **`ImageUploader`**: Handles image upload with drag-and-drop support
- **`ImagePreview`**: Displays the original invoice image
- **`DataTable`**: Reusable table component with sorting and filtering
- **`EditableField`**: Editable field with confidence indicator

## 🎨 UI/UX Features

- **Color-coded Confidence**: 
  - White: High-confidence data
  - Orange: Low-confidence data that needs review
  - Red: Missing or unrecognized data
  
- **Responsive Design**:
  - Desktop: Full-featured interface with side-by-side views
  - Tablet: Optimized layout with collapsible sections
  - Mobile: Stack view with accessible controls

- **Interactive Elements**:
  - Drag-and-drop file uploads
  - Real-time data validation
  - Inline editing of extracted data
  - User-friendly notifications

## 🔄 API Integration

The frontend communicates with the backend API using Axios. Main API endpoints used:

- `POST /api/ocr/upload`: Upload invoice image for OCR processing
- `POST /api/ocr/save`: Save processed OCR data
- `GET /api/invoices`: Retrieve all processed invoices
- `GET /api/invoices/:id`: Get specific invoice details
- `PUT /api/invoices/:id`: Update invoice data
- `DELETE /api/invoices/:id`: Delete an invoice

## 🏗️ Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Images, fonts, and other static resources
│   ├── components/         # Reusable React components
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   ├── tables/         # Table components
│   │   └── ui/             # UI components (buttons, inputs, etc.)
│   ├── contexts/           # React contexts for state management
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── database/       # Database management pages
│   │   ├── ocr/            # OCR processing pages
│   │   └── products/       # Product management pages
│   ├── services/           # API service functions
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main application component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles
├── .env                    # Environment variables
└── vite.config.js          # Vite configuration
```

## 🖌️ Styling

The application uses Tailwind CSS for styling with a custom design system:

- **Primary Colors**: 
  - Blue (#3B82F6): Primary actions, links
  - Green (#10B981): Success, confirmations
  - Red (#EF4444): Errors, destructive actions
  - Orange (#F59E0B): Warnings, low confidence data

- **Typography**:
  - Inter font family
  - Responsive sizing
  - Clear hierarchy with consistent heading styles

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run component tests with Vitest
npm run test:components

# Run end-to-end tests
npm run test:e2e
```

## 📱 Responsive Design

The frontend is fully responsive and works on:
- 💻 Desktops (1024px and above)
- 📱 Tablets (768px to 1023px)
- 📱 Mobile devices (below 768px)

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 👨‍💻 Author

Created by [Engineer Setengah Otak](https://github.com/engineersetengahotak)

---

⭐ **Built with React and ❤️** ⭐
