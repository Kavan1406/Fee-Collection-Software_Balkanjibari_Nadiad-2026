import os
import django
import sys
from decimal import Decimal
from datetime import date

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject, FeeStructure

def seed_subjects():
    print("--- Seeding Summer Camp 2026 Subjects ---")
    
    subjects_data = [
        {"no": 1, "name": "Music", "cat": "MUSIC", "fee": 500, "time": "9:00 AM – 10:00 AM", "age": "10 to 16", "desc": "Basic knowledge of Sur, Taal, and Classical Raag."},
        {"no": 2, "name": "Tabla", "cat": "MUSIC", "fee": 500, "time": "Mon-Fri: 5:00 PM – 6:00 PM Sat-Sun: 5:00 PM – 6:00 PM", "age": "10 to 16", "desc": "Training on various Taals (Trital, Kaherwa, Dadra, etc.)."},
        {"no": 3, "name": "Drum Class", "cat": "MUSIC", "fee": 500, "time": "6:00 PM – 7:00 PM", "age": "12 to 16", "desc": "Traditional and Western drum playing techniques."},
        {"no": 4, "name": "Keyboard (Casio)", "cat": "MUSIC", "fee": 500, "time": "6:00 PM – 7:00 PM", "age": "10 to 16", "desc": "Primary knowledge of playing Casio in Western style."},
        {"no": 5, "name": "YouTube", "cat": "COMPUTER", "fee": 500, "time": "9:00 AM – 10:00 AM", "age": "10 to 16", "desc": "Training on how to become a YouTuber."},
        {"no": 6, "name": "Spoken English", "cat": "EDUCATION", "fee": 600, "time": "7:00 PM – 8:00 PM", "age": "12 to 16", "desc": "General knowledge and primary training in speaking English."},
        {"no": 7, "name": "Skating", "cat": "SPORTS", "fee": 600, "time": "7:00 AM – 8:00 AM OR 6:00 PM – 8:00 PM", "age": "4 to 16", "desc": "Forward speed, reverse speed, and figure skating training."},
        {"no": 8, "name": "Badminton", "cat": "SPORTS", "fee": 1000, "time": "6:00 PM – 7:00 PM", "age": "10 onwards", "desc": "Training on primary rules and techniques of Badminton."},
        {"no": 9, "name": "Table Tennis", "cat": "SPORTS", "fee": 600, "time": "7:00 AM – 8:00 AM OR 6:00 PM – 7:00 PM", "age": "10 to 16", "desc": "Basic training in Table Tennis techniques."},
        {"no": 10, "name": "Karate", "cat": "SPORTS", "fee": 500, "time": "5:30 PM – 7:00 PM", "age": "6 to 16", "desc": "Training for self-defense and physical fitness."},
        {"no": 11, "name": "Western Dance", "cat": "DANCE", "fee": 700, "time": "10:00 AM – 11:00 AM", "age": "6 to 16", "desc": "Training on various Western dance styles."},
        {"no": 12, "name": "Yogasan", "cat": "SPORTS", "fee": 300, "time": "7:00 AM – 8:00 AM", "age": "8 to 16", "desc": "Primary training in Surya Namaskar and various Asanas."},
        {"no": 13, "name": "Mehendi", "cat": "ART", "fee": 500, "time": "5:00 PM – 6:00 PM OR 6:00 PM – 7:00 PM", "age": "10 to 16", "desc": "Training on different Mehendi designs (Arabic, Indian, etc.)."},
        {"no": 14, "name": "Pencil Sketch", "cat": "ART", "fee": 600, "time": "5:00 PM – 6:00 PM OR 6:00 PM – 7:00 PM", "age": "10 to 16", "desc": "Training in pencil sketching and shading techniques."},
        {"no": 15, "name": "Calligraphy", "cat": "ART", "fee": 400, "time": "10:00 AM – 11:00 AM", "age": "10 to 16", "desc": "Training in various styles of beautiful handwriting."},
        {"no": 16, "name": "Guitar", "cat": "MUSIC", "fee": 500, "time": "8:00 AM – 9:00 AM", "age": "12 to 16", "desc": "Basic knowledge of chords and playing techniques."},
        {"no": 17, "name": "Bharat Natyam", "cat": "DANCE", "fee": 500, "time": "11:00 AM – 12:00 PM", "age": "6 to 16", "desc": "Primary knowledge of Bharat Natyam Mudras and steps."},
        {"no": 18, "name": "Abacus", "cat": "EDUCATION", "fee": 700, "time": "11:00 AM – 12:00 PM", "age": "6 to 14", "desc": "Training to improve calculation speed and mental math."},
        {"no": 19, "name": "Vedic Maths", "cat": "EDUCATION", "fee": 500, "time": "5:00 PM – 6:00 PM", "age": "10 to 16", "desc": "Training in ancient Indian mathematical techniques."},
        {"no": 20, "name": "Kathak Dance", "cat": "DANCE", "fee": 500, "time": "5:00 PM – 6:00 PM", "age": "6 to 16", "desc": "Training in classical Kathak dance steps and Taals."},
        {"no": 21, "name": "Zumba", "cat": "DANCE", "fee": 500, "time": "6:00 PM – 7:00 PM", "age": "8 to 16", "desc": "Dance-based physical fitness training."},
        {"no": 22, "name": "Karaoke", "cat": "MUSIC", "fee": 500, "time": "10:00 AM – 11:00 AM", "age": "10 to 16", "desc": "Singing along with recorded music tracks."},
        {"no": 23, "name": "Mind Power", "cat": "OTHER", "fee": 500, "time": "8:00 AM – 9:00 AM", "age": "10 to 16", "desc": "Techniques for concentration and mental well-being."},
    ]

    # Clear existing summer camp subjects if any to avoid duplicates
    # Commented out to be safe, but can be used if needed
    # Subject.objects.filter(activity_type='SUMMER_CAMP').delete()

    for item in subjects_data:
        subject, created = Subject.objects.update_or_create(
            name=item["name"],
            defaults={
                "category": item["cat"],
                "activity_type": "SUMMER_CAMP",
                "default_batch_timing": item["time"],
                "age_limit": item["age"],
                "description": item["desc"],
                "is_active": True,
                "is_deleted": False
            }
        )
        
        # Create or update FeeStructure
        FeeStructure.objects.update_or_create(
            subject=subject,
            duration='1_MONTH',
            is_active=True,
            defaults={
                "fee_amount": Decimal(item["fee"]),
                "effective_from": date(2026, 5, 1)
            }
        )
        
        status = "Created" if created else "Updated"
        print(f"[{status}] {item['name']} - Rs.{item['fee']} ({item['time']})")

    print("\nTotal Subjects in Summer Camp:", Subject.objects.filter(activity_type='SUMMER_CAMP').count())

if __name__ == "__main__":
    seed_subjects()
