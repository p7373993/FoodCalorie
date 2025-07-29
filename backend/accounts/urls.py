from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()

app_name = 'accounts'

urlpatterns = [
    # 인증 관련 API
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('csrf-token/', views.CSRFTokenView.as_view(), name='csrf_token'),
    
    # 프로필 관리
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/me/', views.CurrentUserProfileView.as_view(), name='current_profile'),
    path('profile/nickname-check/', views.NicknameCheckView.as_view(), name='nickname_check'),
    
    # 비밀번호 관리
    path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password_reset'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # 관리자 기능
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_user_list'),
    path('admin/users/bulk-action/', views.AdminUserBulkActionView.as_view(), name='admin_user_bulk_action'),
    path('admin/users/<int:user_id>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/statistics/', views.AdminStatisticsView.as_view(), name='admin_statistics'),
    
    # Router URLs
    path('', include(router.urls)),
] 