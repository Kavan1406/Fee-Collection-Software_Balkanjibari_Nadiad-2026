import pyotp
import qrcode
import base64
from io import BytesIO
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken as JWT_RefreshToken
from django_otp import user_has_device, devices_for_user
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from .models import User, RefreshToken
from .serializers import UserSerializer

class Login2FAView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = [] # Disable session/CSRF for login

    @method_decorator(ratelimit(key='ip', rate='30/m', method='POST'))
    def post(self, request):
        import time
        start_time = time.time()
        from .serializers import LoginSerializer
        
        # 1. Capture username for logging if validation fails
        username = request.data.get('username')
        
        # 2. Use the robust LoginSerializer we already hardened
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            validation_time = time.time() - start_time
            # Diagnostic Logging
            errors = serializer.errors
            print(f"[DIAGNOSTIC] Login validation failed for: {username} (Took {validation_time:.2f}s)")
            # ... (rest of the error response remains same)
            return Response({
                'success': False, 
                'error': {'message': "Invalid username or password.", 'details': errors}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        user = serializer.validated_data['user']
        # PRE-FETCH: Check for TOTP devices early to avoid lazy loading delays later
        from django_otp.plugins.otp_totp.models import TOTPDevice
        has_2fa = TOTPDevice.objects.filter(user=user, confirmed=True).exists()
        
        validation_time = time.time() - start_time
        print(f"[DIAGNOSTIC] Login validation success for: {user.username} (Took {validation_time:.2f}s, 2FA_Enabled: {has_2fa})")
        
        # 3. Handle 2FA if enabled for the user
        two_fa_start = time.time()
        if user.role in ['ADMIN', 'STAFF', 'ACCOUNTANT'] and has_2fa:
            two_fa_time = time.time() - two_fa_start
            print(f"[DIAGNOSTIC] 2FA required for user: {user.username} (Check took {two_fa_time:.2f}s)")
            return Response({
                'success': True, 
                'two_factor_required': True, 
                'email': user.email, 
                'message': '2FA required.'
            }, status=status.HTTP_200_OK)
        
        # 4. Success - Generate tokens
        token_start = time.time()
        refresh = JWT_RefreshToken.for_user(user)
        from django.utils import timezone
        from datetime import timedelta
        RefreshToken.objects.create(
            user=user, 
            token=str(refresh), 
            expires_at=timezone.now() + timedelta(days=1)
        )
        token_time = time.time() - token_start
        total_time = time.time() - start_time
        print(f"[DIAGNOSTIC] Token generation success for: {user.username} (Took {token_time:.2f}s, Total {total_time:.2f}s)")
        
        response = Response({
            'success': True, 
            'two_factor_required': False, 
            'data': {
                'access': str(refresh.access_token), 
                'refresh': str(refresh), 
                'user': UserSerializer(user).data
            }
        }, status=status.HTTP_200_OK)
        response['X-API-Version'] = '3.0.1-STRICT-PERF'
        return response

class Setup2FAView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        user = request.user
        if user.role not in ['ADMIN', 'STAFF']:
            return Response({'error': 'Only Admin and Staff can use 2FA.'}, status=403)
        if user_has_device(user):
            return Response({'error': '2FA is already enabled.'}, status=400)
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()
        device = user.totpdevice_set.create(name=f"{user.username}-TOTP", confirmed=False)
        import binascii
        from pyotp import utils
        # Use config_url to get the Base32 secret for manual entry
        # Or just use the underlying key and encode it
        secret_base32 = pyotp.random_base32() # Wait, we should use the device key
        # django-otp TOTPDevice key is hex bytes
        import base64
        # The otp_totp device uses a 'key' field which is hex.
        # However, it's easier to just provide the secret from the config_url
        config_url = device.config_url
        import urllib.parse
        parsed_url = urllib.parse.urlparse(config_url)
        params = urllib.parse.parse_qs(parsed_url.query)
        secret = params.get('secret', [None])[0]

        # Properly generate QR code
        img = qrcode.make(config_url)
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        
        return Response({
            'success': True, 
            'qr_code': f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}", 
            'secret': secret
        })

class Verify2FAView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        import logging
        logger = logging.getLogger('apps.authentication')
        logger.info("Verify2FAView.post called")
        
        email = request.data.get('email')
        otp_code = request.data.get('otp_code')
        
        logger.info(f"2FA Verify Attempt: email={email}, user={request.user}, code={otp_code}")
        
        # Identify user: Prioritize authenticated user (during setup), fallback to email (during login)
        user = None
        if request.user.is_authenticated:
            user = request.user
            logger.info(f"User identified via request.user: {user.username}")
        elif email:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                # Try username as fallback just in case the frontend sent username in the email field
                user = User.objects.filter(username__iexact=email).first()
                if user:
                    logger.info(f"User identified via username fallback: {user.username}")
            else:
                logger.info(f"User identified via email: {user.username}")
        
        if not user:
            logger.warning(f"User not identified for 2FA verification. Input email: {email}")
            return Response({'success': False, 'error': f'Account not found for {email or "current user"}.'}, status=status.HTTP_404_NOT_FOUND)

        if not otp_code:
            return Response({'success': False, 'error': 'OTP code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the TOTP device - query directly to avoid confirmation filtering in helper
        device = TOTPDevice.objects.filter(user=user).first()
        if not device:
            logger.warning(f"No TOTP device found in DB for user: {user.username}")
            return Response({'success': False, 'error': f'2FA is not set up for account: {user.username}'}, status=status.HTTP_404_NOT_FOUND)
            
        logger.info(f"Found device: {device.name}, confirmed: {device.confirmed}")
            
        if device.verify_token(otp_code):
            logger.info(f"2FA Success for user: {user.username}")
            if not device.confirmed:
                device.confirmed = True
                device.save()
            
            refresh = JWT_RefreshToken.for_user(user)
            from django.utils import timezone
            from datetime import timedelta
            RefreshToken.objects.create(user=user, token=str(refresh), expires_at=timezone.now() + timedelta(days=1))
            
            return Response({
                'success': True, 
                'data': {
                    'access': str(refresh.access_token), 
                    'refresh': str(refresh), 
                    'user': UserSerializer(user).data
                }
            }, status=status.HTTP_200_OK)
            
        logger.warning(f"Invalid OTP code provided for user: {user.username}")
        # Could be time drift?
        import time
        logger.debug(f"Server time: {time.time()} ({timezone.now()})")
        return Response({'success': False, 'error': 'Invalid OTP code. Please ensure your device time is correct.'}, status=status.HTTP_401_UNAUTHORIZED)

class Disable2FAView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        user, target_id, otp = request.user, request.data.get('user_id'), request.data.get('otp_code')
        if target_id and user.is_superuser:
            target = get_object_or_404(User, id=target_id)
            TOTPDevice.objects.filter(user=target).delete()
            return Response({'success': True, 'message': f'2FA disabled for {target.username}.'})
        if not otp: return Response({'error': 'OTP block required.'}, status=400)
        device = next((d for d in devices_for_user(user) if isinstance(d, TOTPDevice)), None)
        if not device or not device.verify_token(otp): return Response({'error': 'Invalid request or OTP.'}, status=401)
        device.delete()
        return Response({'success': True, 'message': '2FA disabled.'})
