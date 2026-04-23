# Reports Module - Quick Start Guide

## Installation & Deployment

### Backend Setup

#### Step 1: Install Dependencies
```bash
cd backend
pip install reportlab  # PDF generation
# Already in requirements.txt, just ensure it's installed
```

#### Step 2: Verify Configuration
Django app and URLs are already configured:
- ✅ `apps.reports` added to `INSTALLED_APPS` in `config/settings/base.py`
- ✅ Reports URLs included in `config/urls.py`

#### Step 3: No Migrations Needed
Reports app has no models, so no database migrations required.

#### Step 4: Test Backend Endpoints
```bash
# Start Django server
python manage.py runserver

# Test endpoints:
curl http://localhost:8000/api/v1/reports/payments/
curl http://localhost:8000/api/v1/reports/enrollments/
```

### Frontend Setup

#### Step 1: No Dependencies to Install
All required packages already installed:
- date-fns (date utilities)
- sonner (toast notifications)
- Radix UI (components)
- axios (HTTP client)

#### Step 2: Route is Ready
Reports page accessible at:
- **Route**: `app/admin/reports/page.tsx` ✅
- **Navigation**: Sidebar menu item ✅
- **Lazy Loading**: DashboardLayout integration ✅

#### Step 3: Build & Test
```bash
# Development server
npm run dev
# Navigate to: http://localhost:3000/admin/reports

# Production build
npm run build
npm run start
```

---

## Usage

### For Admin Users
1. Click **Reports** in sidebar
2. Select **Payment Report** or **Enrollment Report** tab
3. Choose date range using pickers
4. Click **Apply Filter** to fetch data
5. Click **CSV** or **PDF** to export

### For Staff Users (with can_view_reports permission)
Same as admin users above.

### Programmatic Access
```typescript
import { reportsApi } from '@/lib/api/reports';

// Fetch data
const data = await reportsApi.getPaymentReport('2024-01-01', '2024-12-31');

// Export
await reportsApi.exportPaymentReportCSV('2024-01-01', '2024-12-31');
```

---

## API Usage

### Fetch Payment Report
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:8000/api/v1/reports/payments/?start_date=2024-01-01&end_date=2024-12-31"
```

### Export as PDF
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:8000/api/v1/reports/payments/export/pdf/?start_date=2024-01-01&end_date=2024-12-31" \
  -o payment_report.pdf
```

---

## Environment Variables

**No new environment variables needed!**

Uses existing:
- `NEXT_PUBLIC_API_URL` (for frontend API calls)
- `DEBUG` (Django debug mode)
- `ALLOWED_HOSTS` (API domain)

---

## Troubleshooting

### Issue: PDF Export Not Working
**Error**: `reportlab is not installed`
**Solution**: 
```bash
pip install reportlab==4.4.9
```

### Issue: 403 Permission Denied
**Error**: `{"detail": "Permission denied."}`
**Solution**: 
- Ensure you're logged in as admin
- Or staff user with `can_view_reports` permission
- Check JWT token is valid

### Issue: No Data Showing
**Error**: Table shows "No data found"
**Solutions**:
- Verify data exists in database for selected date range
- Check date format (should be YYYY-MM-DD)
- Try a wider date range

### Issue: Empty CSV/PDF Export
**Problem**: Export downloads but is empty
**Solution**:
- First fetch the report with "Apply Filter"
- Then click export buttons
- Export buttons should be enabled only after data loads

### Issue: API CORS Error
**Error**: `Access to XMLHttpRequest blocked by CORS policy`
**Solution**:
- Verify frontend URL is in `CORS_ALLOWED_ORIGINS` in Django settings
- Check `NEXT_PUBLIC_API_URL` is set correctly

---

## Testing

### Quick Test Sequence
```bash
# 1. Start backend
cd backend
python manage.py runserver

# 2. In another terminal, start frontend
npm run dev

# 3. Open browser
# http://localhost:3000/admin/reports

# 4. Test functionality
# - Set dates and click "Apply Filter"
# - Verify data loads
# - Click CSV and PDF export buttons
# - Check downloads work
```

---

## File Structure Verification

Ensure all files are created:

```
backend/apps/reports/
├── __init__.py ✅
├── apps.py ✅
├── models.py ✅
├── serializers.py ✅
├── views.py ✅
├── urls.py ✅
└── utils/
    ├── __init__.py ✅
    └── exports.py ✅

components/pages/ReportsPage/
├── index.tsx ✅
├── ReportFilterBar.tsx ✅
├── PaymentReportTable.tsx ✅
└── EnrollmentReportTable.tsx ✅

lib/api/
└── reports.ts ✅

app/admin/
└── reports/
    └── page.tsx ✅
```

---

## Performance Notes

- **First Load**: ~2-3 seconds (includes Django API call)
- **Export**: ~1-2 seconds (PDF generation on server)
- **Large Datasets**: Optimized queries with select_related()
- **Network**: Minimal payload (~100KB for typical report)

---

## Security Checklist

- ✅ Authentication required (JWT token)
- ✅ Authorization checks (IsAdminUser permission)
- ✅ Staff permissions validated (can_view_reports)
- ✅ Sensitive data masked (passwords as ***ENCRYPTED***)
- ✅ CORS properly configured
- ✅ No SQL injection (using ORM)
- ✅ No exposed API keys in frontend code

---

## Monitoring

### Check System Health
```bash
# Backend health
curl http://localhost:8000/health/

# Reports endpoint health
curl http://localhost:8000/api/v1/reports/payments/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Logs to Monitor
```bash
# Django logs (backend)
tail -f ./logs/django.log

# Next.js logs (frontend)
npm run dev  # Logs in console
```

---

## Documentation Links

- **Full Guide**: `REPORTS_MODULE_GUIDE.md`
- **Implementation Summary**: `REPORTS_IMPLEMENTATION_SUMMARY.md`
- **API Docs**: Available at `/api/schema/swagger-ui/`
- **OpenAPI Schema**: `/api/schema/`

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review full documentation in `REPORTS_MODULE_GUIDE.md`
3. Check API response codes section
4. Review console logs (frontend) and Django logs (backend)

---

## Deployment Checklist

- [ ] Install reportlab in production environment
- [ ] Verify CORS_ALLOWED_ORIGINS includes frontend domain
- [ ] Test API endpoints with valid JWT token
- [ ] Verify staff permissions configured correctly
- [ ] Test export functionality (CSV and PDF)
- [ ] Monitor initial server load/performance
- [ ] Check error logs for any issues
- [ ] Verify date filtering works correctly

---

**Last Updated**: April 16, 2026
**Status**: Ready for Deployment ✅
