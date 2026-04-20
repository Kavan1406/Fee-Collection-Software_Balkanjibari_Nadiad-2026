"""
Middleware for diagnostic logging of API requests and errors.
"""

import json
import logging
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status

logger = logging.getLogger(__name__)

class RequestErrorLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log 400 Bad Request details for easier debugging in production.
    Specifically captures DRF validation errors.
    """
    
    def process_response(self, request, response):
        if response.status_code in [400, 403] and '/api/' in request.path:
            # Try to log the response content to see why it's a Bad Request or Forbidden
            try:
                path = request.path
                method = request.method
                user = request.user if hasattr(request, 'user') else 'ANONYMOUS'
                headers = {k: v for k, v in request.headers.items() if k.lower() in ['host', 'origin', 'referer', 'x-forwarded-for', 'authorization']}
                
                print(f"\n[DIAGNOSTIC] {response.status_code} Error at {method} {path}")
                print(f"[DIAGNOSTIC] User: {user} (Authenticated: {getattr(user, 'is_authenticated', False)}, Role: {getattr(user, 'role', 'N/A')})")
                
                # Check for ALLOWED_HOSTS mismatch hint
                from django.conf import settings
                if headers.get('Host') not in settings.ALLOWED_HOSTS and '*' not in settings.ALLOWED_HOSTS:
                    print(f"[DIAGNOSTIC] WARNING: Host '{headers.get('Host')}' not in ALLOWED_HOSTS!")
                
                try:
                    content = response.content.decode('utf-8')
                    # Truncate content for readability
                    print(f"[DIAGNOSTIC] Response Content: {content[:500]}...")
                except:
                    print(f"[DIAGNOSTIC] Response content could not be decoded.")
                
                if request.body and method != 'GET':
                    try:
                        body_data = json.loads(request.body)
                        if 'password' in body_data:
                            body_data['password'] = '********'
                        print(f"[DIAGNOSTIC] Request Body: {json.dumps(body_data)}")
                    except:
                        pass
            except Exception as e:
                print(f"[DIAGNOSTIC] Error logging response: {str(e)}")
                
        return response
