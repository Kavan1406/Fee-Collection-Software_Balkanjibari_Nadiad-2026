import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.production')
django.setup()
from apps.subjects.models import Subject
subjects = Subject.objects.all().order_by('activity_type', 'name')
lines = [f'Total subjects: {subjects.count()}']
for s in subjects:
    fee = str(s.monthly_fee) if s.monthly_fee else 'N/A'
    try:
        cf = s.current_fee
        cf_str = str(cf.amount) + '/' + str(cf.duration)
    except Exception:
        cf_str = 'none'
    lines.append(f'ID={s.id} NAME={s.name} TYPE={s.activity_type} MFEE={fee} CFEE={cf_str}')

with open('subjects_out.txt', 'w') as f:
    f.write('\n'.join(lines))
print('Written to subjects_out.txt')
