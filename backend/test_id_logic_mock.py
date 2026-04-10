import os
import sys
import django
from unittest.mock import MagicMock
from datetime import date

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from utils.id_cards import generate_id_card_pdf

def test_id_generation_mock():
    # Setup mock student
    mock_student = MagicMock()
    mock_student.name = "John Doe"
    mock_student.student_id = "STU12345"
    mock_student.date_of_birth = date(2010, 5, 15)
    mock_student.phone = "9876543210"
    mock_student.address = "123 Test Street, Mock City"
    mock_student.blood_group = "O+"
    
    # Setup mock subject
    mock_subject = MagicMock()
    mock_subject.name = "Advanced Mocking"
    
    # Setup mock enrollment
    mock_enrollment = MagicMock()
    mock_enrollment.student = mock_student
    mock_enrollment.subject = mock_subject
    
    # Mock the Enrollment model filter for subjects_display
    with MagicMock() as mock_model:
        # We need to handle the import inside generate_id_card_pdf
        import apps.enrollments.models as models
        original_filter = models.Enrollment.objects.filter
        models.Enrollment.objects.filter = MagicMock(return_value=[mock_enrollment])
        
        try:
            print(f"Testing ID card for {mock_student.name}")
            
            # Generate Regular ID
            pdf_regular = generate_id_card_pdf(mock_enrollment, is_provisional=False)
            with open('test_id_regular_mock.pdf', 'wb') as f:
                f.write(pdf_regular)
            print("Generated test_id_regular_mock.pdf")
            
            # Generate Provisional ID
            pdf_provisional = generate_id_card_pdf(mock_enrollment, is_provisional=True)
            with open('test_id_provisional_mock.pdf', 'wb') as f:
                f.write(pdf_provisional)
            print("Generated test_id_provisional_mock.pdf")
            
            print(f"Regular: {len(pdf_regular)} bytes")
            print(f"Provisional: {len(pdf_provisional)} bytes")
            
        finally:
            models.Enrollment.objects.filter = original_filter

if __name__ == '__main__':
    test_id_generation_mock()
