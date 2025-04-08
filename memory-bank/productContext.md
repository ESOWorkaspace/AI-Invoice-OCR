# Product Context

## Purpose & Problem Statement
The OCR Invoice Processing System was built to solve the challenge of manually processing supplier invoices. Traditional invoice processing is:
- Time-consuming as staff must manually enter data
- Error-prone due to human mistakes in data entry
- Inefficient for tracking historical purchase trends
- Difficult for mapping supplier product codes to internal product database

The system automates this process by using OCR to extract key information from invoice images, making the entire workflow faster and more accurate.

## User Journey
1. **Upload**: User uploads an invoice image through the OCR Page
2. **Processing**: System processes the image with OCR to extract text
3. **Data Extraction**: OCR results are parsed to identify invoice details (number, date, supplier) and line items
4. **Validation**: System validates extracted data and highlights uncertain fields
5. **Manual Correction**: User can review and correct any errors in the extracted data
6. **Database Integration**: Processed invoice is stored in the database and product items are mapped to the internal product database using supplier codes
7. **History & Analysis**: User can view invoice history and analyze purchasing patterns

## Key User Experiences
The application focuses on several core experiences:

### 1. OCR Page
- Provides interface for uploading and processing invoice images
- Shows real-time OCR results with highlighting for uncertain data
- Allows users to validate and correct extracted information

### 2. History Page
- Lists all processed invoices with key details
- Expandable rows show detailed product information from each invoice
- When expanded, product details display data from both the invoice and the internal product database
- Maps supplier product codes to internal product codes

### 3. Database Management
- Dedicated pages for managing invoice records
- Product database management with full CRUD operations
- Relationship management between supplier products and internal product catalog

## Value Proposition
- **Time Savings**: Reduces invoice processing time by up to 80%
- **Error Reduction**: Minimizes data entry errors through automation
- **Cost Analysis**: Enables better purchasing decisions through historical data analysis
- **Inventory Integration**: Maps supplier products to internal inventory system
- **Historical Tracking**: Maintains complete record of all purchases for analysis

## Target Users
1. **Procurement Staff**: Processing supplier invoices and entering data
2. **Accounting Teams**: Reconciling purchases and managing payment information
3. **Inventory Managers**: Tracking product costs and supplier information
4. **Business Analysts**: Analyzing spending patterns and supplier pricing trends

## Success Metrics
- Number of invoices processed per day
- Accuracy of extracted data (% of fields requiring correction)
- Time saved compared to manual processing
- User satisfaction with the OCR accuracy and correction interface
- Successful mapping rate between supplier codes and internal product database 