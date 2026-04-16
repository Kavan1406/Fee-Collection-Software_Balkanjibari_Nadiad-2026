# Batch Management System - Testing Checklist

## ✅ Admin Batch Manager Tests

### Basic Operations
- [ ] **View Batch Manager**
  - Go to Admin → Subjects
  - Click grid icon on any subject
  - Modal opens showing batch manager
  - No errors in console

- [ ] **Create Batch**
  - Enter batch name: "Test Batch A"
  - Enter capacity: 25
  - Click "Create Batch"
  - Batch appears in list immediately
  - Shows: "Test Batch A (0/25) 🟢 Open"

- [ ] **Create Multiple Batches**
  - Create 3 batches for same subject
  - All batches display correctly
  - Each has independent capacity counter

### Status Control
- [ ] **Close Batch (STOP)**
  - Create batch with students
  - Click STOP button
  - Batch changes to "🔴 CLOSED"
  - Cannot be selected in registration
  - Students already enrolled stay enrolled

- [ ] **Open Batch (reopen)**
  - Click OPEN button on closed batch
  - Changes back to "🟢 Open"
  - Can be selected in registration again

### Capacity Management
- [ ] **Edit Capacity**
  - Batch shows "10/25"
  - Click EDIT
  - Prompt shows current capacity: 25
  - Change to 35
  - Batch updates to show "10/35"

- [ ] **Edit to Lower Capacity**
  - Batch has 8 enrolled, capacity 25
  - Edit to capacity 10
  - Updates to "8/10"
  - Batch status changes to 🔴 FULL (since 8 < 10 is false - wait, 8 is not >= 10)
  - Actually batch shows "8/10" (not full since 8 < 10)
  - If edit to 7: shows "8/7" 🔴 FULL (8 enrolled exceeds capacity 7)

### Deletion
- [ ] **Delete Batch**
  - Click DELETE on batch
  - Confirmation appears
  - Confirm deletion
  - Batch removed from list
  - API call succeeds

---

## ✅ Student Registration Tests

### Batch Selection & Validation

- [ ] **Subject Select → Fetch Batches**
  - Register page loads
  - Select "Skating"
  - Dropdown shows all Skating batches
  - Lists show accurate enrollment: "Batch A (10/30)"

- [ ] **Available Batch Selection**
  - Batch A: 15/30 (Open)
  - Batch B: 30/30 (Full)
  - Batch C: Closed
  - Can select: Batch A ✅
  - Cannot select: Batch B ❌ 
  - Cannot select: Batch C ❌

- [ ] **Full Batch Detection**
  - Batch at 30/30
  - Try to select it
  - Option appears disabled (grayed out)
  - Error message: "This batch is full. Please select another batch."
  - Form won't submit

- [ ] **Closed Batch Detection**
  - Batch is closed (is_active = false)
  - Try to select it
  - Option appears disabled (grayed out)
  - Error message: "This batch is currently closed for enrollments."
  - Form won't submit

### Form Validation
- [ ] **Valid Batch Selected**
  - Select available batch
  - Fill all required fields
  - Submit button is enabled ✅
  - Form submits successfully

- [ ] **Invalid Batch Selected**
  - Select full or closed batch
  - Other fields filled correctly
  - Submit button disabled ❌
  - Error message shows above submit button

---

## 🔄 Integration Tests

### Enrollment & Capacity
- [ ] **Capacity Updates on Enrollment**
  - Batch A shows 10/30
  - Student enrolls in Batch A
  - Refresh or re-fetch
  - Batch A shows 11/30

- [ ] **Full Status After Enrollment**
  - Batch has 29/30 capacity
  - Student enrolls
  - Becomes 30/30
  - Status changes to 🔴 FULL
  - Dropdown shows as disabled
  - New students see error message

- [ ] **Batch with Same Name Different Subject**
  - Skating: Batch A (7-8 AM)
  - Swimming: Batch A (7-8 AM)
  - Each independent
  - Capacity limits separate
  - Enrollment separate

### Admin Control Flow
- [ ] **Prevent Overbooking**
  - Set Batch A capacity to 5
  - Only 5 students can enroll
  - 6th student gets full error
  - Admin closes batch to force other batch selection

- [ ] **Migration Scenario**
  - Batch A at 30/30 (FULL)
  - Admin opens Batch B (new)
  - Batch B shows as available
  - New students directed to Batch B
  - Batch A remains full (protects existing)

---

## 🐛 Error Cases

### Backend Errors
- [ ] **Duplicate Batch Time**
  - Create "Batch A (7-8 AM)"
  - Try to create same again
  - Error message: "Batch with this time already exists"
  - Form stays open

- [ ] **Invalid Capacity**
  - Try capacity: 0
  - Try capacity: -10
  - Try capacity: "abc"
  - Error message for invalid input
  - Validation prevents submission

### Network/Permission Errors
- [ ] **No Permission (403)**
  - Non-admin user tries batch manager
  - Sees 403 error (if exposed)
  - Or empty state with no batch icon

- [ ] **Not Found (404)**
  - Batch deleted by another admin
  - Try to edit deleted batch
  - 404 error
  - Refresh shows batch is gone

### UI Edge Cases
- [ ] **Very Long Batch Name**
  - Create batch: "This is a very long batch name that might overflow"
  - Modal still displays correctly
  - Text wraps or truncates gracefully

- [ ] **Many Batches (30+)**
  - Create 30+ batches
  - Modal scrolls properly
  - Performance acceptable
  - All batches display

---

## 📊 Data Verification

### Check Database State

```sql
-- View all batches for a subject
SELECT id, batch_time, capacity_limit, is_active, 
       (SELECT COUNT(*) FROM enrollments WHERE subject_batch_id = id) as enrolled
FROM subject_batches
WHERE subject_id = <subject_id>
ORDER BY id;

-- Check for duplicate batch times
SELECT batch_time, COUNT(*) 
FROM subject_batches 
WHERE subject_id = <subject_id>
GROUP BY batch_time 
HAVING COUNT(*) > 1;

-- View enrollment for specific batch
SELECT sb.batch_time, COUNT(e.id) as enrolled, sb.capacity_limit
FROM subject_batches sb
LEFT JOIN enrollments e ON sb.id = e.subject_batch_id
WHERE sb.id = <batch_id>
GROUP BY sb.id;
```

---

## 🚀 Performance Tests

- [ ] **Create 50 batches** - Modal still responsive
- [ ] **Modal with 100+ enrollments** - Enrollment count calculation fast
- [ ] **Rapid open/close toggles** - No duplicate requests
- [ ] **Parallel update requests** - Last write wins, no race conditions

---

## 📱 Cross-Browser Tests

- [ ] Chrome: Batch manager modal
- [ ] Firefox: Batch dropdown in register
- [ ] Safari: Batch status updates
- [ ] Mobile (responsive): Batch buttons clickable

---

## ✨ Final Sign-Off

**When all tests pass:**
- [ ] Batch management is production-ready
- [ ] Students cannot select invalid batches
- [ ] Admins have full control
- [ ] Capacity limits enforced
- [ ] No overbooking possible
- [ ] System is scalable

---

**Test Date:** _________  
**Tester Name:** _________  
**Status:** ☐ PASS ☐ FAIL  
**Notes:** _________
