# Batch Configuration Storage & Structure

## Overview
Batch configurations are **NOT stored in a separate Batch model**. Instead, batch information is distributed across:
1. **Subject Model** - stores batch timing information per subject
2. **Enrollment Model** - stores selected batch time per enrollment
3. **Management Command** - initial data sync
4. **Frontend Configuration** - fallback batch timing arrays

---

## 1. Core Data Models

### Subject Model
**File:** [backend/apps/subjects/models.py](backend/apps/subjects/models.py)

**Batch-Related Fields:**
```python
class Subject(models.Model):
    # Batch timing fields
    default_batch_timing = models.CharField(
        max_length=200,
        default='7-8 AM',
        help_text='Default batch timing for this subject'
    )
    
    timing_schedule = models.CharField(
        max_length=200,
        blank=True,
        help_text='Class timing schedule (e.g., "Mon & Fri 5 PM - 6 PM")'
    )
    
    # Capacity limits
    max_seats = models.IntegerField(
        default=50,
        help_text='Maximum number of students for this subject'
    )
    
    # Activity classification
    activity_type = models.CharField(
        max_length=20,
        choices=[('SUMMER_CAMP', 'Summer Camp')],
        default='SUMMER_CAMP'
    )
```

**Key Relationships:**
- One Subject → Multiple Enrollments (enrollments related_name)
- One Subject → Multiple FeeStructures (fee_structures related_name)

### Enrollment Model
**File:** [backend/apps/enrollments/models.py](backend/apps/enrollments/models.py)

**Batch-Related Fields:**
```python
class Enrollment(models.Model):
    batch_time = models.CharField(
        max_length=50,
        default='7-8 AM',
        help_text='Batch timing for the subject'
    )
    
    # References
    student = models.ForeignKey(Student, related_name='enrollments')
    subject = models.ForeignKey(Subject, related_name='enrollments')
    
    # Fee tracking
    total_fee = models.DecimalField(...)
    paid_amount = models.DecimalField(default=0)
```

**Storage Pattern:**
- `batch_time` is stored as a **string** (not a foreign key)
- Examples: "7-8 AM", "5:00 PM - 6:00 PM", "Batch A: 5:00 PM – 6:00 PM (Ages 7–12)"

---

## 2. Batch Configuration Sources

### 2.1 Management Command - Initial Data Sync
**File:** [backend/apps/subjects/management/commands/sync_subjects.py](backend/apps/subjects/management/commands/sync_subjects.py)

**Purpose:** Initializes/updates all official summer camp subjects with batch timings

**Sample Configuration:**
```python
official_subjects = [
    {
        "name": "Skating",
        "fee": 600,
        "category": "SPORTS",
        "age": "4 to 16",
        "default_batch_timing": "7:00 AM - 8:00 AM",
        "timing_schedule": "Batch A: 7:00 AM - 8:00 AM | Batch B: 6:00 PM - 7:00 PM | Batch C: 7:00 PM - 8:00 PM | Batch D: 8:00 PM - 9:00 PM",
    },
    {
        "name": "Pencil Sketch",
        "fee": 600,
        "category": "ART",
        "age": "7 to 16",
        "default_batch_timing": "5:00 PM - 6:00 PM",
        "timing_schedule": "Batch A: 5:00 PM - 6:00 PM (Ages 7 to 12) | Batch B: 6:00 PM - 7:00 PM (Ages 7 to 16)",
    },
]
```

**Key Fields:**
- `default_batch_timing` - Single default batch for the subject
- `timing_schedule` - Pipe-separated (`|`) list of available batches with age ranges
- Batches are labeled as "Batch A", "Batch B", etc.

**Execution:**
```bash
python manage.py sync_subjects
```

### 2.2 Database Migrations
**Files:**
- [backend/apps/subjects/migrations/0003_subject_default_batch_timing.py](backend/apps/subjects/migrations/0003_subject_default_batch_timing.py)
- [backend/apps/subjects/migrations/0008_alter_subject_default_batch_timing.py](backend/apps/subjects/migrations/0008_alter_subject_default_batch_timing.py)
- [backend/apps/enrollments/migrations/0002_enrollment_batch_time.py](backend/apps/enrollments/migrations/0002_enrollment_batch_time.py)
- [backend/apps/enrollments/migrations/0007_alter_enrollment_batch_time.py](backend/apps/enrollments/migrations/0007_alter_enrollment_batch_time.py)

---

## 3. Batch Capacity & Limits

### 3.1 Subject-Level Capacity
**Field:** `Subject.max_seats` (default: 50)

**How Capacity is Tracked:**
```python
# SubjectSerializer - /backend/apps/subjects/serializers.py
enrolled_count = serializers.SerializerMethodField()

def get_enrolled_count(self, obj):
    """Calculate active enrollment count"""
    return getattr(obj, 'enrolled_count_annotated', 0)
```

**Query Annotation (SubjectViewSet):**
```python
queryset = Subject.objects.filter(
    is_deleted=False, 
    is_active=True
).annotate(
    enrolled_count_annotated=Count(
        'enrollments',
        filter=Q(
            enrollments__is_deleted=False,
            enrollments__status='ACTIVE'
        )
    )
).prefetch_related('fee_structures')
```

### 3.2 Batch-Wise Enrollment Tracking
**No dedicated batch capacity limits** - all batches of a subject share the `max_seats` limit.

**Example:** If Subject "Skating" has `max_seats=50`, all 4 batches share this 50-student limit.

---

## 4. API Endpoints & Serializers

### 4.1 Subject Listing/Details
**File:** [backend/apps/subjects/views.py](backend/apps/subjects/views.py)

**Endpoint:** `GET /api/v1/subjects/`

**Response includes:**
```json
{
  "id": 1,
  "name": "Skating",
  "category": "SPORTS",
  "activity_type": "SUMMER_CAMP",
  "default_batch_timing": "7:00 AM - 8:00 AM",
  "timing_schedule": "Batch A: 7:00 AM - 8:00 AM | Batch B: 6:00 PM - 7:00 PM | ...",
  "max_seats": 50,
  "enrolled_count": 32,
  "current_fee": {
    "amount": "600.00",
    "duration": "1_MONTH"
  }
}
```

**Serializer:** [backend/apps/subjects/serializers.py](backend/apps/subjects/serializers.py)
```python
class SubjectSerializer(serializers.ModelSerializer):
    enrolled_count = serializers.SerializerMethodField()
    
    class Meta:
        fields = ['id', 'name', 'default_batch_timing', 'timing_schedule', 
                  'max_seats', 'enrolled_count', ...]
```

### 4.2 Enrollment Creation
**File:** [backend/apps/students/serializers.py](backend/apps/students/serializers.py)

**Enrollment Data Structure:**
```python
# Student Registration includes:
enrolled_subjects = [
    {
        "subject_id": 5,
        "batch_time": "5:00 PM - 6:00 PM",  # String, not lookup
        "include_library_fee": false
    },
    {
        "subject_id": 3,
        "batch_time": "7:00 AM - 8:00 AM",
        "include_library_fee": true
    }
]
```

### 4.3 Batch Analytics Endpoints
**File:** [backend/apps/analytics/views.py](backend/apps/analytics/views.py)

**Available Batch Reports:**
- `@action` `export_batch_report_pdf` (line 932)
- `@action` `export_batch_report_csv` (line 977)

**SQL Query:**
```python
batches = Enrollment.objects.filter(is_deleted=False).values(
    'batch_time', 'subject__name'
).annotate(count=Count('id')).order_by('batch_time', 'subject__name')
```

---

## 5. Frontend Batch Configuration

### 5.1 Frontend Batch Timings Fallback
**File:** [app/register/page.tsx](app/register/page.tsx) (lines 65-92)

```typescript
const SUBJECT_BATCH_TIMINGS: Record<string, string[]> = {
  'Music': ['9:00 AM – 10:00 AM'],
  'Tabla': ['5:00 PM – 6:00 PM'],
  'Skating': ['7:00 AM – 8:00 AM', '6:00 PM – 7:00 PM', '7:00 PM – 8:00 PM', '8:00 PM – 9:00 PM'],
  'Pencil Sketch': ['Batch A: 5:00 PM – 6:00 PM (Ages 7–12)', 'Batch B: 6:00 PM – 7:00 PM (Ages 7–16)'],
  // ... 20+ subjects
}
```

### 5.2 Batch Timing Resolution Logic
**File:** [app/register/page.tsx](app/register/page.tsx) (lines 85-112)

```typescript
const getUniqueBatchTimings = (subject: Subject | undefined): string[] => {
  // 1. Parse timing_schedule (pipe-separated batches)
  const fromSchedule = (subject?.timing_schedule || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
  
  // 2. Get single default_batch_timing
  const fromDefault = subject?.default_batch_timing ? [subject.default_batch_timing] : []
  
  // 3. Combine backend data
  const fromBackend = [...fromSchedule, ...fromDefault]
  
  // 4. Fallback to hardcoded SUBJECT_BATCH_TIMINGS if backend is empty
  const fallback = SUBJECT_BATCH_TIMINGS[subject?.name || ''] || []
  const merged = fromBackend.length > 0 ? fromBackend : fallback
  
  // 5. Deduplicate by time range
  const bestByRange = new Map<string, string>()
  for (const item of merged) {
    const rangeKey = extractTimeRangeKey(item)
    const isLabeled = /batch\s*[a-z0-9]+\s*:/i.test(item)
    
    if (!current || (isLabeled && !currentIsLabeled)) {
      bestByRange.set(rangeKey, item)
    }
  }
  
  return Array.from(bestByRange.values())
}
```

### 5.3 Batch Time Normalization
**File:** [components/pages/StudentsPage.tsx](components/pages/StudentsPage.tsx) (lines 39-51)

```typescript
const normalizeBatchTime = (value: string) =>
  (value || '')
    .replace(/[\u2013\u2014]/g, '-')  // Convert en/em dashes to hyphens
    .replace(/\s+/g, ' ')              // Normalize spaces
    .trim()
    .toLowerCase()

const extractTimeRangeKey = (value: string) => {
  const normalized = normalizeBatchTime(value)
  const rangeMatch = normalized.match(/\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)/)
  return rangeMatch ? rangeMatch[0] : normalized
}
```

---

## 6. Admin Configuration

### 6.1 Django Admin Interface
**File:** [backend/apps/subjects/admin.py](backend/apps/subjects/admin.py)

```python
@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'instructor_name', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'instructor_name']
    inlines = [FeeStructureInline]
```

**Admin Fields:**
- `name` - Subject name
- `default_batch_timing` - Default batch (editable)
- `timing_schedule` - Pipe-separated batch options (editable)
- `max_seats` - Capacity limit (editable)
- `activity_type` - Classification

### 6.2 Subject edit via UI
**File:** [components/pages/DashboardPage.tsx](components/pages/DashboardPage.tsx) (lines 201-235)

**Batch Capacity Management:**
- Shows enrolled count vs max_seats per subject
- Admin can click "+10" button to extend `max_seats`
- Progress bar shows utilization percentage
- "FULL" badge appears when enrolled_count >= max_seats

---

## 7. Database Schema Summary

### Subjects Table
```
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE,
    category VARCHAR(50),
    activity_type VARCHAR(20),
    default_batch_timing VARCHAR(200),
    timing_schedule VARCHAR(200),
    max_seats INT DEFAULT 50,
    age_limit VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Enrollments Table
```
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id VARCHAR(30) UNIQUE,
    student_id INT FOREIGN KEY,
    subject_id INT FOREIGN KEY,
    batch_time VARCHAR(50),  -- String, not foreign key!
    total_fee DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    status VARCHAR(20),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

---

## 8. Current Limitations & Design Issues

1. **No Batch-Specific Capacity:** All batches of a subject share `max_seats`
   - Cannot set different capacity per batch (e.g., Batch A: 25, Batch B: 25)
   - Cannot set batch-specific fees

2. **String-Based Batch Storage:** `batch_time` is stored as VARCHAR
   - No validation against available batches
   - Potential for typos and inconsistency
   - Cannot enforce referential integrity

3. **No Batch Configuration Model:** Batch details (capacity, timing, age_range) are embedded in strings
   - Difficult to query by specific criteria
   - Reports must parse strings

4. **Limited Admin Batch Management:** 
   - Django Admin requires manual text editing of `timing_schedule` field
   - No UI form for adding/removing/editing individual batches
   - No batch-level enrollment limits

---

## 9. File Location Reference

### Models
- Subject & FeeStructure: `backend/apps/subjects/models.py`
- Enrollment: `backend/apps/enrollments/models.py`

### Serializers
- Subject: `backend/apps/subjects/serializers.py`
- Enrollment: `backend/apps/enrollments/serializers.py`
- Student: `backend/apps/students/serializers.py`

### Views & APIs
- Subject ViewSet: `backend/apps/subjects/views.py`
- Enrollment ViewSet: `backend/apps/enrollments/views.py`
- Analytics (batch reports): `backend/apps/analytics/views.py`

### Management Commands
- Sync Subjects: `backend/apps/subjects/management/commands/sync_subjects.py`

### Admin Configuration
- Subject Admin: `backend/apps/subjects/admin.py`
- Enrollment Admin: `backend/apps/enrollments/admin.py`

### Frontend
- Register Page (batch selection): `app/register/page.tsx`
- Students Page (batch normalization): `components/pages/StudentsPage.tsx`
- Dashboard (batch capacity): `components/pages/DashboardPage.tsx`
- Enrollment Page: `components/pages/EnrollmentPage.tsx`

### Database Migrations
- Default batch timing added: `backend/apps/subjects/migrations/0003_subject_default_batch_timing.py`
- Batch timing altered: `backend/apps/subjects/migrations/0008_alter_subject_default_batch_timing.py`
- Batch time in enrollment: `backend/apps/enrollments/migrations/0002_enrollment_batch_time.py`
- Batch time capacity expanded: `backend/apps/enrollments/migrations/0007_alter_enrollment_batch_time.py`

---

## Summary

**Batch Configuration Storage:**
1. **Subject.default_batch_timing** - Single batch per subject (VARCHAR 200)
2. **Subject.timing_schedule** - Pipe-separated batch options (VARCHAR 200)
3. **Subject.max_seats** - Shared capacity limit (INT, default 50)
4. **Enrollment.batch_time** - Selected batch per enrollment (VARCHAR 50)

**No dedicated Batch model exists.** Batch data is distributed across Subject and management command, with frontend fallback arrays.
