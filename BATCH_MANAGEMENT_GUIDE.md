# Batch Management System - Complete Guide

## 🎯 Overview
The batch management system allows admins to set capacity limits for individual batches and control enrollment by opening/closing batches. This prevents overbooking and gives granular control over subject batch availability.

## 📋 How It Works

### Admin Flow: Managing Batches

#### 1. **Open Subject Batch Manager**
- Go to **Admin → Subjects**
- Find the subject (e.g., "Skating")
- Click the **grid icon ⊞** on the subject card

#### 2. **View Batch Manager Modal**
The modal shows:
- **CREATE NEW BATCH section** (top)
  - Batch Name/Time input (e.g., "Batch A (7-8 AM)")
  - Capacity Limit input
  - "Create Batch" button

- **EXISTING BATCHES section** (below)
  - Lists all batches for this subject
  - Shows: Batch name, enrollment status, capacity info
  - Action buttons for each batch

#### 3. **Create a Batch**
```
Example: Skating - Batch A
- Batch Name: "Batch A (7-8 AM)"
- Capacity Limit: 30
- Click "Create Batch"
```

#### 4. **Manage Batch Status**
For each batch, you can:

**🔴 STOP Button (when Open)**
- Changes batch to `is_active = false`
- Shows as "Closed" (red)
- No new enrollments allowed
- Use when batch is full: "Batch A (30/30) 🔴 FULL"

**🟢 OPEN Button (when Closed)**
- Changes batch to `is_active = true`
- Shows as "Open" (green)
- Allows enrollments again

**📝 EDIT Button (when has available seats)**
- Prompt appears with current capacity
- Enter new capacity limit
- Updates immediately

**🗑️ DELETE Button**
- Removes batch (confirm first)
- Only if batch exists and has data

#### 5. **Visual Indicators**
- **🟢 Green border + "Open"** = Accepting enrollments
- **🔴 Red border + "Closed"** = Not accepting enrollments
- **🔴 FULL tag** = Batch has reached capacity
- **Progress bar** = Visual representation of enrollment

---

## 👨‍🎓 Student Flow: Registration With Batch Validation

### 1. **Select Subject**
- Student picks a subject (e.g., "Skating")
- Form fetches all batches for that subject

### 2. **View Available Batches**
Batch dropdown shows:
```
Batch A (20/30)           ✅ Green - Can select
Batch B (30/30) 🔴 FULL   ❌ Red - Cannot select (full)
Batch C 🔒 CLOSED         ❌ Gray - Cannot select (admin closed)
Batch D (15/30)           ✅ Green - Can select
```

### 3. **Select Batch**
- Student can only select open batches with available seats
- If tries to select full/closed batch: notification appears
  - *"This batch is full. Please select another batch."*
  - *"This batch is currently closed for enrollments."*

### 4. **Submit Registration**
- Form validation prevents submission if:
  - Selected batch is full
  - Selected batch is closed
  - No valid batch selected

---

## 🔧 Technical Architecture

### Database Model: `SubjectBatch`
```python
SubjectBatch:
├── subject (FK) - Link to Subject
├── batch_time (String) - "Batch A (7-8 AM)"
├── capacity_limit (Integer) - Max seats
├── is_active (Boolean) - Open for enrollment?
├── enrolled_count (Property) - Auto-calculated
├── available_seats (Property) - Remaining capacity
└── is_full (Property) - True if no seats available
```

### API Endpoints

#### List/Create Batches for a Subject
```
GET  /api/v1/subjects/{subject_id}/batches/
POST /api/v1/subjects/{subject_id}/batches/
```

#### Manage Individual Batch
```
GET    /api/v1/subjects/{subject_id}/batches/{batch_id}/
PATCH  /api/v1/subjects/{subject_id}/batches/{batch_id}/
DELETE /api/v1/subjects/{subject_id}/batches/{batch_id}/
```

#### Toggle Batch Status (Open/Close)
```
PATCH /api/v1/subjects/{subject_id}/batches/{batch_id}/toggle-status/
```

### Frontend Components

**SubjectsPage.tsx**
- Batch manager modal
- Create/Edit/Delete batches
- Toggle batch open/close status
- View batch enrollment data

**register/page.tsx**
- Fetch batches when subject selected
- Show batch availability in dropdown
- Validate batch before submission
- Display batch status alerts

### API Client Methods (lib/api/subjects.ts)

```typescript
// Get all batches for a subject
getBatches(subjectId): Promise<SubjectBatch[]>

// Create new batch
createBatch(data): Promise<SubjectBatch>

// Update batch capacity
updateBatch(subjectId, batchId, data): Promise<SubjectBatch>

// Toggle batch open/closed status
toggleBatchStatus(subjectId, batchId): Promise<SubjectBatch>

// Delete batch
deleteBatch(subjectId, batchId): Promise<void>
```

---

## 📊 Practical Scenario: Skating with Full Batch

### Setup
Skating Subject:
- Batch A: 7-8 AM (30 seats) → FULL
- Batch B: 6-7 PM (30 seats) → 15 enrolled
- Batch C: 7-8 PM (30 seats) → 25 enrolled
- Batch D: 8-9 PM (30 seats) → 5 enrolled

### Admin Action
1. Admin sees Batch A is full (30/30)
2. Clicks **STOP** button on Batch A
3. Batch A now shows: "🔒 CLOSED" (red)

### Student Experience
1. Student selects "Skating"
2. Dropdown shows:
   - Batch A: 🔴 FULL (disabled)
   - Batch B: ✅ Open (15/30)
   - Batch C: ✅ Open (25/30)
   - Batch D: ✅ Open (5/30)

3. Student cannot select Batch A
4. Gets error: *"This batch is full. Please select another batch."*
5. Must pick Batch B, C, or D

### Result
✅ Batch A is protected from further enrollments
✅ Students directed to available batches
✅ Fair distribution across batches
✅ Admin has full control

---

## ⚙️ Configuration Notes

### Default Batch Settings
- New batches default to `is_active = true` (open)
- Capacity limit is customizable (default 50)
- Batch names support: "Batch A (7-8 AM)" or "Morning Batch"

### Validation Rules
1. **Cannot create duplicate batch_time** for same subject
2. **Cannot select full batch** in registration
3. **Cannot select closed batch** in registration
4. **Cannot submit form** with invalid batch selection

### Real-time Updates
- Enrollment counts update automatically
- "Enrolled: X / Capacity" shows current status
- Progress bar reflects utilization
- Color coding changes based on capacity

---

## 🚀 Quick Start Checklist

- [ ] Database migrations applied (`SubjectBatch` model exists)
- [ ] Backend API endpoints working (`/api/v1/subjects/{id}/batches/`)
- [ ] SubjectsPage batch manager displays correctly
- [ ] Can create new batches with capacity limits
- [ ] Can toggle batch open/closed status
- [ ] Can update batch capacity
- [ ] Can delete batches
- [ ] Registration form validates batch availability
- [ ] Students see correct batch availability
- [ ] Notifications show when batch is full/closed
- [ ] Form prevents submission with invalid batch

---

## 🔍 Troubleshooting

### Batches Not Showing
- Check if API endpoint is returning data
- Verify subject ID is being passed correctly
- Look for browser console errors

### Cannot Toggle Batch Status
- Ensure user has admin/staff permissions
- Verify batch ID exists in database
- Check API response for errors

### Registration Form Not Validating
- Verify `fetchBatchesForSubject` is called
- Check if `batchData` state is populated
- Ensure `getBatchInfo` returns batch object

### Batch Capacity Not Updating
- Refresh page to see latest data
- Verify update request was successful
- Check if batch edit function includes subject ID

---

## 📝 Notes

- Batches are specific to subjects (same batch name can exist across different subjects)
- Enrollment count is auto-calculated from active enrollments
- Soft delete not used for batches (permanent deletion)
- Batch status is instant (no confirmation needed)

