from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MealLogViewSet, AICoachTipViewSet, AnalyzeImageView, ImageUploadView, MonthlyLogView, DailyReportView, RecommendedChallengesView, MyChallengesView, UserBadgesView, RegisterView, LoginView, UserProfileStatsView, UserStatisticsView, TestMealLogView, ai_coaching_view
from .dashboard_views import get_dashboard_data, weight_records

router = DefaultRouter()
router.register(r'logs', MealLogViewSet)
router.register(r'ai/coaching-tip', AICoachTipViewSet, basename='aicoachtip') # basename 추가

urlpatterns = [
    # 커스텀 analyze-image 엔드포인트를 router보다 먼저 등록
    path('logs/analyze-image/', AnalyzeImageView.as_view(), name='analyze-image'),
    path('upload-image/', ImageUploadView.as_view(), name='upload-image'),

    # router는 그 다음에
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logs/monthly', MonthlyLogView.as_view(), name='monthly-logs'),
    path('logs/daily', DailyReportView.as_view(), name='daily-report'),
    path('challenges/recommended', RecommendedChallengesView.as_view(), name='recommended-challenges'),
    path('challenges/my-list', MyChallengesView.as_view(), name='my-challenges'),
    path('users/<str:username>/badges', UserBadgesView.as_view(), name='user-badges'),
    path('users/profile/stats', UserProfileStatsView.as_view(), name='user-profile-stats'),
    path('users/statistics', UserStatisticsView.as_view(), name='user-statistics'),
    path('test/meal-log/', TestMealLogView.as_view(), name='test-meal-log'),
    
    # 대시보드 API
    path('dashboard/data/', get_dashboard_data, name='dashboard-data'),
    path('weight/', weight_records, name='weight-records'),
    
    # AI 코칭 API
    path('ai/coaching/', ai_coaching_view, name='ai-coaching'),
    
    # Custom API views will be added here
    # path('challenge-main/', include('api.challenges.urls')),  # 임시 주석 처리
]