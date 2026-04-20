from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing user notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return notifications for the current user.
        """
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """
        Mark a specific notification as read.
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'success': True, 'message': 'Notification marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """
        Mark all notifications for the current user as read.
        """
        Notification.objects.filter(user=self.request.user, is_read=False).update(is_read=True)
        return Response({'success': True, 'message': 'All notifications marked as read'})
