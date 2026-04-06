# RFID Integration Guide

## Overview

Your gym management system is now fully integrated with RFID hardware for member attendance tracking. The system supports:

- **13.56MHz USB RFID Contactless IC S50 S70 Card Reader**
- **RFID Cards (13.56MHz 125kHz)**

## How It Works

### Hardware Setup

1. **Connect the USB RFID Reader** to your computer
2. Most USB RFID readers act as **keyboard wedges** - they send the card ID as if it was typed on a keyboard
3. No special drivers are needed - the system automatically captures the input

### Assigning RFID Cards to Customers

#### Method 1: From the Customers Page

1. Go to the **Customers** page
2. Find the customer you want to assign an RFID card to
3. Click the **"➕ RFID"** button (or **"🔁 RFID"** if they already have one) in the Actions column
4. In the modal that opens:
   - **Option A (Recommended)**: Click the input field, then **scan the RFID card** using the USB reader
   - **Option B**: Manually type the RFID tag number
5. Click **"Assign RFID"** or **"Update RFID"**
6. The system will validate that the RFID tag is unique

#### Method 2: During Customer Creation/Edit

- When creating or editing a customer, you can manually enter or scan the RFID tag in the RFID field

### Using RFID for Attendance Tracking

#### Real-Time Scanning

1. Go to the **Tracking** page
2. Click on the **"RFID Scanner"** input field (it will show "Ready to Scan" when active)
3. **Scan an RFID card** using the USB reader
4. The system will:
   - Automatically detect the card ID
   - Look up the customer associated with that RFID tag
   - Check their membership status
   - Grant or deny access based on:
     - Account status (must be active)
     - Membership validity (must not be expired)
     - Membership expiration date
   - Record the access attempt in the database
   - Show a success/error notification

#### Manual Entry (Fallback)

- If the RFID reader is not working, you can use the **Manual Entry Controls** section
- Select a customer from the dropdown and click **"Record Manual Entry"**

### Access Control Logic

The system automatically grants or denies access based on:

1. **RFID Tag Not Assigned**: ❌ Denied - "RFID tag not assigned to any customer"
2. **Account Inactive**: ❌ Denied - "Account inactive"
3. **No Membership**: ❌ Denied - "No active membership"
4. **Membership Expired**: ❌ Denied - "Membership expired"
5. **Membership Expiring Soon (≤7 days)**: ✅ Granted - "Access granted (Membership expiring soon)"
6. **Valid Membership**: ✅ Granted - "Access granted"

### Viewing Access Logs

- All RFID scans are recorded in the **Tracking** page
- You can:
  - Search by customer name, RFID tag, status, reason, or timestamp
  - See granted/denied access attempts
  - View detailed information about each scan

### Removing RFID Tags

1. Go to the **Customers** page
2. Click the **"🔁 RFID"** button for a customer who has an RFID tag
3. In the modal, click **"Remove RFID"**
4. Confirm the removal

## Technical Details

### Database

- **tracking_entries** table stores all RFID access logs
- **users.rfid_tag** field stores the assigned RFID tag for each customer
- RFID tags must be unique across all customers

### API Endpoints

- `POST /api/rfid/scan` - Process an RFID scan
- `GET /api/tracking` - Get tracking entries (with pagination and filters)
- `DELETE /api/tracking/clear` - Clear all tracking data (Main Admin only)
- `POST /api/users/{id}/assign-rfid` - Assign RFID tag to a customer
- `DELETE /api/users/{id}/remove-rfid` - Remove RFID tag from a customer

### RFID Tag Format

- RFID tags are typically 8-16 character hexadecimal strings
- The system accepts any alphanumeric string
- Tags are stored as-is (case-sensitive)

## Troubleshooting

### RFID Reader Not Working

1. **Check USB Connection**: Ensure the reader is properly connected
2. **Test in Notepad**: Open Notepad and scan a card - you should see the card ID appear
3. **Browser Focus**: Make sure the input field is focused (clicked) before scanning
4. **Manual Entry**: Use the manual entry option as a fallback

### Card Not Detected

- Ensure the card is within range of the reader (typically 2-5cm)
- Try scanning multiple times
- Check if the card is damaged
- Verify the card is the correct frequency (13.56MHz)

### "RFID tag not assigned" Error

- The scanned RFID tag is not assigned to any customer
- Go to the Customers page and assign the RFID tag to the customer

### Duplicate RFID Tag Error

- Each RFID tag can only be assigned to one customer
- If you see this error, the tag is already assigned to another customer
- Remove it from the other customer first, or use a different card

## Best Practices

1. **Assign RFID tags immediately** when a new customer signs up
2. **Test the RFID reader** before the gym opens each day
3. **Keep a record** of which RFID tag is assigned to which customer (the system tracks this automatically)
4. **Replace lost cards** by removing the old RFID tag and assigning a new one
5. **Regular backups** - The tracking data is stored in the database and included in your backups

## Security Notes

- Only **Main Admin** can clear tracking data
- All staff can view tracking logs
- RFID tags are unique and cannot be duplicated
- Access is automatically validated based on membership status
