# Analysis of Unit (Satuan) Synchronization System

## Overview

This document provides a detailed analysis of how the OCR Invoice Processing System synchronizes unit information between two key fields:

- `satuan`: The unit as it appears on the supplier's invoice (source data from OCR)
- `satuan_main`: The standardized unit used in the internal database system

The synchronization system ensures that data extracted from invoices with varying unit formats is properly mapped to standardized units in the database, enabling accurate pricing, inventory management, and reporting.

## File and Function Flow

The unit synchronization process spans multiple files and involves several key functions. Here's the complete flow:

```
┌───────────────────────────────────────────────────────────────────┐
│                       frontend/src/components/                     │
└───────────────────────────────────────────────────────────────────┘
   │
   │                 ┌─────────────────────────────┐
   │                 │      OCRPage.jsx            │
   │                 │   (Main OCR container)      │
   │                 └─────────────────┬───────────┘
   │                                   │
   │                                   ▼
   │                 ┌─────────────────────────────┐
   │                 │    OCRResultsTable.jsx      │
   │                 │ (Main data handling)        │
   │                 └─────────────────┬───────────┘
   │                                   │
   │           ┌─────────────┬─────────┴────────┬────────────┐
   │           │             │                  │            │
   │           ▼             ▼                  ▼            ▼
┌──────────────────┐ ┌─────────────┐ ┌────────────────┐ ┌───────────────┐
│  ItemsTable.jsx  │ │ItemsTableRow│ │ProductSearch   │ │serviceapi.js  │
│  (Monitors       │ │.jsx         │ │Dropdown.jsx    │ │(API calls)     │
│   sync issues)   │ │(UI display) │ │(Product lookup)│ │               │
└───────┬──────────┘ └─────┬───────┘ └────────┬───────┘ └───────┬───────┘
        │                  │                  │                  │
        └──────────────────┴──────────────────┴──────────────────┘
                                     │
                                     ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                        BACKEND                               │
     └─────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
     ┌─────────────────────────────────────────────────────────────┐
     │ backend/src/controllers/productItemController.js            │
     │ (Handles API requests for product data)                     │
     └─────────────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
     ┌─────────────────────────────────────────────────────────────┐
     │ backend/src/controllers/ocrController.js                    │
     │ (Updates product data from OCR results)                     │
     └─────────────────────────────────────────────────────────────┘
```

### Detailed Function Flow

1. **Initial Data Loading**:
   ```
   OCRPage.jsx
     └─> Renders OCRResultsTable
         └─> OCRResultsTable.jsx::useEffect (initial data normalization)
             └─> Processes incoming OCR data
                 └─> Initializes satuan/satuan_main fields
   ```

2. **Product Lookup Process**:
   ```
   OCRResultsTable.jsx::preprocessItems
     └─> OCRResultsTable.jsx::searchProductByInvoiceCode
         └─> services/api.js::productItemApi.getProductBySupplierCode
             └─> Backend API call (/api/product-items/supplier/:code)
                 └─> productItemController.js::getProductBySupplierCode
                     └─> Returns product with units data
                         └─> OCRResultsTable.jsx::mapProductToItem
                             └─> Updates satuan_main based on product data
   ```

3. **Unit Selection Priority

The system uses a multi-level priority system to select the appropriate `satuan_main` value:

1. **Direct supplier mapping**:
   - Matches invoice unit with known supplier unit mappings
   - Uses exact match first, then partial match

2. **Direct text matching**:
   - Compares the invoice unit directly with available units
   - Uses exact match first, then partial match (containment)
   - Helps identify units when names are similar but not identical

3. **Previous mapping**:
   - Uses previously confirmed mappings from prior invoices
   - Builds a learning database of mappings over time

4. **Price-based matching**:
   - If invoice has a price, finds unit with matching price (within 1% tolerance)
   - Helps identify units when names don't match but prices do

5. **First available with price**:
   - Selects first unit that has pricing information

6. **First available unit**:
   - Last resort - uses the first unit in the list

### 4. Bidirectional Synchronization

Changes to either field can trigger updates to the other:

#### When `satuan_main` changes (via dropdown):
- Defined in `handleUnitChange` function (OCRResultsTable.jsx)
- Updates unit price information
- Recalculates price differences
- Updates conversion factors
- Recalculates base unit quantity
- Stores the mapping for future reference
- Handles different unit data formats (objects with names or string arrays)

#### When `satuan` changes (manual edit):
- Defined in `handleItemChange` function (OCRResultsTable.jsx)
- Updates `satuan_main` to match the new value
- Attempts to find price information for the new unit
- Updates price differences if price information is found
- Stores the self-mapping for future reference

#### Automatic synchronization (ItemsTable.jsx):
- Watches for changes in `satuan` that haven't yet been reflected in `satuan_main`
- Runs the priority-based selection algorithm
- Updates `satuan_main` and related fields when necessary
- Tracks manual changes to avoid overriding user selections

## Data Structure

### Unit-Related Fields

1. **satuan**
   - Contains the unit name as written on the invoice
   - Extracted directly from OCR or entered manually
   - Structure: `{ value: String, is_confident: Boolean }`

2. **satuan_main**
   - Contains the standardized unit in the system
   - Structure:
     ```javascript
     {
       value: String,                     // Selected unit
       is_confident: Boolean,             // Confidence level
       available_units: Array,            // List of valid units for this product
       unit_prices: Object,               // Price mapping for each unit
       supplier_unit: String,             // Stored supplier unit for this mapping
       previous_mapping: Object,          // History of previous mappings
       conversion: Number,                // Conversion factor to base unit
       isBaseUnit: Boolean                // Whether this is the base unit
     }
     ```

3. **Related Fields**
   - `jumlah_base`: Quantity converted to base unit
   - `harga_dasar_main`: Base price for the selected unit
   - `perbedaan_rp`: Price difference in currency
   - `perbedaan_persen`: Price difference as percentage

## Synchronization Flow

### 1. Initial Data Loading

When OCR data is first loaded:
- `satuan` contains the unit identified from the invoice
- `satuan_main` is initialized empty or with default values
- The system attempts to find product matches based on supplier codes

### 2. Product Lookup Process

When a product is identified by supplier code, the system:
1. Retrieves product data including all available units
2. Collects unit conversion information and pricing data
3. Attempts to map the invoice unit (`satuan`) to a standard unit (`satuan_main`)
4. Stores both the mapping and all available units for future use

### 3. Unit Selection Priority

The system uses a multi-level priority system to select the appropriate `satuan_main` value:

1. **Direct supplier mapping**:
   - Matches invoice unit with known supplier unit mappings
   - Uses exact match first, then partial match

2. **Direct text matching**:
   - Compares the invoice unit directly with available units
   - Uses exact match first, then partial match (containment)
   - Helps identify units when names are similar but not identical

3. **Previous mapping**:
   - Uses previously confirmed mappings from prior invoices
   - Builds a learning database of mappings over time

4. **Price-based matching**:
   - If invoice has a price, finds unit with matching price (within 1% tolerance)
   - Helps identify units when names don't match but prices do

5. **First available with price**:
   - Selects first unit that has pricing information

6. **First available unit**:
   - Last resort - uses the first unit in the list

### 4. Bidirectional Synchronization

Changes to either field can trigger updates to the other:

#### When `satuan_main` changes (via dropdown):
- Defined in `handleUnitChange` function (OCRResultsTable.jsx)
- Updates unit price information
- Recalculates price differences
- Updates conversion factors
- Recalculates base unit quantity
- Stores the mapping for future reference
- Handles different unit data formats (objects with names or string arrays)

#### When `satuan` changes (manual edit):
- Defined in `handleItemChange` function (OCRResultsTable.jsx)
- Updates `satuan_main` to match the new value
- Attempts to find price information for the new unit
- Updates price differences if price information is found
- Stores the self-mapping for future reference

#### Automatic synchronization (ItemsTable.jsx):
- Watches for changes in `satuan` that haven't yet been reflected in `satuan_main`
- Runs the priority-based selection algorithm
- Updates `satuan_main` and related fields when necessary
- Tracks manual changes to avoid overriding user selections

### 5. UI Components

The system offers several UI elements for unit handling:

1. **Unit Dropdown**:
   - Displays available units from `satuan_main.available_units`
   - Allows manual selection of the proper unit
   - Implemented in ItemsTableRow.jsx

2. **Product Search Dropdown**:
   - Allows searching for products
   - When selected, updates both `satuan` and `satuan_main`
   - Keeps the relationship between supplier and standard units

## Persistence Mechanisms

1. **In-Session Memory**:
   - Previous mappings stored in `satuan_main.previous_mapping`
   - Product cache to avoid redundant API calls

2. **Database Storage**:
   - Updates `Satuan_Supplier` field in database when confirmed
   - Synchronizes mapping information for future use
   - Implemented in backend ProductUnit model and controller

## Technical Implementation

### Key Functions

1. **handleUnitChange** (OCRResultsTable.jsx):
   - Called when unit is changed via dropdown
   - Updates prices, conversions, and calculations
   - Handles different unit data formats and structures
   - Stores mapping information for future use

2. **handleItemChange** (OCRResultsTable.jsx):
   - General field update handler
   - Special case for 'satuan' field to update 'satuan_main'
   - Updates both supplier unit and actual unit value
   - Maintains previous mapping data structure

3. **useEffect for Automatic Sync** (ItemsTable.jsx):
   - Monitors for discrepancies between 'satuan' and 'satuan_main'
   - Implements the priority-based selection algorithm
   - Ensures manual changes aren't overridden
   - Supports multiple unit data formats

4. **Unit Dropdown Component** (ItemsTableRow.jsx):
   - Provides user interface for manual unit selection
   - Handles multiple unit data structures
   - Includes currently selected value even if not in available options
   - Provides proper error handling

### Data Flow

```
┌─────────────┐     ┌─────────────┐      ┌─────────────┐
│  OCR Data   │────▶│Product Lookup│─────▶│ Unit Mapping│
└─────────────┘     └─────────────┘      └─────────────┘
        ▲                                       │
        │                                       ▼
┌───────┴───────┐   ┌─────────────┐      ┌─────────────┐
│Manual Override│◀──│   UI Input   │◀─────│Price Updates│
└───────────────┘   └─────────────┘      └─────────────┘
```

### Process Flow

1. **Initial Data Loading**:
   ```
   OCRPage.jsx
     └─> Renders OCRResultsTable
         └─> OCRResultsTable.jsx::useEffect (initial data normalization)
             └─> Processes incoming OCR data
                 └─> Initializes satuan/satuan_main fields
   ```

2. **Product Lookup Process**:
   ```
   OCRResultsTable.jsx::simplifiedProductLookup
     └─> OCRResultsTable.jsx::mapProductToItem
         └─> services/api.js::productItemApi.getProductBySupplierCode
             └─> Backend API call (/api/product-items/supplier/:code)
                 └─> productItemController.js::getProductBySupplierCode
                     └─> Returns product with units data
                         └─> OCRResultsTable.jsx::updateProductDataInItem
                             └─> Updates satuan_main based on product data
   ```

3. **Unit Synchronization**:
   ```
   ItemsTable.jsx::useEffect (sync monitor)
     └─> Detects discrepancies between satuan and satuan_main
         └─> Applies priority-based selection algorithm:
             1. Direct supplier mapping
             2. Direct text matching
             3. Previous mapping
             4. Price-based matching
             5. First available with price
             6. First available unit
                └─> OCRResultsTable.jsx::handleUnitChange
                    └─> Updates prices and calculations
   ```

4. **Manual Unit Changes**:
   ```
   ItemsTableRow.jsx (UI dropdown)
     └─> User selects unit
         └─> ItemsTable.jsx marks as manually changed
             └─> OCRResultsTable.jsx::handleUnitChange
                 └─> Updates satuan_main with selected value
                 └─> Updates prices based on selected unit
                 └─> Updates conversion factors
                 └─> Stores mapping information
   ```

5. **Manual Satuan Changes**:
   ```
   ItemsTableRow.jsx (text input)
     └─> User changes satuan field
         └─> OCRResultsTable.jsx::handleItemChange
             └─> Updates satuan_main to match new value
             └─> Stores self-mapping in previous_mapping
             └─> Updates prices if matching price found
   ```

## Challenges and Edge Cases

1. **Ambiguous Unit Names**:
   - Same unit may have different names across suppliers
   - Solution: Multiple mapping techniques including direct text matching and fuzzy matching

2. **Different Unit Data Formats**:
   - Units can be stored as string arrays, object arrays, or in various nested formats
   - Solution: The system now handles multiple data formats and normalization

3. **Missing Price Information**:
   - When price data is unavailable, unit selection is less reliable
   - Solution: Prioritize direct text matching and supplier mappings over price-based matching

4. **New Units**:
   - When encountering previously unknown units
   - Solution: Store new mappings after confirmation and support self-mapping for direct matches

5. **Manual Overrides**:
   - System must respect user changes without constant auto-correction
   - Solution: Track manually changed units and avoid overriding with the manuallyChangedUnitIndex state

6. **Case Sensitivity and Special Characters**:
   - Units may have inconsistent casing or contain special characters
   - Solution: Normalize strings for comparison (lowercase, trim whitespace)

## Database Structure

The backend system stores unit information in the `ProductUnit` model:

```javascript
// ProductUnit model fields
{
  ID_Satuan: Integer,
  ID_Produk: Integer,
  Nama_Satuan: String,
  Satuan_Supplier: String,       // Key field for mapping
  Threshold_Margin: Decimal,
  Jumlah_Dalam_Satuan_Dasar: Decimal
}
```

The `Satuan_Supplier` field is specifically designed to store supplier-specific unit names that map to standardized system units.

## Improvement Opportunities

1. **Machine Learning for Unit Mapping**:
   - Build a more sophisticated mapping system based on historical data
   - Improve confidence scoring using pattern recognition

2. **Enhanced UI for Mapping Confirmation**:
   - Dedicated interface for confirming new unit mappings
   - Visual indicators for mapping confidence levels and match reasons

3. **Unit Normalization**:
   - Enhanced pre-processing of unit names to standardize formatting
   - Better handling of abbreviations and variations

4. **Bulk Mapping Updates**:
   - Tools for updating multiple mappings at once
   - Import/export of mapping data for system-wide consistency

5. **Performance Optimizations**:
   - Memoization of complex calculations
   - Batch processing for multiple unit updates
   - Caching commonly used unit mappings

## Test Data for Unit Synchronization

To validate the unit synchronization system, the following test data can be used. These test cases cover various edge cases and common scenarios.

### Test Case 1: Direct Supplier Unit Match

Input data structure:
```javascript
{
  "satuan": {
    "value": "DUS",
    "is_confident": true
  },
  "satuan_main": {
    "supplier_units": {
      "BOX": "DUS"
    },
    "available_units": ["PCS", "BOX", "CTN"],
    "unit_prices": {
      "PCS": 5000,
      "BOX": 60000,
      "CTN": 720000
    }
  },
  "harga_satuan": {
    "value": 60000,
    "is_confident": true
  }
}
```

Expected result:
- `satuan_main.value` should be "BOX" (direct supplier unit mapping)
- The system should recognize "DUS" in supplier_units and map it to "BOX"
- Price should match 60000 as an additional validation

### Test Case 2: Text Similarity Match

Input data structure:
```javascript
{
  "satuan": {
    "value": "KARTON",
    "is_confident": true
  },
  "satuan_main": {
    "available_units": ["PCS", "BOX", "CTN"],
    "unit_prices": {
      "PCS": 5000,
      "BOX": 60000,
      "CTN": 720000
    }
  },
  "harga_satuan": {
    "value": 720000,
    "is_confident": true
  }
}
```

Expected result:
- `satuan_main.value` should be "CTN" (partial text match between "KARTON" and "CTN")
- Price match confirms the selection

### Test Case 3: Price-Based Match

Input data structure:
```javascript
{
  "satuan": {
    "value": "X12",
    "is_confident": true
  },
  "satuan_main": {
    "available_units": ["PCS", "BOX", "CTN"],
    "unit_prices": {
      "PCS": 5000,
      "BOX": 60000,
      "CTN": 720000
    }
  },
  "harga_satuan": {
    "value": 59500,
    "is_confident": true
  }
}
```

Expected result:
- `satuan_main.value` should be "BOX" (price match within 1% tolerance)
- The system should match based on price similarity (59500 is within 1% of 60000)

### Test Case 4: Previous Mapping

Input data structure:
```javascript
{
  "satuan": {
    "value": "BTL",
    "is_confident": true
  },
  "satuan_main": {
    "available_units": ["PCS", "BOX", "CTN"],
    "unit_prices": {
      "PCS": 5000,
      "BOX": 60000,
      "CTN": 720000
    },
    "previous_mapping": {
      "BTL": "PCS"
    }
  },
  "harga_satuan": {
    "value": 10000,
    "is_confident": true
  }
}
```

Expected result:
- `satuan_main.value` should be "PCS" (previous mapping lookup)
- Even though the price doesn't match closely, previous mapping takes precedence

### Test Case 5: Manual Override Testing

Steps to test:
1. Start with data like Test Case 1 or 2
2. System automatically selects a unit
3. User manually changes `satuan_main` value using dropdown
4. System should not override the manual selection in subsequent operations
5. User manually changes `satuan` value
6. System should update `satuan_main` to match the new `satuan` value

### Test Case 6: Complex Mixed Format Units

Input data structure:
```javascript
{
  "satuan": {
    "value": "strip@10",
    "is_confident": true
  },
  "satuan_main": {
    "supplier_units": {
      "STRIP": "STRIP",
      "BOX": "BOX@10"
    },
    "available_units": [
      { "name": "PCS", "conversion": 1, "isBaseUnit": true },
      { "name": "STRIP", "conversion": 10, "isBaseUnit": false },
      { "name": "BOX", "conversion": 100, "isBaseUnit": false }
    ],
    "unit_prices": {
      "PCS": 1000,
      "STRIP": 10000,
      "BOX": 100000
    }
  },
  "harga_satuan": {
    "value": 10000,
    "is_confident": true
  }
}
```

Expected result:
- `satuan_main.value` should be "STRIP" (partial text match + price match)
- The system should handle the complex format "strip@10" and map it to "STRIP"

These test cases can be used to validate the unit synchronization system and ensure that all priority rules are working correctly. The expected behavior is based on the priority order defined in the system:

1. Direct supplier unit mapping
2. Text matching between invoice unit and available units
3. Previous mapping lookup
4. Price-based matching
5. First available unit with price
6. First available unit 