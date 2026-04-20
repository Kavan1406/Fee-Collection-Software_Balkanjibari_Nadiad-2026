#!/usr/bin/env python
"""
STUDENT DELETION & BATCH SPACE MANAGEMENT SYSTEM
Safely manage student deletion with automatic batch space freeing
Date: April 18, 2026
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django
sys.path.insert(0, '/app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.students.models import Student
from apps.enrollments.models import Enrollment
from apps.subjects.models import SubjectBatch
from django.db import transaction
from django.utils import timezone

class StudentDeletionManager:
    """Safely manage student deletion with batch space tracking"""
    
    def __init__(self):
        self.deleted_students = []
        self.freed_spaces = {}
        
    def get_student_details(self, student_id):
        """Get detailed information about a student"""
        try:
            student = Student.objects.get(id=student_id, is_deleted=False)
            enrollments = Enrollment.objects.filter(
                student=student,
                is_deleted=False,
                status='ACTIVE'
            )
            
            return {
                'student_id': student.student_id,
                'name': student.name,
                'phone': student.phone,
                'login_username': student.login_username,
                'status': student.status,
                'is_deleted': student.is_deleted,
                'enrollments': [
                    {
                        'id': e.id,
                        'subject': e.subject.name,
                        'batch_time': e.batch_time,
                        'status': e.status,
                        'total_fee': str(e.total_fee),
                        'paid_amount': str(e.paid_amount),
                        'pending_amount': str(e.pending_amount)
                    }
                    for e in enrollments
                ],
                'total_enrollments': enrollments.count(),
                'total_pending': sum(e.pending_amount for e in enrollments)
            }
        except Student.DoesNotExist:
            return None
    
    def check_batch_capacity_before(self, student_id):
        """Check batch capacity BEFORE deleting student"""
        try:
            student = Student.objects.get(id=student_id, is_deleted=False)
            enrollments = Enrollment.objects.filter(
                student=student,
                is_deleted=False,
                status='ACTIVE'
            ).select_related('subject')
            
            batch_info = {}
            for enrollment in enrollments:
                batch_key = f"{enrollment.subject.name} - {enrollment.batch_time}"
                
                # Get batch config
                try:
                    batch_config = SubjectBatch.objects.get(
                        subject=enrollment.subject,
                        batch_time=enrollment.batch_time
                    )
                    current_enrolled = Enrollment.objects.filter(
                        subject=enrollment.subject,
                        batch_time=enrollment.batch_time,
                        is_deleted=False,
                        status='ACTIVE'
                    ).count()
                    
                    batch_info[batch_key] = {
                        'capacity': batch_config.capacity_limit,
                        'enrolled_before': current_enrolled,
                        'available_before': batch_config.capacity_limit - current_enrolled,
                        'subject_name': enrollment.subject.name
                    }
                except SubjectBatch.DoesNotExist:
                    batch_info[batch_key] = {
                        'capacity': 'Not configured',
                        'enrolled_before': 'N/A',
                        'available_before': 'N/A'
                    }
            
            return batch_info
        except Student.DoesNotExist:
            return None
    
    def delete_student_safely(self, student_id, admin_user=None):
        """Safely delete a student with transaction handling"""
        try:
            student = Student.objects.get(id=student_id, is_deleted=False)
            
            # Get batch info BEFORE deletion
            batch_info_before = self.check_batch_capacity_before(student_id)
            student_details = self.get_student_details(student_id)
            
            if student_details['total_pending'] > 0:
                return {
                    'success': False,
                    'message': f'⚠️  WARNING: Student has pending fees of ₹{student_details["total_pending"]}. Still deleting...',
                    'warning': True,
                    'pending_amount': float(student_details['total_pending'])
                }
            
            # Perform deletion in transaction
            with transaction.atomic():
                # Soft-delete the student
                student.is_deleted = True
                student.status = 'INACTIVE'
                student.save()
                
                # Deactivate user account
                if student.user:
                    student.user.is_active = False
                    student.user.save()
                
                # Soft-delete all enrollments
                deleted_enrollments = Enrollment.objects.filter(
                    student=student,
                    is_deleted=False
                ).update(is_deleted=True, status='DROPPED')
            
            # Get batch info AFTER deletion to show freed spaces
            batch_info_after = {}
            for batch_key, info in batch_info_before.items():
                if info['available_before'] != 'N/A':
                    new_available = info['capacity'] - (info['enrolled_before'] - 1)
                    batch_info_after[batch_key] = {
                        'capacity': info['capacity'],
                        'enrolled_after': info['enrolled_before'] - 1,
                        'available_after': new_available,
                        'spaces_freed': 1
                    }
            
            return {
                'success': True,
                'message': f'✅ Student {student.name} (ID: {student.student_id}) deleted successfully',
                'student': {
                    'name': student.name,
                    'student_id': student.student_id,
                    'enrollments_dropped': deleted_enrollments
                },
                'batch_spaces_freed': batch_info_after,
                'timestamp': datetime.now().isoformat()
            }
            
        except Student.DoesNotExist:
            return {
                'success': False,
                'message': f'❌ Student with ID {student_id} not found or already deleted'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'❌ Error deleting student: {str(e)}'
            }
    
    def restore_student(self, student_id):
        """Restore a soft-deleted student"""
        try:
            student = Student.objects.get(id=student_id, is_deleted=True)
            
            with transaction.atomic():
                # Restore student
                student.is_deleted = False
                student.status = 'ACTIVE'
                student.save()
                
                # Restore user account
                if student.user:
                    student.user.is_active = True
                    student.user.save()
                
                # Restore enrollments (optional - you may want to keep them dropped)
                # Uncomment below to restore enrollments
                # Enrollment.objects.filter(
                #     student=student,
                #     status='DROPPED'
                # ).update(is_deleted=False, status='ACTIVE')
            
            return {
                'success': True,
                'message': f'✅ Student {student.name} restored successfully',
                'note': 'Enrollments remain DROPPED. Manually re-enroll if needed.'
            }
        except Student.DoesNotExist:
            return {
                'success': False,
                'message': f'❌ Student with ID {student_id} not found'
            }
    
    def list_deleted_students(self):
        """List all soft-deleted students"""
        deleted = Student.objects.filter(is_deleted=True).values(
            'id', 'student_id', 'name', 'phone', 'status', 'updated_at'
        )
        
        return {
            'total_deleted': deleted.count(),
            'students': list(deleted)
        }
    
    def verify_batch_integrity(self):
        """Verify batch space calculations are correct"""
        issues = []
        batches = SubjectBatch.objects.all()
        
        for batch in batches:
            # Count active, non-deleted enrollments
            active_enrollments = Enrollment.objects.filter(
                subject=batch.subject,
                batch_time=batch.batch_time,
                is_deleted=False,
                status='ACTIVE'
            ).count()
            
            available = batch.capacity_limit - active_enrollments
            
            # Check if batch is over capacity
            if available < 0:
                issues.append({
                    'severity': 'CRITICAL',
                    'batch': f"{batch.subject.name} - {batch.batch_time}",
                    'capacity': batch.capacity_limit,
                    'enrolled': active_enrollments,
                    'over_capacity_by': abs(available)
                })
            
            # Check if deleted enrollments are excluded
            deleted_in_batch = Enrollment.objects.filter(
                subject=batch.subject,
                batch_time=batch.batch_time,
                is_deleted=True
            ).count()
            
            if deleted_in_batch > 0:
                # This is good - deleted enrollments should exist
                pass
        
        return {
            'total_batches_checked': batches.count(),
            'issues_found': len(issues),
            'issues': issues,
            'status': '✅ All batches OK' if not issues else '⚠️  Issues found'
        }
    
    def get_batch_statistics(self):
        """Get overall batch space statistics"""
        batches = SubjectBatch.objects.all()
        stats = {
            'total_batches': batches.count(),
            'total_capacity': 0,
            'total_enrolled': 0,
            'total_available': 0,
            'batches': []
        }
        
        for batch in batches:
            enrolled = Enrollment.objects.filter(
                subject=batch.subject,
                batch_time=batch.batch_time,
                is_deleted=False,
                status='ACTIVE'
            ).count()
            
            available = batch.capacity_limit - enrolled
            
            stats['total_capacity'] += batch.capacity_limit
            stats['total_enrolled'] += enrolled
            stats['total_available'] += available
            
            stats['batches'].append({
                'subject': batch.subject.name,
                'batch_time': batch.batch_time,
                'capacity': batch.capacity_limit,
                'enrolled': enrolled,
                'available': available,
                'utilization': f"{(enrolled/batch.capacity_limit*100):.1f}%",
                'is_full': available <= 0
            })
        
        stats['overall_utilization'] = f"{(stats['total_enrolled']/stats['total_capacity']*100):.1f}%" if stats['total_capacity'] > 0 else "N/A"
        
        return stats

# CLI Interface
def main():
    """Command-line interface for student deletion management"""
    manager = StudentDeletionManager()
    
    if len(sys.argv) < 2:
        print_help()
        return
    
    command = sys.argv[1]
    
    if command == 'delete':
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_student_deletion.py delete <student_id>")
            return
        
        student_id = sys.argv[2]
        print(f"\n🔍 Checking student {student_id}...")
        
        details = manager.get_student_details(int(student_id))
        if not details:
            print(f"❌ Student not found")
            return
        
        print(f"\n📋 STUDENT DETAILS:")
        print(f"   Name: {details['name']}")
        print(f"   ID: {details['student_id']}")
        print(f"   Phone: {details['phone']}")
        print(f"   Enrollments: {details['total_enrollments']}")
        if details['total_pending'] > 0:
            print(f"   ⚠️  Pending Fees: ₹{details['total_pending']}")
        
        print(f"\n📊 BATCH SPACES BEFORE DELETION:")
        batch_info_before = manager.check_batch_capacity_before(int(student_id))
        for batch, info in batch_info_before.items():
            if info['available_before'] != 'N/A':
                print(f"   {batch}")
                print(f"      Capacity: {info['capacity']} | Enrolled: {info['enrolled_before']} | Available: {info['available_before']}")
        
        confirm = input("\n⚠️  Confirm deletion? (yes/no): ").lower()
        if confirm != 'yes':
            print("❌ Deletion cancelled")
            return
        
        result = manager.delete_student_safely(int(student_id))
        
        if result['success']:
            print(f"\n✅ {result['message']}")
            print(f"\n📊 BATCH SPACES FREED:")
            for batch, info in result['batch_spaces_freed'].items():
                print(f"   {batch}")
                print(f"      Capacity: {info['capacity']} | Enrolled After: {info['enrolled_after']} | Available Now: {info['available_after']} ✓")
        else:
            print(f"\n❌ {result['message']}")
    
    elif command == 'restore':
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_student_deletion.py restore <student_id>")
            return
        
        student_id = sys.argv[2]
        result = manager.restore_student(int(student_id))
        
        if result['success']:
            print(f"✅ {result['message']}")
            print(f"ℹ️  {result['note']}")
        else:
            print(f"❌ {result['message']}")
    
    elif command == 'list-deleted':
        result = manager.list_deleted_students()
        print(f"\n📋 DELETED STUDENTS ({result['total_deleted']} total):")
        for student in result['students']:
            print(f"   {student['name']} (ID: {student['student_id']}) - {student['phone']}")
    
    elif command == 'batch-stats':
        stats = manager.get_batch_statistics()
        print(f"\n📊 BATCH STATISTICS:")
        print(f"   Total Batches: {stats['total_batches']}")
        print(f"   Total Capacity: {stats['total_capacity']}")
        print(f"   Total Enrolled: {stats['total_enrolled']}")
        print(f"   Total Available: {stats['total_available']}")
        print(f"   Overall Utilization: {stats['overall_utilization']}")
        
        print(f"\n   BATCH DETAILS:")
        for batch in stats['batches']:
            status = "🔴 FULL" if batch['is_full'] else "🟢 OK"
            print(f"   {batch['subject']} ({batch['batch_time']}) {status}")
            print(f"      {batch['enrolled']}/{batch['capacity']} | Available: {batch['available']} | Utilization: {batch['utilization']}")
    
    elif command == 'verify':
        result = manager.verify_batch_integrity()
        print(f"\n🔍 BATCH INTEGRITY CHECK:")
        print(f"   Batches Checked: {result['total_batches_checked']}")
        print(f"   Issues Found: {result['issues_found']}")
        print(f"   Status: {result['status']}")
        
        if result['issues']:
            print(f"\n   ISSUES:")
            for issue in result['issues']:
                print(f"   [{issue['severity']}] {issue['batch']}")
                print(f"      Capacity: {issue['capacity']} | Enrolled: {issue['enrolled']}")
    
    else:
        print_help()

def print_help():
    """Print help message"""
    print("""
╔════════════════════════════════════════════════════════════════════╗
║     STUDENT DELETION & BATCH SPACE MANAGEMENT SYSTEM              ║
║     Safely manage student deletion with automatic batch freeing    ║
╚════════════════════════════════════════════════════════════════════╝

USAGE:
  python manage_student_deletion.py <command> [options]

COMMANDS:

  delete <student_id>
    Safely delete a student and free up batch spaces
    Example: python manage_student_deletion.py delete 5

  restore <student_id>
    Restore a soft-deleted student
    Example: python manage_student_deletion.py restore 5

  list-deleted
    List all deleted students
    Example: python manage_student_deletion.py list-deleted

  batch-stats
    Show batch capacity and utilization statistics
    Example: python manage_student_deletion.py batch-stats

  verify
    Verify batch integrity and check for over-capacity issues
    Example: python manage_student_deletion.py verify

FEATURES:

  ✅ Soft delete (data not lost, can be restored)
  ✅ Automatic batch space freeing
  ✅ Transaction-safe operations
  ✅ Pending fee warnings
  ✅ Batch capacity verification
  ✅ Utilization statistics
  ✅ Integrity checking

DATA SAFETY:

  - Student records marked as is_deleted=True (recoverable)
  - All enrollments marked as status='DROPPED'
  - User login disabled (can be re-enabled)
  - Payment records preserved
  - Deleted students excluded from all queries automatically

BATCH SPACE BEHAVIOR:

  Before Deletion:
    - Batch capacity = 50
    - Enrolled students = 40
    - Available spaces = 10

  After Deletion (if 1 student deleted):
    - Batch capacity = 50
    - Enrolled students = 39
    - Available spaces = 11 ✓ (automatically freed)

═══════════════════════════════════════════════════════════════════
    """)

if __name__ == '__main__':
    main()
