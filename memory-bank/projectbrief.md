# Project Brief: OCR Invoice Processing System

## Project Overview
This project is a web application for extracting data from invoice images using Optical Character Recognition (OCR). It functions as a microservice that processes invoices, extracts key information, and allows users to manage invoice data and products in a database.

## Core Functionality
1. **OCR Processing**: Upload and scan invoice images to extract text data
2. **Invoice Management**: View, edit, and manage processed invoices
3. **Product Database**: Maintain a database of products with pricing information
4. **Data Validation**: Ensure extracted data is accurate with validation systems
5. **Supplier Code Mapping**: Map supplier product codes to internal product codes

## Technical Stack
- **Frontend**: React with Vite, TailwindCSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **API Communication**: RESTful API endpoints
- **Styling**: TailwindCSS for responsive design
- **Tables**: TanStack React Table for data display
- **HTTP Client**: Axios for API requests

## Architecture
The application follows a client-server architecture:
- Frontend (React) communicates with backend via REST API
- Backend processes requests and interacts with the database
- Environment configuration stored in a single `.env` file at the project root
- Static files (uploaded images) served from backend

## Key Requirements
1. All environment variables stored in a single `.env` file at the project root
2. Consistent API URL configuration between frontend and backend
3. Proper error handling and validation of OCR data
4. Product details in the HistoryPage expandable rows must use supplier codes to look up main product database information

## Project Structure
- `/frontend`: React application (Vite)
- `/backend`: Node.js Express server
- `/uploads`: Storage for invoice images
- `/mockup_data`: Test data for development

## Data Flow
1. Users upload invoice images
2. OCR processes the images and extracts text
3. System parses the text into structured data
4. Users can view and edit the extracted data
5. Data is stored in the PostgreSQL database
6. Products from invoices are mapped to the main product database using supplier codes

## Current Focus
The current focus is on ensuring proper environment variable configuration to enable seamless communication between frontend and backend components, particularly for the HistoryPage which needs to display detailed product information from the database when rows are expanded. 