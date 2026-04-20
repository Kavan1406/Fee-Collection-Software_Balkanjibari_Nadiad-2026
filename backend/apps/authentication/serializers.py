"""
Serializers for authentication endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken as JWT_RefreshToken
from .models import User, RefreshToken
from datetime import timedelta
from django.utils import timezone


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    is_2fa_enabled = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 
                  'role', 'phone_number', 'address', 'area', 'is_active', 
                  'can_view_dashboard', 'can_view_registration_requests',
                  'can_view_students', 'can_view_subjects',
                  'can_view_enrollments', 'can_view_payments',
                  'can_view_analytics', 'can_view_reports',
                  'can_view_users', 'can_view_settings',
                  'is_two_factor_enabled',
                  'notify_email', 'notify_whatsapp', 'notify_sms',
                  'is_2fa_enabled', 'photo', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_2fa_enabled', 'created_at', 'updated_at']

    def get_is_2fa_enabled(self, obj):
        from django_otp import user_has_device
        return user_has_device(obj)

    def get_photo(self, obj):
        try:
            student = getattr(obj, 'student_profile', None)
            if not student or not student.photo:
                return None
            
            # Use the built-in .url property which is handled by CloudinaryField
            if hasattr(student.photo, 'url'):
                url = student.photo.url
                # Suppress default logo/avatar
                if 'logo.jpeg' in url or 'avatar' in url:
                    return None
                return url
            
            # Fallback for string/public_id values
            photo_str = str(student.photo)
            if not photo_str:
                return None
            if photo_str.startswith('http') or photo_str.startswith('data:'):
                return photo_str
            
            # Clean up the path if it's already a Cloudinary path
            clean_path = photo_str.replace('https://res.cloudinary.com/dvkfuevyw/image/upload/', '')
            return f"https://res.cloudinary.com/dvkfuevyw/image/upload/{clean_path}"
        except:
            return None


class LoginSerializer(serializers.Serializer):
    """Serializer for login endpoint."""
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username_or_email = data.get('username')
        password = data.get('password')
        
        if not username_or_email or not password:
            raise serializers.ValidationError('Must include username and password.')
        
        request = self.context.get('request')
        user = None
        
        # Try standard Django authentication first (most efficient)
        try:
            user = authenticate(request=request, username=username_or_email, password=password)
            if user:
                print(f"[DEBUG] Login successful via standard authentication for {user.username}")
        except Exception as e:
            print(f"[DEBUG] Standard auth error: {e}")
            user = None
        
        # Fallback: Try email authentication if username failed
        if not user:
            from .models import User
            try:
                # Single query with select_related to avoid N+1 on serializer
                user = User.objects.select_related('student_profile').get(
                    email__iexact=username_or_email
                )
                # Verify password manually
                if user.check_password(password):
                    print(f"[DEBUG] Login successful via email authentication for {user.username}")
                else:
                    print(f"[DEBUG] Password mismatch for email {username_or_email}")
                    user = None
            except User.DoesNotExist:
                print(f"[DEBUG] User not found with email {username_or_email}")
                user = None
            except Exception as e:
                print(f"[DEBUG] Email auth error: {e}")
                user = None

        if user:
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            data['user'] = user
        else:
            raise serializers.ValidationError('Invalid username or password.')
        
        return data


class TokenSerializer(serializers.Serializer):
    """Serializer for token response."""
    
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer for token refresh endpoint."""
    
    refresh = serializers.CharField()
    
    def validate(self, data):
        refresh_token = data.get('refresh')
        
        # Check if token is blacklisted
        try:
            token_obj = RefreshToken.objects.get(token=refresh_token)
            if token_obj.is_blacklisted:
                raise serializers.ValidationError('Token has been blacklisted.')
            if token_obj.is_expired:
                raise serializers.ValidationError('Token has expired.')
        except RefreshToken.DoesNotExist:
            # Token not in our database, validate with JWT library
            pass
        
        return data


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout endpoint."""
    
    refresh = serializers.CharField()


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change endpoint."""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    
    def validate_new_password(self, value):
        # Add password validation
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        return value


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for user profile update."""
    
    class Meta:
        model = User
        fields = ['full_name', 'phone_number', 'address', 'area', 'email', 'username',
                  'notify_email', 'notify_whatsapp', 'notify_sms']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/managing users by admin."""
    
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'password',
                  'role', 'phone_number', 'address', 'area', 'is_active', 
                  'can_view_dashboard', 'can_view_registration_requests',
                  'can_view_students', 'can_view_subjects',
                  'can_view_enrollments', 'can_view_payments',
                  'can_view_analytics', 'can_view_reports',
                  'can_view_users', 'can_view_settings',
                  'is_two_factor_enabled']
        
    def create(self, validated_data):
        password = validated_data.pop('password', 'Pass123!@#')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
