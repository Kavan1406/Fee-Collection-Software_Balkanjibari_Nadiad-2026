"""
Seed script to populate year-round activities.
Run with: python seed_year_round_activities.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject
from decimal import Decimal
from datetime import date

def seed_year_round_activities():
    """Populate database with year-round activity courses."""
    
    year_round_courses = [
        # Education Section
        {
            'name': 'Spoken English (Basic)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Grammar basics, sentence structure, speaking practice.',
            'timing_schedule': 'Tue & Wed (6 PM - 7 PM)',
            'duration_months': 3,
            'monthly_fee': Decimal('600.00'),
        },
        {
            'name': 'Spoken English (Advance)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Advance grammar, reading, writing, and speaking.',
            'timing_schedule': 'Tue & Wed (6 PM - 7 PM)',
            'duration_months': 6,
            'monthly_fee': Decimal('1000.00'),
        },
        {
            'name': 'Vedic Maths (Level 1)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Tables up to 200, addition/subtraction, 2-4 digit multiplication.',
            'timing_schedule': 'Sunday (4 PM - 6 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('600.00'),
        },
        {
            'name': 'Vedic Maths (Level 2)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Multi-digit multiplication, division, squares, cubes.',
            'timing_schedule': 'Tue & Wed (6 PM - 7 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('1000.00'),
        },
        {
            'name': 'Abacus (Junior)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus Junior level (5-6 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 3,
            'monthly_fee': Decimal('950.00'),
        },
        {
            'name': 'Abacus (Pre)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus Pre level (7-8 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 3,
            'monthly_fee': Decimal('950.00'),
        },
        {
            'name': 'Abacus (F1)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus F1 level (9-10 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('950.00'),
        },
        {
            'name': 'Abacus (Elementary)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus Elementary level (9-10 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('950.00'),
        },
        {
            'name': 'Abacus (Higher)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus Higher level (9-10 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('950.00'),
        },
        {
            'name': 'Abacus (Advance)',
            'category': 'EDUCATION',
            'activity_type': 'YEAR_ROUND',
            'description': 'Abacus Advance level (9-10 years). Kit compulsory for ₹950.',
            'timing_schedule': 'Wed & Thu (4 PM - 6 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('950.00'),
        },
        
        # Music Section
        {
            'name': 'Light Music (Singing/Inst.)',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'Basic ornaments, Dhun, Shlok, Bhajan, Prayer.',
            'timing_schedule': 'Mon & Fri (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Classical Music (Singing/Inst.)',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'Syllabus-based teaching as per Sangeet Samiti exams.',
            'timing_schedule': 'Mon & Fri (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Karaoke (Singing)',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'Advance level features of Karaoke singing.',
            'timing_schedule': 'Wednesday (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('2000.00'),
        },
        {
            'name': 'Tabla',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'Syllabus-based teaching for exams.',
            'timing_schedule': 'Sat & Sun (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('450.00'),
        },
        {
            'name': 'Drum',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'From basic to advance levels.',
            'timing_schedule': 'Mon & Fri (6 PM - 7 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Keyboard',
            'category': 'MUSIC',
            'activity_type': 'YEAR_ROUND',
            'description': 'From basic to advance levels.',
            'timing_schedule': 'Mon & Fri (6 PM - 7 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        
        # Dance Section
        {
            'name': 'Kathak Dance',
            'category': 'DANCE',
            'activity_type': 'YEAR_ROUND',
            'description': 'Visharad course levels: Toda, Tukda, Tihai, Paran, etc.',
            'timing_schedule': 'Wed & Fri (5:30 PM - 6:30 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Western Dance',
            'category': 'DANCE',
            'activity_type': 'YEAR_ROUND',
            'description': 'Basic dance, Hip-hop, Bollywood, Contemporary.',
            'timing_schedule': 'Saturday (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        
        # Sports Section
        {
            'name': 'Table Tennis',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Grip, Serve, Looping, Footwork; Preparing for competitions.',
            'timing_schedule': 'Mon to Fri (6-7 PM or 7-8 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Badminton',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Grip, Serve, Looping, Footwork; Training for children.',
            'timing_schedule': 'Sat & Sun (5 PM - 7 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('1000.00'),
        },
        {
            'name': 'Skating',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Basic to Advance, Reverse speed, Figure; (Collab: Nadiad Skating Asso.)',
            'timing_schedule': 'Tue to Sun (8:15 PM - 9:15 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('800.00'),
        },
        {
            'name': 'Karate',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Kata Kumite, Nunchaku, Self-defense techniques.',
            'timing_schedule': 'Mon to Wed (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('400.00'),
        },
        {
            'name': 'Karate (Girls Only)',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Self-defense for girls. (One-time fee: ₹50).',
            'timing_schedule': 'Tue & Wed (6 PM - 7 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('400.00'),
        },
        {
            'name': 'Yogasan',
            'category': 'SPORTS',
            'activity_type': 'YEAR_ROUND',
            'description': 'Various Asanas, Pranayam, and Meditation.',
            'timing_schedule': 'Sunday (5 PM - 6 PM)',
            'duration_months': None,  # Ongoing
            'monthly_fee': Decimal('500.00'),
        },
        
        # Art Section
        {
            'name': 'Mehendi',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Basic designs, shading, Arabic, Indo-Arabic styles.',
            'timing_schedule': 'Tue, Wed, Thu (6-7 PM)',
            'duration_months': 3,
            'monthly_fee': Decimal('300.00'),
        },
        {
            'name': 'Cursive Writing',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Stroke practice, small letter formation, paragraph writing, structured format writing.',
            'timing_schedule': 'Wed & Thu (6-7 PM)',
            'duration_months': 5,
            'monthly_fee': Decimal('400.00'),
        },
        {
            'name': 'Faux Calligraphy',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Basic strokes, word/sentence formation.',
            'timing_schedule': 'Wed & Thu (6-7 PM)',
            'duration_months': 2,
            'monthly_fee': Decimal('400.00'),
        },
        {
            'name': 'Brush Calligraphy',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Brush strokes, card making, layout practice.',
            'timing_schedule': 'Wed & Thu (6-7 PM)',
            'duration_months': 2,
            'monthly_fee': Decimal('500.00'),
        },
        {
            'name': 'Devnagari (Hindi) Calligraphy',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Hindi/Sanskrit alphabets and stroke practice.',
            'timing_schedule': 'Wed & Thu (6-7 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('600.00'),
        },
        {
            'name': 'Art and Craft',
            'category': 'ART',
            'activity_type': 'YEAR_ROUND',
            'description': 'Drawing, Pencil sketch, Water/Canvas/Fabric painting.',
            'timing_schedule': 'Mon & Tue (6-7 PM)',
            'duration_months': 4,
            'monthly_fee': Decimal('550.00'),
        },
    ]
    
    print("Starting to seed year-round activities...")
    created_count = 0
    updated_count = 0
    
    for course_data in year_round_courses:
        subject, created = Subject.objects.update_or_create(
            name=course_data['name'],
            defaults=course_data
        )
        
        if created:
            created_count += 1
            print(f"✓ Created: {subject.name}")
        else:
            updated_count += 1
            print(f"↻ Updated: {subject.name}")
    
    print(f"\n{'='*60}")
    print(f"Seeding complete!")
    print(f"Created: {created_count} courses")
    print(f"Updated: {updated_count} courses")
    print(f"Total: {len(year_round_courses)} year-round activities")
    print(f"{'='*60}")

if __name__ == '__main__':
    seed_year_round_activities()
