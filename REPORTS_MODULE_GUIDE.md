# Reports Module - Implementation Guide

## Overview

The Reports Module provides comprehensive reporting capabilities for the admin panel with two main reports:
1. **Payment Report** - Detailed payment transaction records
2. **Student Enrollment Report** - Student enrollment data with fees and payment status

Both reports support:
- Date range filtering
- Live data fetching from Supabase
- Export options (CSV and PDF)
- Clean, responsive table UI

---

## Backend Implementation

### Architecture

```
backend/apps/reports/
├── __init__.py
├── apps.py
├── models.py                 # No models (aggregates from other apps)
├── serializers.py            # PaymentReportSerializer, EnrollmentReportSerializer
├── views.py                  # ReportsViewSet with 6 endpoints
├── urls.py                   # URL routing
└── utils/
    ├── __init__.py
    └── exports.py            # CSV and PDF generation utilities
```

### API Endpoints

All endpoints require admin authentication (`IsAuthenticated` + `IsAdminUser`).

#### 1. Get Payment Report
```
GET /api/v1/reports/payments/?start_date=2024-01-01&end_date=2024-12-31
```

**Query Parameters:**
- `start_date` (optional): ISO format date (YYYY-MM-DD), default: 30 days ago
- `end_date` (optional): ISO format date (YYYY-MM-DD), default: today

**Response:**
```json
{
  "success": true,
  "count": 150,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "data": [
    {
      "receipt_id": "RCP-001",
      "payment_ref": "PAY-123456",
      "student_name": "John Doe",
      "subject_name": "Mathematics",
      "phone": "9876543210",
      "amount": "5000.00",
      "payment_mode": "ONLINE",
      "payment_status": "SUCCESS",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 2. Get Enrollment Report
```
GET /api/v1/reports/enrollments/?start_date=2024-01-01&end_date=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "count": 200,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "data": [
    {
      "student_name": "Jane Doe",
      "student_id": "STU-001",
      "phone": "9876543210",
      "subject_name": "English",
      "batch_time": "10:00 AM - 11:00 AM",
      "fees": "3000.00",
      "enrollment_datetime": "2024-01-20T14:15:00Z",
      "payment_status": "PAID",
      "subject_enrollment_id": "ENR-001",
      "login_id": "jane_doe",
      "password": "***ENCRYPTED***"
    }
  ]
}
```

#### 3. Export Payment Report as CSV
```
GET /api/v1/reports/payments/export/csv/?start_date=2024-01-01&end_date=2024-12-31
```
Returns: CSV file download

#### 4. Export Payment Report as PDF
```
GET /api/v1/reports/payments/export/pdf/?start_date=2024-01-01&end_date=2024-12-31
```
Returns: PDF file download

#### 5. Export Enrollment Report as CSV
```
GET /api/v1/reports/enrollments/export/csv/?start_date=2024-01-01&end_date=2024-12-31
```
Returns: CSV file download

#### 6. Export Enrollment Report as PDF
```
GET /api/v1/reports/enrollments/export/pdf/?start_date=2024-01-01&end_date=2024-12-31
```
Returns: PDF file download

---

## Frontend Implementation

### Architecture

```
components/pages/ReportsPage/
├── index.tsx                 # Main ReportsPage component
├── ReportFilterBar.tsx       # Date range filter component
├── PaymentReportTable.tsx    # Payment report display
└── EnrollmentReportTable.tsx # Enrollment report display

lib/api/
└── reports.ts              # API client with typed methods

app/admin/
└── reports/
    └── page.tsx            # Route page component
```

### Components

#### ReportsPage
Main component that manages all state and handles report data fetching and export.

**Props:**
```typescript
interface ReportsPageProps {
  userRole?: 'admin' | 'staff' | 'student' | 'accountant';
}
```

**Features:**
- Tabbed interface (Payment Report | Enrollment Report)
- Integrated date range filtering
- Data loading with spinner
- Toast notifications for user feedback

#### ReportFilterBar
Reusable filter component with date range picker and action buttons.

**Props:**
```typescript
interface ReportFilterBarProps {
  onFilter: (startDate?: string, endDate?: string) => void;
  isLoading?: boolean;
}
```

#### PaymentReportTable
Displays payment report data in a formatted table with export buttons.

**Props:**
```typescript
interface PaymentReportTableProps {
  data: PaymentReportData[];
  isLoading?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
}
```

**Columns:**
- Receipt ID
- Payment Reference
- Student Name
- Subject
- Phone Number
- Amount (formatted in INR)
- Payment Mode (with badge: 💳 Online / 💵 Cash)
- Payment Status (with color-coded badge)
- Date (formatted as DD/MM/YYYY)

#### EnrollmentReportTable
Displays enrollment report data in a formatted table with export buttons.

**Props:**
```typescript
interface EnrollmentReportTableProps {
  data: EnrollmentReportData[];
  isLoading?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
}
```

**Columns:**
- Student Name
- Student ID
- Phone Number
- Subject
- Batch Time
- Fees (formatted in INR)
- Enrollment Date & Time
- Payment Status (with color-coded badge)
- Subject Enrollment ID
- Login ID

### API Client

Located at `lib/api/reports.ts`, provides typed methods:

```typescript
// Fetch report data
reportsApi.getPaymentReport(startDate?, endDate?)
reportsApi.getEnrollmentReport(startDate?, endDate?)

// Export as CSV
reportsApi.exportPaymentReportCSV(startDate?, endDate?)
reportsApi.exportEnrollmentReportCSV(startDate?, endDate?)

// Export as PDF
reportsApi.exportPaymentReportPDF(startDate?, endDate?)
reportsApi.exportEnrollmentReportPDF(startDate?, endDate?)
```

---

## Database Queries

### Payment Report Query Flow

```
Payment
├── student_id → Student (name, phone)
├── enrollment_id → StudentSubjectEnrollment
│   └── subject_name
└── created_at (date filter)
```

### Enrollment Report Query Flow

```
StudentSubjectEnrollment
├── student_id → Student (name, id, phone, login_id)
├── subject_name
├── batch_time
├── total_fee
├── created_at (date filter)
└── enrollment_id → Payment (status)
```

### Optimizations

Both APIs use:
- `select_related()` for forward relations (Student, Subject, Enrollment)
- `order_by('-created_at')` for most recent records first
- Date-based filtering using `created_at BETWEEN start AND end`

---

## Export Formats

### CSV Export

Uses Python's `csv` module to generate RFC 4180 compliant CSV files.

**Features:**
- Header row with column names
- Proper escaping of special characters
- UTF-8 encoding
- Automatic browser download via blob

### PDF Export

Uses `reportlab` library to generate professional PDFs.

**Features:**
- Centered, styled header
- Report metadata (generation date, record count)
- Professional table layout with:
  - Blue header row with white text
  - Alternating row colors (white and light gray)
  - Bordered cells with proper spacing
  - Right-aligned numeric columns
- A4 page size with proper margins

**Sample PDF Output:**
```
═══════════════════════════════
      PAYMENT REPORT
═══════════════════════════════
Generated on: 2024-04-16 10:30:00
Total Records: 150

┌─────────────────────────────────┐
│ Receipt ID │ Payment Ref │ ... │
├─────────────────────────────────┤
│ RCP-001    │ PAY-123456  │ ... │
└─────────────────────────────────┘
```

---

## Setup & Configuration

### Backend Setup

1. **Register the app** (already done in `config/settings/base.py`):
```python
INSTALLED_APPS = [
    ...
    'apps.reports',
]
```

2. **Add URL routing** (already done in `config/urls.py`):
```python
urlpatterns = [
    ...
    path('api/v1/reports/', include('apps.reports.urls')),
]
```

3. **Install dependencies:**
```bash
pip install reportlab
```

### Frontend Setup

1. **Route is accessible** at: `/admin/reports`

2. **Uses existing UI components** from `@/components/ui`:
   - Button
   - Card
   - Popover
   - Table
   - Tabs
   - Toast (sonner)

3. **Date picker uses**: `date-fns` (already installed)

---

## Usage Examples

### For Admin Users

1. Navigate to **Reports** in sidebar
2. Click **Payment Report** or **Enrollment Report** tab
3. Set date range using date pickers
4. Click **Apply Filter** to fetch data
5. View data in formatted table
6. Export as **CSV** or **PDF** using buttons at table header

### For Staff Users

Same as above, but only if they have `can_view_reports` permission.

### Programmatic Usage

```typescript
import { reportsApi } from '@/lib/api/reports';

// Fetch payment data
const paymentData = await reportsApi.getPaymentReport('2024-01-01', '2024-12-31');

// Export as CSV
await reportsApi.exportPaymentReportCSV('2024-01-01', '2024-12-31');

// Export as PDF
await reportsApi.exportPaymentReportPDF('2024-01-01', '2024-12-31');
```

---

## Features Summary

✅ **Date Range Filtering** - Flexible date picker with defaults (last 30 days)
✅ **Live Data Fetching** - Real-time data from Supabase via Django ORM
✅ **CSV Export** - RFC 4180 compliant CSV files
✅ **PDF Export** - Professional PDF with styled tables
✅ **Responsive UI** - Mobile-friendly table layout
✅ **Loading States** - Spinner during data fetch
✅ **Empty States** - "No data found" message
✅ **Error Handling** - Toast notifications for errors
✅ **RBAC** - Admin/Staff permission checks
✅ **Performance Optimized** - Lazy loading, pagination-ready

---

## Future Enhancements

- [ ] Add pagination for large datasets
- [ ] Implement sorting by column headers
- [ ] Add advanced filters (payment mode, status, etc.)
- [ ] Export to Excel (XLSX) format
- [ ] Email report delivery
- [ ] Scheduled report generation
- [ ] Report templates customization
- [ ] Chart visualizations of trends

---

## Troubleshooting

### PDF Export Not Working
**Issue:** `reportlab is not installed`
**Solution:** Run `pip install reportlab` in the backend environment

### No Data Found
**Issue:** Reports show empty results
**Solution:** Verify date range overlaps with actual data in database

### Export Button Disabled
**Issue:** Export buttons are grayed out
**Solution:** First fetch report data by clicking "Apply Filter"

### API Returns 403 Error
**Issue:** "Permission Denied"
**Solution:** Ensure user has `IsAdminUser` permission or `can_view_reports` staff permission

---

## File Locations

**Backend:**
- App: `backend/apps/reports/`
- Views: `backend/apps/reports/views.py`
- Serializers: `backend/apps/reports/serializers.py`
- Exports: `backend/apps/reports/utils/exports.py`

**Frontend:**
- Components: `components/pages/ReportsPage/`
- API Client: `lib/api/reports.ts`
- Page Route: `app/admin/reports/page.tsx`

---

## API Response Codes

- `200 OK` - Successful data fetch or export
- `400 Bad Request` - Invalid date format or query parameters
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server-side error

---

## Performance Notes

- **Database Queries:** Optimized with `select_related()` joins
- **Data Transfer:** Only requested columns included in response
- **Frontend Rendering:** Uses React.memo for table rows
- **Export Generation:** Generated on-demand, not cached
- **File Download:** Browser-native blob download, no server storage

---

**Version:** 1.0.0
**Last Updated:** April 16, 2026
**Status:** Production Ready ✅
