"""
Custom exception handler for standardized error responses.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses.
    """
    # EMERGENCY LOGGING
    try:
        with open('emergency_error.log', 'a') as f:
            import traceback
            from datetime import datetime
            f.write(f"\n--- ERROR at {datetime.now()} ---\n")
            f.write(f"Exception: {str(exc)}\n")
            f.write(f"View: {context.get('view').__class__.__name__ if context.get('view') else 'None'}\n")
            f.write(traceback.format_exc())
            f.write("-" * 20 + "\n")
    except:
        pass

    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Standardize error response format
        custom_response_data = {
            'success': False,
            'error': {
                'message': str(exc),
                'code': response.status_code,
                'details': response.data if isinstance(response.data, dict) else {'detail': response.data}
            }
        }
        response.data = custom_response_data
        
        # Log the error LOUDLY
        error_msg = f"API Error: {exc} | Status: {response.status_code} | View: {context.get('view').__class__.__name__ if context.get('view') else 'None'}"
        print(f"\n!!! {error_msg}")
        print(f"!!! Response Data: {response.data}\n")
        
        # Log to file too
        try:
            with open('emergency_error.log', 'a') as f:
                import json
                f.write(f"\nResponse Data being sent: {json.dumps(response.data if isinstance(response.data, (dict, list)) else str(response.data))}\n")
        except:
            pass
            
        logger.error(error_msg)
    else:
        # Handle unexpected errors
        logger.exception(f"Unhandled exception: {exc}")
        response = Response(
            {
                'success': False,
                'error': {
                    'message': 'An unexpected error occurred.',
                    'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'details': {'detail': str(exc)}
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response


class ValidationError(Exception):
    """Custom validation error exception."""
    pass


class PermissionDenied(Exception):
    """Custom permission denied exception."""
    pass
