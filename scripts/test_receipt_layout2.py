import os
import sys
import django
from io import BytesIO

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student
from apps.subjects.models import Subject
from utils.registration_receipt import generate_receipt_pdf


def test_generate_receipt():
    student, _ = Student.objects.get_or_create(
        student_id="STU_R5",
        defaults={'name': 'Test Student Receipt', 'phone': '9876543210',
                  'email': 'testr@example.com'}
    )
    subjects = list(Subject.objects.all()[:3])
    if not subjects:
        print("No subjects in DB.")
        return

    # Mock enrollments
    class MockEnrollment:
        def __init__(self, subj, batch, inc_lib):
            self.subject = subj
            self.batch_time = batch
            self.include_library_fee = inc_lib
            self.total_fee = 510 if inc_lib else 500
            self.is_deleted = False

    mocks = [
        MockEnrollment(subjects[0], "6 PM - 7 PM", True),
        MockEnrollment(subjects[1], "7 PM - 8 PM", False),
        MockEnrollment(subjects[2], "5 PM - 6 PM", False),
    ]

    class MockQS(list):
        def filter(self, **kwargs): return self
        def select_related(self, *args): return self

    student_mock = type('SM', (), {
        'id': student.id,
        'student_id': student.student_id,
        'name': student.name,
        'phone': student.phone,
        'email': student.email,
        'login_username': 'stu_r5',
        'enrollment_date': None,
        'enrollments': MockQS(mocks),
    })()

    print("Generating receipt PDF...")
    pdf = generate_receipt_pdf(student_mock, "order_PREVIEW123")
    if pdf:
        fname = "test_receipt_layout.pdf"
        with open(fname, "wb") as f:
            f.write(pdf)
        print(f"Success -> {os.path.abspath(fname)}")
    else:
        print("Failed.")


if __name__ == "__main__":
    test_generate_receipt()
