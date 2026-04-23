from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Registers min_age / max_age on Subject and SubjectBatch in Django's state.
    The columns were already created via scripts/update_age_limits.sql, so
    SeparateDatabaseAndState is used to skip the DDL and avoid a duplicate-column error.
    """

    dependencies = [
        ('subjects', '0012_alter_subject_activity_type_subjectbatch'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='subject',
                    name='min_age',
                    field=models.IntegerField(default=0, help_text='Minimum age (inclusive). 0 = no lower limit.'),
                ),
                migrations.AddField(
                    model_name='subject',
                    name='max_age',
                    field=models.IntegerField(default=100, help_text='Maximum age (inclusive). 100 = no upper limit.'),
                ),
                migrations.AddField(
                    model_name='subjectbatch',
                    name='min_age',
                    field=models.IntegerField(default=0, help_text='Minimum age for this batch. 0 = no lower limit.'),
                ),
                migrations.AddField(
                    model_name='subjectbatch',
                    name='max_age',
                    field=models.IntegerField(default=100, help_text='Maximum age for this batch. 100 = no upper limit.'),
                ),
            ],
            database_operations=[],  # columns already exist from update_age_limits.sql
        ),
    ]
