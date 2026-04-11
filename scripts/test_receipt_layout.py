import os
import sys
import django
from decimal import Decimal

# Set up Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, '..', 'backend'))

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
import django
django.setup()

from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from utils.registration_receipt import generate_receipt_pdf

def test_generate_pdf():
    # 1. Find or create a test student
    student, _ = Student.objects.get_or_create(
        student_id="STU_TEST_4",
        defaults={'name': 'Test Student Four', 'phone': '9876543210', 'email': 'test4@example.com'}
    )
    
    # 2. Get some subjects
    subjects = list(Subject.objects.all()[:4])
    if len(subjects) < 4:
        print("Not enough subjects in DB to test 4-subject layout.")
        return

    # 3. Create mock enrollments for this test
    # (In a real test, we'd use a temporary DB, but here we just want to see the PDF layout)
    # We will temporarily mock the enrollments list for the student
    
    class MockEnrollment:
        def __init__(self, subject, batch, lib):
            self.subject = subject
            self.batch_time = batch
            self.include_library_fee = lib
            self.total_fee = Decimal('510.00') if lib else Decimal('500.00')

    mock_enrollments = [
        MockEnrollment(subjects[0], "6:00 PM - 7:00 PM", True),
    ]

    # Mock the student's enrollments relationship
    class MockStudent:
        def __init__(self, original):
            self.id = original.id
            self.student_id = original.student_id
            self.name = original.name
            self.phone = original.phone
            self.enrollments = self
        
        def filter(self, *args, **kwargs):
            return self
        
        def select_related(self, *args, **kwargs):
            return mock_enrollments

    mock_student = MockStudent(student)

    # 4. Generate PDF
    print("Generating test PDF with 4 subjects...")
    pdf_bytes = generate_receipt_pdf(mock_student, "order_test_12345")
    
    if pdf_bytes:
        filename = "test_4_subject_receipt.pdf"
        with open(filename, "wb") as f:
            f.write(pdf_bytes)
        print(f"Successfully generated {filename}")
        print(f"Path: {os.path.abspath(filename)}")
    else:
        print("Failed to generate PDF.")

if __name__ == "__main__":
    test_generate_pdf()
