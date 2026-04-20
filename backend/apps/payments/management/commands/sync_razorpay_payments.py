"""
Django management command to sync payments from Razorpay.

Usage:
    python manage.py sync_razorpay_payments
    python manage.py sync_razorpay_payments --limit=50
    python manage.py sync_razorpay_payments --no-confirm

Run this periodically (e.g., every 30 minutes via cron/APScheduler)
to auto-confirm payments that succeeded in Razorpay but failed in verification.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from django.utils import timezone
import logging

try:
    import razorpay
except ImportError:
    razorpay = None

import hashlib
import hmac

from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from decimal import Decimal

logger = logging.getLogger(__name__)

RAZORPAY_KEY_ID = getattr(settings, 'RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = getattr(settings, 'RAZORPAY_KEY_SECRET', '')


class Command(BaseCommand):
    help = 'Sync completed payments from Razorpay and auto-confirm pending payments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Number of recent Razorpay payments to check (default: 100, max: 500)'
        )
        parser.add_argument(
            '--no-confirm',
            action='store_true',
            help='Dry run: only show what would be confirmed, do not actually confirm'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed logging'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        limit = options['limit']
        dry_run = options['no_confirm']
        verbose = options['verbose']

        if verbose:
            logging.basicConfig(level=logging.DEBUG)

        # Validate Razorpay setup
        if not razorpay:
            raise CommandError('razorpay package not installed')

        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or not RAZORPAY_KEY_ID.startswith('rzp_'):
            raise CommandError('Razorpay credentials not configured in Django settings')

        try:
            razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        except Exception as e:
            raise CommandError(f'Failed to initialize Razorpay client: {e}')

        # Clamp limit between 10 and 500
        limit = min(max(limit, 10), 500)

        self.stdout.write(self.style.SUCCESS(f'🔄 Starting Razorpay sync (limit={limit}, dry_run={dry_run})'))

        try:
            # Fetch recent payments from Razorpay
            self.stdout.write('📥 Fetching payments from Razorpay...')
            razorpay_payments = razorpay_client.payment.all({'skip': 0, 'count': limit})
            razorpay_items = razorpay_payments.get('items', [])

            self.stdout.write(self.style.SUCCESS(f'   ✓ Fetched {len(razorpay_items)} payments'))

            # Get all CREATED (pending) payments from database
            pending_payments = {
                p.razorpay_order_id: p for p in 
                Payment.objects.filter(status='CREATED').select_related('enrollment')
            }

            self.stdout.write(self.style.SUCCESS(f'   ✓ Found {len(pending_payments)} pending payments in database'))

            # Track results
            matched = 0
            confirmed = 0
            failed = 0
            errors = []

            # Process each Razorpay payment
            for rzp_payment in razorpay_items:
                rzp_order_id = rzp_payment.get('order_id')
                rzp_payment_id = rzp_payment.get('id')
                rzp_status = rzp_payment.get('status')
                rzp_amount = rzp_payment.get('amount', 0) / 100  # Convert from paise

                # Only process captured/authorized payments
                if rzp_status not in ['captured', 'authorized']:
                    continue

                # Try to match with pending payment
                if rzp_order_id not in pending_payments:
                    continue

                matched += 1
                payment = pending_payments[rzp_order_id]

                try:
                    if dry_run:
                        self.stdout.write(f'   [DRY RUN] Would confirm: {rzp_payment_id} for order {rzp_order_id}')
                    else:
                        # Update payment record
                        payment.razorpay_payment_id = rzp_payment_id
                        payment.razorpay_signature = 'verified_via_scheduled_sync'
                        payment.transaction_id = rzp_payment_id
                        payment.status = 'SUCCESS'
                        payment.notes = f'{payment.notes} | Auto-confirmed via scheduled sync at {timezone.now().isoformat()}'
                        payment.save()

                        # Update enrollment amounts
                        enrollment = payment.enrollment
                        enrollment.paid_amount += Decimal(str(rzp_amount))
                        enrollment.pending_amount = max(
                            Decimal('0'),
                            Decimal(str(enrollment.total_fee)) - enrollment.paid_amount
                        )
                        enrollment.save()

                        confirmed += 1
                        self.stdout.write(self.style.SUCCESS(f'   ✓ Confirmed: {rzp_payment_id}'))

                        # Send confirmation email
                        try:
                            from apps.students.registration_views import _send_registration_email
                            import base64

                            payment_subjects = [{
                                'subject': enrollment.subject.name,
                                'batch_time': enrollment.batch_time,
                                'fee': float(payment.amount)
                            }]

                            token = base64.urlsafe_b64encode(
                                f"{enrollment.student.student_id}:PAY_{payment.id}".encode()
                            ).decode()

                            _send_registration_email(enrollment.student, payment_subjects, token)
                            if verbose:
                                self.stdout.write(f'   📧 Email sent to {enrollment.student.email}')
                        except Exception as e:
                            logger.warning(f'Failed to send email: {e}')

                except Exception as e:
                    failed += 1
                    error_msg = f'{rzp_payment_id}: {str(e)}'
                    errors.append(error_msg)
                    self.stdout.write(self.style.ERROR(f'   ✗ Failed: {error_msg}'))

            # Print summary
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('📊 SYNC SUMMARY'))
            self.stdout.write('='*60)
            self.stdout.write(f'Total from Razorpay:  {len(razorpay_items)}')
            self.stdout.write(f'Pending in database:  {len(pending_payments)}')
            self.stdout.write(f'Matched:              {matched}')
            self.stdout.write(self.style.SUCCESS(f'Confirmed:            {confirmed}') if not dry_run else f'Would confirm:        {confirmed}')
            self.stdout.write(self.style.ERROR(f'Failed:               {failed}') if failed > 0 else f'Failed:               {failed}')
            self.stdout.write('='*60)

            if errors:
                self.stdout.write(self.style.ERROR('\n❌ ERRORS:'))
                for err in errors:
                    self.stdout.write(f'   • {err}')

            if dry_run:
                self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN MODE - No changes were made'))

            self.stdout.write(self.style.SUCCESS('\n✓ Sync completed'))

        except Exception as e:
            raise CommandError(f'Sync failed: {e}')
