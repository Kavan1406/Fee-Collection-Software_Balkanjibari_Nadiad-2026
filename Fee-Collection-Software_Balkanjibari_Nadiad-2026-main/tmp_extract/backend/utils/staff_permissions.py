"""
Custom permission class for staff-only access (excludes students).
"""

from rest_framework import permissions


class IsStaff(permissions.BasePermission):
    """
    Permission class that only allows staff users (not students, not admins).
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'STAFF'
