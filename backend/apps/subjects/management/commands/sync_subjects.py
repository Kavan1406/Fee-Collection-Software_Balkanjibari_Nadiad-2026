from django.core.management.base import BaseCommand
from apps.subjects.models import Subject, FeeStructure, SubjectBatch
from django.utils import timezone
from decimal import Decimal

class Command(BaseCommand):
    help = 'Syncs the database with the official Summer Camp subjects with batch-wise capacity limits.'

    def handle(self, *args, **options):
        # Official Summer Camp subjects with fees, timing, age limits, and batch-specific capacities
        official_subjects = [
            {
                "name": "Music",
                "fee": 500,
                "category": "MUSIC",
                "age": "10 to 16",
                "default_batch_timing": "9:00 AM - 10:00 AM",
                "batches": [{"time": "9:00 AM - 10:00 AM", "limit": 50}]
            },
            {
                "name": "Tabla",
                "fee": 500,
                "category": "MUSIC",
                "age": "10 to 16",
                "default_batch_timing": "5:00 PM - 6:00 PM",
                "batches": [{"time": "5:00 PM - 6:00 PM", "limit": 20}]
            },
            {
                "name": "Drum Class",
                "fee": 500,
                "category": "MUSIC",
                "age": "12 to 16",
                "default_batch_timing": "6:00 PM - 7:00 PM",
                "batches": [{"time": "6:00 PM - 7:00 PM", "limit": 20}]
            },
            {
                "name": "Keyboard (Casio)",
                "fee": 500,
                "category": "MUSIC",
                "age": "10 to 16",
                "default_batch_timing": "6:00 PM - 7:00 PM",
                "batches": [{"time": "6:00 PM - 7:00 PM", "limit": 25}]
            },
            {
                "name": "YouTube",
                "fee": 600,
                "category": "COMPUTER",
                "age": "10 to 16",
                "default_batch_timing": "9:00 AM - 10:00 AM",
                "batches": [{"time": "9:00 AM - 10:00 AM", "limit": 25}]
            },
            {
                "name": "Spoken English",
                "fee": 600,
                "category": "EDUCATION",
                "age": "12 to 16",
                "default_batch_timing": "7:00 PM - 8:00 PM",
                "batches": [{"time": "7:00 PM - 8:00 PM", "limit": 70}]
            },
            {
                "name": "Skating",
                "fee": 600,
                "category": "SPORTS",
                "age": "4 to 16",
                "default_batch_timing": "7:00 AM - 8:00 AM",
                "timing_schedule": "Batch A: 7:00 AM - 8:00 AM | Batch B: 6:00 PM - 7:00 PM | Batch C: 7:00 PM - 8:00 PM | Batch D: 8:00 PM - 9:00 PM",
                "batches": [
                    {"time": "Batch A: 7:00 AM - 8:00 AM", "limit": 80},
                    {"time": "Batch B: 6:00 PM - 7:00 PM", "limit": 80},
                    {"time": "Batch C: 7:00 PM - 8:00 PM", "limit": 80},
                    {"time": "Batch D: 8:00 PM - 9:00 PM", "limit": 80}
                ]
            },
            {
                "name": "Badminton",
                "fee": 1000,
                "category": "SPORTS",
                "age": "12 to 16",
                "default_batch_timing": "6:00 PM - 7:00 PM",
                "batches": [{"time": "6:00 PM - 7:00 PM", "limit": 15}]
            },
            {
                "name": "Table Tennis",
                "fee": 600,
                "category": "SPORTS",
                "age": "10 to 16",
                "default_batch_timing": "7:00 AM - 8:00 AM",
                "timing_schedule": "Batch A: 7:00 AM - 8:00 AM | Batch B: 6:00 PM - 7:00 PM",
                "batches": [
                    {"time": "Batch A: 7:00 AM - 8:00 AM", "limit": 25},
                    {"time": "Batch B: 6:00 PM - 7:00 PM", "limit": 25}
                ]
            },
            {
                "name": "Karate",
                "fee": 500,
                "category": "SPORTS",
                "age": "10 to 16",
                "default_batch_timing": "7:00 PM - 8:00 PM",
                "batches": [{"time": "7:00 PM - 8:00 PM", "limit": 80}]
            },
            {
                "name": "Western Dance",
                "fee": 700,
                "category": "DANCE",
                "age": "10 to 16",
                "default_batch_timing": "10:00 AM - 11:00 AM",
                "batches": [{"time": "10:00 AM - 11:00 AM", "limit": 40}]
            },
            {
                "name": "Yogasan",
                "fee": 300,
                "category": "SPORTS",
                "age": "5 to 15",
                "default_batch_timing": "7:00 AM - 8:00 AM",
                "batches": [{"time": "7:00 AM - 8:00 AM", "limit": 30}]
            },
            {
                "name": "Mehendi",
                "fee": 500,
                "category": "ART",
                "age": "10 to 16",
                "default_batch_timing": "5:00 PM - 6:00 PM",
                "timing_schedule": "Batch A: 5:00 PM - 6:00 PM | Batch B: 6:00 PM - 7:00 PM",
                "batches": [
                    {"time": "Batch A: 5:00 PM - 6:00 PM", "limit": 50},
                    {"time": "Batch B: 6:00 PM - 7:00 PM", "limit": 50}
                ]
            },
            {
                "name": "Pencil Sketch",
                "fee": 600,
                "category": "ART",
                "age": "7 to 16",
                "default_batch_timing": "5:00 PM - 6:00 PM",
                "timing_schedule": "Batch A: 5:00 PM - 6:00 PM (Ages 7 to 12) | Batch B: 6:00 PM - 7:00 PM (Ages 7 to 16)",
                "batches": [
                    {"time": "Batch A: 5:00 PM - 6:00 PM (Ages 7 to 12)", "limit": 50},
                    {"time": "Batch B: 6:00 PM - 7:00 PM (Ages 7 to 16)", "limit": 50}
                ]
            },
            {
                "name": "Calligraphy",
                "fee": 500,
                "category": "ART",
                "age": "9 to 16",
                "description": "15 days course",
                "default_batch_timing": "10:00 AM - 11:00 AM (15 to 30 May)",
                "batches": [{"time": "10:00 AM - 11:00 AM (15 to 30 May)", "limit": 50}]
            },
            {
                "name": "Guitar",
                "fee": 500,
                "category": "MUSIC",
                "age": "9 to 16",
                "default_batch_timing": "8:00 AM - 9:00 AM",
                "batches": [{"time": "8:00 AM - 9:00 AM", "limit": 25}]
            },
            {
                "name": "Bharat Natyam",
                "fee": 500,
                "category": "DANCE",
                "age": "10 to 16",
                "default_batch_timing": "11:00 AM - 12:00 PM",
                "batches": [{"time": "11:00 AM - 12:00 PM", "limit": 30}]
            },
            {
                "name": "Abacus and Brain Development",
                "fee": 700,
                "category": "EDUCATION",
                "age": "7 to 16",
                "default_batch_timing": "11:00 AM - 12:00 PM",
                "batches": [{"time": "11:00 AM - 12:00 PM", "limit": 60}]
            },
            {
                "name": "Vedic Maths",
                "fee": 500,
                "category": "EDUCATION",
                "age": "9 to 16",
                "default_batch_timing": "5:00 PM - 6:00 PM",
                "batches": [{"time": "5:00 PM - 6:00 PM", "limit": 60}]
            },
            {
                "name": "Kathak Dance",
                "fee": 500,
                "category": "DANCE",
                "age": "6 to 16",
                "default_batch_timing": "5:00 PM - 6:00 PM",
                "batches": [{"time": "5:00 PM - 6:00 PM", "limit": 25}]
            },
            {
                "name": "Zumba",
                "fee": 500,
                "category": "DANCE",
                "age": "6 to 16",
                "default_batch_timing": "6:00 PM - 7:00 PM",
                "batches": [{"time": "6:00 PM - 7:00 PM", "limit": 25}]
            },
            {
                "name": "Karaoke",
                "fee": 500,
                "category": "MUSIC",
                "age": "10 to 16",
                "default_batch_timing": "10:00 AM - 11:00 AM",
                "batches": [{"time": "10:00 AM - 11:00 AM", "limit": 15}]
            },
            {
                "name": "Mind Power Mastery",
                "fee": 500,
                "category": "EDUCATION",
                "age": "14 to 17",
                "default_batch_timing": "8:00 AM - 9:00 AM",
                "batches": [{"time": "8:00 AM - 9:00 AM", "limit": 100}]
            },
        ]

        official_names = [s["name"] for s in official_subjects]
        now = timezone.now().date()

        self.stdout.write(self.style.SUCCESS('Starting Subject Synchronization with Batch Limits...'))

        # 1. Update/Create Official Subjects
        for sub_data in official_subjects:
            defaults = {
                "category": sub_data["category"],
                "age_limit": sub_data.get("age", ""),
                "default_batch_timing": sub_data.get("default_batch_timing", "7:00 AM - 8:00 AM"),
                "timing_schedule": sub_data.get("timing_schedule", ""),
                "is_active": True,
                "is_deleted": False,
                "max_seats": sum(b["limit"] for b in sub_data.get("batches", [])) or 50,
                "activity_type": "SUMMER_CAMP"
            }

            if "description" in sub_data:
                defaults["description"] = sub_data["description"]

            subject, created = Subject.objects.update_or_create(
                name=sub_data["name"],
                defaults=defaults
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

            # Create/Update Batch Configurations
            if "batches" in sub_data:
                existing_batches = SubjectBatch.objects.filter(subject=subject)
                existing_batch_times = set(b.batch_time for b in existing_batches)
                new_batch_times = set(b["time"] for b in sub_data["batches"])
                
                # Delete batches not in new configuration
                SubjectBatch.objects.filter(
                    subject=subject,
                    batch_time__in=existing_batch_times - new_batch_times
                ).delete()
                
                # Create/Update batches with limits
                for batch_config in sub_data.get("batches", []):
                    batch, b_created = SubjectBatch.objects.update_or_create(
                        subject=subject,
                        batch_time=batch_config["time"],
                        defaults={"capacity_limit": batch_config["limit"], "is_active": True}
                    )
                    b_status = "Created" if b_created else "Updated"
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Batch '{batch_config['time']}': {b_status} with limit {batch_config['limit']}"
                        )
                    )

            status = "Created" if created else "Updated"
            total_capacity = sum(b["limit"] for b in sub_data.get("batches", []))
            self.stdout.write(
                f"Subject '{subject.name}': {status} | Batches: {len(sub_data.get('batches', []))} | Total Capacity: {total_capacity} | Fee: Rs.{sub_data['fee']}"
            )

        # 2. Deactivate/Soft-delete extras
        deleted_count = Subject.objects.exclude(name__in=official_names).update(
            is_active=False,
            is_deleted=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully synced {len(official_subjects)} subjects with batch-wise capacity limits. Deactivated {deleted_count} extra subjects.'
            )
        )
