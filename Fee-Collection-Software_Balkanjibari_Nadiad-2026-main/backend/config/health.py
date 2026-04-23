import time
from django.http import JsonResponse
from django.db import connection

# Store the start time to calculate uptime
START_TIME = time.time()

def health_check(request):
    """
    Lightweight health check endpoint to keep the service active.
    Returns status and uptime information.
    """
    return JsonResponse({
        "status": "ok",
        "service": "balkanji-fee-system",
        "uptime_seconds": int(time.time() - START_TIME)
    })

def db_health_check(request):
    """Checks database connectivity and schema sync status."""
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            # Check for User table and a few new columns
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            columns = [row[0] for row in cursor.fetchall()]
            
            required_new_fields = ['can_view_dashboard', 'is_two_factor_enabled']
            missing = [f for f in required_new_fields if f not in columns]
            
            return JsonResponse({
                "status": "ok" if not missing else "out_of_sync",
                "database": "connected",
                "db_host": connection.settings_dict.get('HOST'),
                "schema_synced": not missing,
                "missing_columns": missing,
                "total_columns": len(columns)
            })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "database": "disconnected",
            "message": str(e)
        }, status=503)
