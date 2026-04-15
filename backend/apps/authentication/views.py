"""
Authentication views with JWT token rotation and blacklisting.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken as JWT_RefreshToken
from django.contrib.auth import logout as django_logout
from datetime import timedelta
from django.utils import timezone
from django_ratelimit.decorators import ratelimit

from .models import User, RefreshToken
from .serializers import (
    LoginSerializer, 
    UserSerializer, 
    RefreshTokenSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    UserUpdateSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='30/m', method='POST')
def login_view(request):
    """
    Login endpoint with JWT token generation.
    Rate limited to 30 requests per minute per IP.
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        print(f"[DIAGNOSTIC] Login Validation Failed: {serializer.errors}")
        return Response({
            'success': False,
            'error': {'message': 'Invalid username or password.', 'details': serializer.errors}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = serializer.validated_data['user']
    
    # Generate JWT tokens
    refresh = JWT_RefreshToken.for_user(user)
    access = refresh.access_token
    
    # Store refresh token in database for blacklisting
    RefreshToken.objects.create(
        user=user,
        token=str(refresh),
        expires_at=timezone.now() + timedelta(days=7)
    )
    
    response = Response({
        'success': True,
        'data': {
            'access': str(access),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }
    }, status=status.HTTP_200_OK)
    response['X-API-Version'] = '3.0.0-STRICT'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint that blacklists the refresh token.
    """
    serializer = LogoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    refresh_token = serializer.validated_data['refresh']
    
    try:
        # Blacklist the refresh token
        token_obj = RefreshToken.objects.get(token=refresh_token)
        token_obj.blacklist()
        
        return Response({
            'success': True,
            'message': 'Successfully logged out.'
        }, status=status.HTTP_200_OK)
    except RefreshToken.DoesNotExist:
        return Response({
            'success': False,
            'error': {'message': 'Invalid token.'}
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='10/m', method='POST')
def refresh_token_view(request):
    """
    Token refresh endpoint with rotation.
    Blacklists old token and issues new refresh token.
    Rate limited to 10 requests per minute per IP.
    """
    serializer = RefreshTokenSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    old_refresh_token = serializer.validated_data['refresh']
    
    try:
        # Validate and decode the old refresh token
        old_token = JWT_RefreshToken(old_refresh_token)
        user_id = old_token['user_id']
        user = User.objects.get(id=user_id)
        
        # Blacklist the old refresh token
        try:
            token_obj = RefreshToken.objects.get(token=old_refresh_token)
            token_obj.blacklist()
        except RefreshToken.DoesNotExist:
            pass
        
        # Generate new tokens
        new_refresh = JWT_RefreshToken.for_user(user)
        new_access = new_refresh.access_token
        
        # Store new refresh token
        RefreshToken.objects.create(
            user=user,
            token=str(new_refresh),
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        return Response({
            'success': True,
            'data': {
                'access': str(new_access),
                'refresh': str(new_refresh)
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Invalid or expired token.'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user details.
    Optimized with select_related to avoid N+1 queries.
    """
    # OPTIMIZATION: Refetch user with student_profile prefetched
    # This ensures UserSerializer.get_photo() doesn't trigger extra queries
    user = User.objects.select_related('student_profile').get(pk=request.user.pk)
    
    serializer = UserSerializer(user)
    response = Response({
        'success': True,
        'data': serializer.data
    }, status=status.HTTP_200_OK)
    response['X-API-Version'] = '3.0.0-STRICT'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='5/h', method='POST')
def change_password_view(request):
    """
    Change password endpoint.
    Rate limited to 5 requests per hour per user.
    """
    serializer = PasswordChangeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user = request.user
    old_password = serializer.validated_data['old_password']
    new_password = serializer.validated_data['new_password']
    
    # Check old password
    if not user.check_password(old_password):
        return Response({
            'success': False,
            'error': 'Old password is incorrect.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Set new password
    user.set_password(new_password)
    user.save()
    
    return Response({
        'success': True,
        'message': 'Password changed successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='10/h', method='POST')
def update_profile_view(request):
    """
    Update user profile endpoint.
    """
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': {'message': 'Invalid data.', 'details': serializer.errors}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer.save()
    
    return Response({
        'success': True,
        'message': 'Profile updated successfully.',
        'data': serializer.data
    }, status=status.HTTP_200_OK)


from rest_framework import viewsets
from utils.permissions import IsAdmin, IsStaffAccountantOrAdmin
from utils.pagination import StandardResultsSetPagination
from .serializers import UserCreateSerializer

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Admin-only user management.
    """
    queryset = User.objects.all().only(
        'id', 'username', 'email', 'full_name', 'role', 'is_active', 'created_at'
    ).order_by('-created_at')
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsStaffAccountantOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Admins see everyone, Staff see only Students and themselves
        return self.queryset

    def list(self, request, *args, **kwargs):
        """List users with pagination (optimized)."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = UserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        if request.user.role not in ['ADMIN', 'STAFF']:
             return Response({'success': False, 'error': 'Only admins or staff can create users.'}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['ADMIN', 'STAFF'] and request.user.id != int(kwargs.get('pk')):
             return Response({'success': False, 'error': 'Permission denied.'}, status=403)
        return super().update(request, *args, **kwargs)
