"""
Custom permission classes for role-based access control.
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission class that only allows admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'


class IsStaffOrAdmin(permissions.BasePermission):
    """
    Permission class that allows staff and admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['STAFF', 'ADMIN']
        )


class IsAccountant(permissions.BasePermission):
    """
    Permission class that only allows accountant users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ACCOUNTANT'


class IsAccountantOrAdmin(permissions.BasePermission):
    """
    Permission class that allows accountant and admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ACCOUNTANT', 'ADMIN']
        )


class IsStaffAccountantOrAdmin(permissions.BasePermission):
    """
    Permission class that allows staff, accountant, and admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['STAFF', 'ACCOUNTANT', 'ADMIN']
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class that allows users to access their own data or admin to access all.
    """
    def has_object_permission(self, request, view, obj):
        # Admin, Staff, or Accountant can access everything
        if request.user.role in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return True
        
        # User can access their own data
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class IsStudent(permissions.BasePermission):
    """
    Permission class that only allows student users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'STUDENT'


class ReadOnly(permissions.BasePermission):
    """
    Permission class that only allows read operations.
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
