from django.urls import path, include
from rest_framework.routers import SimpleRouter
from apps.authentication import views
from apps.authentication.views_2fa import Login2FAView, Setup2FAView, Verify2FAView, Disable2FAView

router = SimpleRouter()
router.register(r'users', views.UserViewSet)

app_name = 'authentication'

urlpatterns = [
    path('', include(router.urls)),
    path('login/', Login2FAView.as_view(), name='login'),
    path('2fa/setup/', Setup2FAView.as_view(), name='2fa-setup'),
    path('2fa/verify/', Verify2FAView.as_view(), name='2fa-verify'),
    path('2fa/disable/', Disable2FAView.as_view(), name='2fa-disable'),
    path('logout/', views.logout_view, name='logout'),
    path('refresh/', views.refresh_token_view, name='refresh'),
    path('me/', views.current_user_view, name='current-user'),
    path('profile/update/', views.update_profile_view, name='update-profile'),
    path('password/change/', views.change_password_view, name='change-password'),
]
