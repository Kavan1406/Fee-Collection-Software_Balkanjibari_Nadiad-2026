"""
SYSTEM UPDATE IMPLEMENTATION PLAN
Date: April 19, 2026

This document outlines all the critical fixes and features to be implemented
in the Student Enrollment & Batch Management System.
"""

IMPLEMENTATION_STEPS = {
    "1. ENROLLMENTS PAGE - SEARCH FIX": {
        "status": "COMPLETED",
        "file": "components/pages/EnrollmentsPage.tsx",
        "changes": [
            "✅ All 648 enrollments fetched with page_size: 10000",
            "✅ Search works across all fields (student name, phone, subject, batch)",
            "✅ Pagination disabled during search",
            "✅ Real-time filtering across entire dataset"
        ]
    },
    
    "2. STUDENTS PAGE - SORTING & SEARCH": {
        "status": "IN_PROGRESS",
        "file": "components/pages/StudentsPage.tsx",
        "required_changes": [
            "Add ORDER BY created_at DESC to show latest first",
            "Fetch all students for search (not just paginated)",
            "Search must include: Name, Phone, Subject, Batch",
            "Debounce search to 300ms"
        ]
    },
    
    "3. ENROLLMENT TIMESTAMP FIX": {
        "status": "IN_PROGRESS",
        "file": "components/pages/EnrollmentsPage.tsx",
        "required_changes": [
            "Use enrollment_date from database (not fake timestamp)",
            "Display in readable format: new Date(enrollment_date).toLocaleString()",
            "Backend: Ensure created_at or enrollment_date stored at registration"
        ]
    },
    
    "4. DELETE STUDENT - FREE SEAT LOGIC": {
        "status": "IN_PROGRESS",
        "file": "backend/apps/students/views.py",
        "required_changes": [
            "Find student's enrollments (subject_id, batch info)",
            "Update batch record: reduce currentStrength or remove allocation",
            "Use atomic transaction for consistency",
            "Update enrollment status to DELETED (soft delete)"
        ]
    },
    
    "5. EDIT STUDENT - RESTRICT FIELDS": {
        "status": "IN_PROGRESS",
        "file": "components/pages/StudentsPage.tsx",
        "required_changes": [
            "When editing: disable Subject field",
            "When editing: disable Batch Time field",
            "Backend validation: ignore subject/batch updates if editing",
            "UI: Show <input disabled /> for these fields"
        ]
    },
    
    "6. DELETE BUTTON WITH CONFIRMATION": {
        "status": "IN_PROGRESS",
        "file": "components/pages/StudentsPage.tsx",
        "required_changes": [
            "Add Delete button for admin only",
            "Show confirmation popup before deletion",
            "Call: await Student.deleteOne({ _id: studentId })",
            "Refresh student list after deletion"
        ]
    },
    
    "7. PERFORMANCE IMPROVEMENTS": {
        "status": "IN_PROGRESS",
        "required_changes": [
            "Implement debounced search (300ms)",
            "Add database indexes on: name, phone, subject, created_at",
            "Avoid duplicate API calls with useCallback",
            "Cache search results"
        ]
    }
}

CRITICAL_PRIORITY = [
    "Fix Students Page search to work across all records",
    "Implement delete student with seat freeing logic",
    "Add delete button with confirmation for admin",
    "Restrict subject/batch fields when editing student",
    "Implement debounced search"
]
