from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment, FeeLedgerEntry

@receiver(post_save, sender=Payment)
def create_ledger_entry(sender, instance, created, **kwargs):
    """
    Automatically create a FeeLedgerEntry when a Payment is marked SUCCESS.
    """
    if instance.status == 'SUCCESS' and not instance.is_deleted:
        # Check if ledger entry already exists to avoid duplicates
        if not FeeLedgerEntry.objects.filter(reference_payment=instance).exists():
            FeeLedgerEntry.objects.create(
                student=instance.enrollment.student,
                transaction_type='PAYMENT',
                amount=instance.amount,
                reference_payment=instance,
                created_by=instance.recorded_by,
                notes=f"Payment recorded: {instance.payment_id}"
            )
