
import os
import django
import json

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.serializers import StudentRegistrationRequestSerializer
from apps.subjects.models import Subject

def test_registration():
    print("--- Testing Registration Request Logic ---")
    
    # Try to find a subject to use
    subject = Subject.objects.filter(is_deleted=False).first()
    subject_id = subject.id if subject else 1
    subject_name = subject.name if subject else "Test Subject"
    
    data = {
        "name": "Test Student Logic",
        "phone": "9998887776",
        "email": "logic_test@example.com",
        "age": 12,
        "gender": "MALE",
        "area": "Local Test Area",
        "address": "Local Test Address",
        "payment_method": "CASH",
        "subjects_data": json.dumps([
            {"subject_id": subject_id, "subject_name": subject_name, "batch_time": "7-8 AM"}
        ])
    }
    
    serializer = StudentRegistrationRequestSerializer(data=data)
    if serializer.is_valid():
        try:
            instance = serializer.save()
            print(f"SUCCESS: Registration request created with ID: {instance.id}")
            return True
        except Exception as e:
            print(f"ERROR during save: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    else:
        print(f"VALIDATION FAILED: {serializer.errors}")
        return False

if __name__ == "__main__":
    test_registration()
