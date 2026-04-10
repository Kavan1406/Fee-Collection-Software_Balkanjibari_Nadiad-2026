import os
import django
from decimal import Decimal

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.subjects.models import Subject, FeeStructure
from django.utils import timezone

def seed_subjects():
    print("Seeding 23 Summer Camp subjects...")
    
    subjects_data = [
        ("Music", "Basic knowledge of Sur, Taal, and Classical Raag.", "MUSIC", "9:00 AM – 10:00 AM", 500, "10-16"),
        ("Tabla", "Training on various Taals (Trital, Kaherwa, Dadra, etc.).", "MUSIC", "Mon-Fri: 5:00 PM – 6:00 PM / Sat-Sun: 5:00 PM – 6:00 PM", 500, "10-16"),
        ("Drum Class", "Traditional and Western drum playing techniques.", "MUSIC", "6:00 PM – 7:00 PM", 500, "12-16"),
        ("Keyboard (Casio)", "Primary knowledge of playing Casio in Western style.", "MUSIC", "6:00 PM – 7:00 PM", 500, "10-16"),
        ("YouTube", "Training on how to become a YouTuber.", "EDUCATION", "9:00 AM – 10:00 AM", 500, "10-16"),
        ("Spoken English", "General knowledge and primary training in speaking English.", "EDUCATION", "7:00 PM – 8:00 PM", 600, "12-16"),
        ("Skating", "Forward speed, reverse speed, and figure skating. (Bring own skates).", "SPORTS", "7:00 AM–8:00 AM OR 6:00 PM–8:00 PM", 600, "4-16"),
        ("Badminton", "Basic skills and rules of the game.", "SPORTS", "6:00 PM – 7:00 PM", 1000, "12-16"),
        ("Table Tennis", "Theoretical and practical knowledge of the game.", "SPORTS", "7:00 AM–8:00 AM OR 6:00 PM–7:00 PM", 600, "10-16"),
        ("Karate", "Primary knowledge of Karate.", "SPORTS", "5:30 PM – 7:00 PM", 500, "10-16"),
        ("Western Dance", "Bollywood, Salsa, Contemporary, and Hip-Hop steps.", "DANCE", "10:00 AM – 11:00 AM", 700, "10-16"),
        ("Yogasan", "Training in various Yoga poses by experts.", "SPORTS", "7:00 AM – 8:00 AM", 300, "5-15"),
        ("Mehendi", "Traditional, Arabic, and Tattoo style Mehendi designs.", "ART", "5:00 PM–6:00 PM OR 6:00 PM–7:00 PM", 500, "10-16"),
        ("Pencil Sketch", "Drawing, pencil work, sketch work, and geometrical work.", "ART", "5:00 PM–6:00 PM OR 6:00 PM–7:00 PM", 600, "7-16"),
        ("Calligraphy", "(15-day course: May 1–15) Focus on strokes and card making.", "ART", "10:00 AM – 11:00 AM", 400, "9-16"),
        ("Guitar", "Training for playing acoustic guitar.", "MUSIC", "8:00 AM – 9:00 AM", 500, "9-16"),
        ("Bharat Natyam", "History, Mudras, and basic steps of classical dance.", "DANCE", "11:00 AM – 12:00 PM", 500, "10-16"),
        ("Abacus & Brain Dev.", "Fast mental math techniques for quick calculations.", "EDUCATION", "11:00 AM – 12:00 PM", 700, "7-16"),
        ("Vedic Maths", "Short methods for fast calculation (useful for JEE, CAT, GPSC).", "EDUCATION", "5:00 PM – 6:00 PM", 500, "9-16"),
        ("Kathak Dance", "Classical dance basics: Taal, Chakkar, and expressions.", "DANCE", "5:00 PM – 6:00 PM", 500, "6-16"),
        ("Zumba", "A combination of dance and exercise.", "DANCE", "6:00 PM – 7:00 PM", 500, "6-16"),
        ("Karaoke", "Singing along with music on mobile or laptop.", "MUSIC", "10:00 AM – 11:00 AM", 500, "10-16"),
        ("Mind Power", "Focus, memory, and confidence building for better results.", "OTHER", "8:00 AM – 9:00 AM", 500, "14-17"),
    ]

    effective_date = timezone.now().date()

    for name, desc, cat, timing, fee, age_limit in subjects_data:
        subject, created = Subject.objects.update_or_create(
            name=name,
            defaults={
                'description': f"{desc} (Age Eligibility: {age_limit})",
                'category': cat,
                'timing_schedule': timing,
                'activity_type': 'SUMMER_CAMP',
                'max_seats': 50,  # Defaulting to 50
                'is_active': True,
                'is_deleted': False,
            }
        )
        
        # Create fee structure
        FeeStructure.objects.update_or_create(
            subject=subject,
            is_active=True,
            defaults={
                'fee_amount': Decimal(fee),
                'duration': '1_MONTH',
                'effective_from': effective_date,
            }
        )
        
        action = "Created" if created else "Updated"
        print(f"✓ {action} {name}")

    print("\nSeeding Complete!")

if __name__ == "__main__":
    seed_subjects()
