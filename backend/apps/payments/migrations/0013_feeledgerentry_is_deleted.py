from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0012_alter_payment_receipt_number"),
    ]

    operations = [
        migrations.AddField(
            model_name="feeledgerentry",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="feeledgerentry",
            index=models.Index(fields=["student", "is_deleted"], name="fee_ledger_student_deleted_idx"),
        ),
    ]
