from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Registers auto_close_when_full on SubjectBatch in Django's state.
    The column already exists in production DB, so database_operations is empty
    to avoid a duplicate-column error.
    """

    dependencies = [
        ('subjects', '0013_subject_min_max_age'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='subjectbatch',
                    name='auto_close_when_full',
                    field=models.BooleanField(default=False),
                ),
            ],
            database_operations=[],
        ),
    ]
