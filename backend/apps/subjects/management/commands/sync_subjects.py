from django.core.management.base import BaseCommand
from apps.subjects.models import Subject, FeeStructure
from django.utils import timezone
from decimal import Decimal

class Command(BaseCommand):
    help = 'Syncs the database with the official 23 Summer Camp subjects and cleans up extras.'

    def handle(self, *args, **options):
        # 23 Official Subjects with Fees
        official_subjects = [
            {"name": "Music", "fee": 500, "category": "MUSIC", "age": "10 to 16"},
            {"name": "Tabla", "fee": 500, "category": "MUSIC", "age": "10 to 16"},
            {"name": "Drum Class", "fee": 500, "category": "MUSIC", "age": "12 to 16"},
            {"name": "Keyboard (Casio)", "fee": 500, "category": "MUSIC", "age": "10 to 16"},
            {"name": "YouTube Training", "fee": 500, "category": "COMPUTER", "age": "10 to 16"},
            {"name": "Spoken English", "fee": 600, "category": "EDUCATION", "age": "12 to 16"},
            {"name": "Skating", "fee": 600, "category": "SPORTS", "age": "4 to 16"},
            {"name": "Badminton", "fee": 1000, "category": "SPORTS", "age": "12 to 16"},
            {"name": "Table Tennis", "fee": 600, "category": "SPORTS", "age": "10 to 16"},
            {"name": "Karate", "fee": 500, "category": "SPORTS", "age": "10 to 16"},
            {"name": "Western Dance", "fee": 700, "category": "DANCE", "age": "10 to 16"},
            {"name": "Yogasan", "fee": 300, "category": "SPORTS", "age": "5 to 15"},
            {"name": "Mehendi", "fee": 500, "category": "ART", "age": "10 to 16"},
            {"name": "Pencil Sketch", "fee": 600, "category": "ART", "age": "7 to 16"},
            {"name": "Calligraphy", "fee": 400, "category": "ART", "age": "9 to 16"},
            {"name": "Guitar", "fee": 500, "category": "MUSIC", "age": "9 to 16"},
            {"name": "Bharat Natyam", "fee": 500, "category": "DANCE", "age": "10 to 16"},
            {"name": "Abacus and Brain Development", "fee": 700, "category": "EDUCATION", "age": "7 to 16"},
            {"name": "Vedic Maths", "fee": 500, "category": "EDUCATION", "age": "9 to 16"},
            {"name": "Kathak Dance", "fee": 500, "category": "DANCE", "age": "6 to 16"},
            {"name": "Zumba", "fee": 500, "category": "DANCE", "age": "6 to 16"},
            {"name": "Karaoke", "fee": 500, "category": "MUSIC", "age": "10 to 16"},
            {"name": "Mind Power Mastery", "fee": 500, "category": "EDUCATION", "age": "14 to 17"},
        ]

        official_names = [s["name"] for s in official_subjects]
        now = timezone.now().date()

        self.stdout.write(self.style.SUCCESS('Starting Subject Synchronization...'))

        # 1. Update/Create Official Subjects
        for sub_data in official_subjects:
            subject, created = Subject.objects.update_or_create(
                name=sub_data["name"],
                defaults={
                    "category": sub_data["category"],
                    "age_limit": sub_data.get("age", ""),
                    "is_active": True,
                    "is_deleted": False,
                    "max_seats": 50,
                    "activity_type": "SUMMER_CAMP"
                }
            )
            
            # Upsert Fee Structure
            fee_structure, f_created = FeeStructure.objects.update_or_create(
                subject=subject,
                duration="1_MONTH",
                is_active=True,
                defaults={
                    "fee_amount": Decimal(sub_data["fee"]),
                    "effective_from": now
                }
            )

            status = "Created" if created else "Updated"
            self.stdout.write(f"Subject '{subject.name}': {status} with fee Rs.{sub_data['fee']}")

        # 2. Deactivate/Soft-delete extras
        deleted_count = Subject.objects.exclude(name__in=official_names).update(
            is_active=False,
            is_deleted=True
        )

        self.stdout.write(self.style.SUCCESS(f'Successfully synced 23 subjects. Deactivated {deleted_count} extra subjects.'))
