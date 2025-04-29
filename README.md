# 📊 AI Invoice OCR Processing System

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)

> ✨ **A modern web application to extract and process invoice data using OCR technology**

---

**⚠️ Project Status: Abandoned ⚠️**

**Development on this AI Invoice OCR system has been discontinued due to persistent bugs and significant user experience issues that proved difficult to resolve.**

While the core concept aimed to automate invoice processing via OCR and map extracted data against a product database, the implementation encountered several critical problems, primarily in the frontend:

*   **Frontend Instability:** Issues with file handling during uploads, unreliable API connections (often falling back to dummy data instead of the intended backend API specified in environment variables), and difficulties managing state leading to unpredictable behavior.
*   **UI/UX Problems:** Styling inconsistencies (e.g., incorrect text colors not matching validation status), poor performance during data mapping and editing in tables (causing excessive re-renders and a sluggish interface), and bugs within the product editing features.
*   **Debugging Challenges:** The accumulation of various hard-to-trace bugs led to the decision to halt further development on this specific codebase.

**The intention is now to pursue a manual data entry system, likely involving a complete rebuild.** This repository serves as an archive of the attempted OCR implementation and is no longer actively maintained.

The original overview and feature list below describe the *intended* functionality, not the final working state. Sections detailing setup and usage are preserved for historical context only.

---

## 🌟 Overview (Original Goal)

The AI Invoice OCR Processing System *was designed* as a powerful microservice to automate the extraction of data from invoice images using Optical Character Recognition (OCR) technology. This application *aimed* to streamline the invoice processing workflow by automatically extracting key information such as invoice numbers, dates, vendor details, and line items.

![App Demo](https://via.placeholder.com/800x400?text=AI+Invoice+OCR+Demo)

## ✅ Key Features (Intended)

- 🖼️ **OCR Processing**: Upload and process invoice images to extract structured data
- 📋 **Data Validation**: Confidence indicators for extracted data
- 📝 **Manual Editing**: Interactive UI to review and correct OCR results
- 🗃️ **Database Management**: Store, search, and manage processed invoices
- 🔄 **API Integration**: RESTful API for integration with other systems
- 📊 **Product Catalog**: Maintain a database of products for invoice matching
- 🔍 **Search Functionality**: Find invoices by number, vendor, or content

## 🚀 Getting Started (Archival - Not Recommended for Use)

**Note:** These instructions are preserved for archival purposes only. This project is abandoned and not recommended for active use or development due to the issues mentioned above.

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database
- Web browser (Chrome, Firefox, Edge recommended)

### Installation (Archival)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-invoice-ocr.git
   cd ai-invoice-ocr
   ```

2. **Configure environment variables**
   ```bash
   # Create a .env file based on .env.example or existing setup
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

5. **Initialize the database (if attempting to run)**
   ```bash
   cd ../backend
   # Command might be `node migrate.js init` or similar based on project setup
   # Review migrate.js and package.json scripts
   ```

## 🖥️ Running the Application (Archival - Not Recommended for Use)

**Note:** Running this application may expose the bugs and issues that led to its abandonment.

### Development Mode (Archival)

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

3. **Access the application (if it runs)**
   - Frontend: Typically http://localhost:5173 (check Vite output)
   - Backend API: Typically http://localhost:1512 (check backend config/env)

### Production Mode (Archival)

Potentially unstable and not recommended.

## 📋 Usage Guide (Intended Workflow - May Be Broken)

1. **Upload Invoice**: Navigate to the OCR page and upload an invoice image.
2. **Review Extraction**: Check the extracted data (expect potential inaccuracies or UI bugs).
3. **Edit if Needed**: Attempt to modify data (expect re-render issues or bugs).
4. **Save to Database**: Attempt to save the processed invoice.
5. **Manage Invoices**: Use the Database Management page (functionality may be incomplete or buggy).

## 🏗️ Project Structure

```
ai-invoice-ocr/
├── backend/               # Express.js server
│   ├── src/               # Backend source code
│   ├── migrations/        # Database migrations
│   └── uploads/           # Temporary file uploads (if used)
│   └── models/            # Sequelize models (likely)
│   └── config/            # Database config (likely)
├── frontend/              # React frontend application
│   ├── src/               # Frontend source code
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/            # Static assets
│   └── dist/              # Compiled frontend (production build output)
├── .env                   # Environment variables (critical, not committed)
├── .cursorrules           # AI assistant rules for this project
├── memory-bank/           # Documentation for AI assistant
└── README.md              # This file
```

## 🔌 API Reference (Archival)

Refer to the backend `README.md` or source code (`backend/src/routes` or similar) for details on the API endpoints that were implemented. Note that frontend connectivity issues were reported.

## 🧪 Testing (Archival)

Testing infrastructure might exist but is likely outdated or incomplete given the project's status.

## 🤝 Contributing

Contributions are no longer accepted as this project is abandoned.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Created by [Engineer Setengah Otak](https://github.com/engineersetengahotak)

---

⭐ **This repository is archived.** ⭐
