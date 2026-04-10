import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.enrollments.models import Enrollment
from utils.id_cards import generate_id_card_pdf

def test_id_generation():
    # Get any enrollment
    enr = Enrollment.objects.filter(is_deleted=False).first()
    if not enr:
        print("No enrollment found to test.")
        return

    print(f"Testing ID card for {enr.student.name} (Enrollment {enr.id})")
    
    # Generate Regular ID
    pdf_regular = generate_id_card_pdf(enr, is_provisional=False)
    with open('test_id_regular.pdf', 'wb') as f:
        f.write(pdf_regular)
    print("Generated test_id_regular.pdf")
    
    # Generate Provisional ID
    pdf_provisional = generate_id_card_pdf(enr, is_provisional=True)
    with open('test_id_provisional.pdf', 'wb') as f:
        f.write(pdf_provisional)
    print("Generated test_id_provisional.pdf")
    
    print("Check the sizes: ")
    print(f"Regular: {len(pdf_regular)} bytes")
    print(f"Provisional: {len(pdf_provisional)} bytes")

if __name__ == '__main__':
    test_id_generation()
