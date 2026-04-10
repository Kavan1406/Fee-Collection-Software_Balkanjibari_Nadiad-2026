import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from backend.utils.id_cards import generate_id_card_pdf
from backend.utils.receipts import generate_receipt_pdf
from backend.utils.registration_receipt import generate_receipt_pdf as gen_reg_receipt

def test_pdfs():
    # Get any enrollment and payment to test with
    enr = Enrollment.objects.filter(is_deleted=False).first()
    pay = Payment.objects.filter(status='SUCCESS').first()
    
    if not enr:
        print("No enrollment found to test ID card.")
    else:
        print(f"Testing ID Card for enrollment {enr.id}...")
        id_pdf = generate_id_card_pdf(enr)
        print(f"ID Card generated success. Size: {len(id_pdf)} bytes")
        
    if not pay:
        print("No payment found to test receipt.")
    else:
        print(f"Testing Fee Receipt for payment {pay.id}...")
        receipt_pdf = generate_receipt_pdf(pay)
        print(f"Fee Receipt generated success. Size: {len(receipt_pdf)} bytes")
        
        print(f"Testing Registration Receipt for student {pay.enrollment.student.id}...")
        reg_receipt_pdf = gen_reg_receipt(pay.enrollment.student, pay.razorpay_order_id)
        print(f"Registration Receipt generated success. Size: {len(reg_receipt_pdf)} bytes")

if __name__ == "__main__":
    test_pdfs()
