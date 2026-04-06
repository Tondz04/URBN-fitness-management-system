# CSV Import/Export Guide for Inventory

## Overview
The Inventory system supports CSV import and export functionality for bulk product management. This guide explains how both features work.

## CSV Export

### How It Works
1. **Location**: Inventory page → Click "Export CSV" button
2. **File Format**: The exported CSV includes:
   - Product Name
   - Quantity (Stock)
   - Price
   - Cost (if available, Main Admin only)
   - Category
   - SKU/Product ID
   - Description (if available)
   - Status (Active/Inactive)

### Export Behavior
- Exports all currently visible products (respects search filters if active)
- File is automatically downloaded with filename: `inventory_YYYY-MM-DD.csv`
- Uses UTF-8 encoding for proper character support
- Headers are included in the first row

## CSV Import

### How It Works
1. **Location**: Inventory page → Click "Import CSV" button
2. **File Selection**: Choose a CSV file from your computer
3. **Processing**: The system automatically processes each row

### Import Logic

#### For Existing Products
- **Identification**: Products are matched by:
  - `id` column (Product ID)
  - `sku` column (SKU/Product ID)
- **Behavior**: If a product ID or SKU is found, the product is **updated** with new data
- **Fields Updated**:
  - Name
  - Price
  - Stock/Quantity
  - Category
  - Description
  - Status (Active/Inactive)
  - Cost (Main Admin only)

#### For New Products
- **Identification**: If no `id` or `sku` is provided, the system treats it as a **new product**
- **Required Fields**:
  - `name` or `product name` (Product Name) - **Required**
  - `price` - **Required** (must be > 0)
  - `stock` or `quantity` - **Required** (must be >= 0)
- **Optional Fields**:
  - `category` (defaults to "other" if not provided)
  - `description` (defaults to empty string)
  - `status` (defaults to "active" if not provided)
  - `cost` (Main Admin only, optional)
- **Behavior**: New products are **created** automatically

### CSV File Format

#### Required Columns
- **Product Name**: `name` or `product name`
- **Price**: `price` (numeric, must be > 0)
- **Stock/Quantity**: `stock` or `quantity` (numeric, must be >= 0)

#### Optional Columns
- **ID/SKU**: `id` or `sku` (for updating existing products)
- **Category**: `category` (text)
- **Description**: `description` (text)
- **Status**: `status` (text: "active" or "inactive")
- **Cost**: `cost` (numeric, Main Admin only)

#### Example CSV Format
```csv
name,price,stock,category,description,status
Protein Shake,150,50,supplements,High quality protein,active
Creatine,200,30,supplements,Muscle building supplement,active
Water Bottle,100,100,accessories,Reusable water bottle,active
```

### Validation Rules

#### For New Products
1. **Name**: Must not be empty
2. **Price**: Must be a valid number > 0
3. **Stock**: Must be a valid number >= 0
4. **Category**: If not provided, defaults to "other"
5. **Status**: If not provided, defaults to "active"

#### For Existing Products
- All validation rules apply
- Product must exist in the system (matched by ID or SKU)

### Error Handling

#### Import Results
After import, you'll see a notification showing:
- **Success Count**: Number of products successfully processed
- **Error Count**: Number of products that failed to import

#### Common Errors
1. **Missing Required Fields**: Name, price, or stock is missing or invalid
2. **Invalid Price**: Price is not a number or is <= 0
3. **Invalid Stock**: Stock is not a number or is < 0
4. **File Format Error**: CSV file is empty or improperly formatted
5. **Duplicate SKU**: SKU already exists (for new products)

### Best Practices

1. **Export First**: Always export your current inventory before making bulk changes
2. **Backup**: Keep a backup of your CSV file before importing
3. **Test with Small Files**: Test with a few products first before bulk imports
4. **Check Format**: Ensure your CSV uses commas as delimiters
5. **Validate Data**: Double-check prices and stock quantities before importing
6. **Use Headers**: Always include column headers in your CSV file
7. **UTF-8 Encoding**: Save your CSV file with UTF-8 encoding for special characters

### Access Control

- **Main Admin**: Full access to import/export, including cost field
- **Staff**: Can import/export inventory (cost field is hidden/ignored)

### Troubleshooting

#### Import Fails Completely
- Check file format (must be .csv)
- Ensure file is not empty
- Verify headers are present

#### Some Products Fail to Import
- Check required fields (name, price, stock)
- Verify numeric fields are valid numbers
- Check for special characters that might break parsing

#### New Products Not Created
- Verify required fields are present and valid
- Check that price > 0 and stock >= 0
- Ensure name field is not empty

#### Existing Products Not Updated
- Verify ID or SKU matches existing products
- Check that the product exists in the system
- Ensure all fields are in the correct format

