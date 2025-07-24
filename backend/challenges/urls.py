from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()
router.register(r'rooms', views.ChallengeRoomViewSet, basename='challengeroom')

app_name = 'challenges'

urlpatterns = [
    # DRF Router URLs
    path('', include(router.urls)),
    
    # 챌린지 참여 관리
    path('join/', views.JoinChallengeView.as_view(), name='join-challenge'),
    path('my/', views.MyChallengeView.as_view(), name='my-challenge'),
    path('my/extend/', views.ExtendChallengeView.as_view(), name='extend-challenge'),
    path('my/leave/', views.LeaveChallengeView.as_view(), name='leave-challenge'),
    
    # 치팅 기능
    path('cheat/', views.RequestCheatDayView.as_view(), name='request-cheat'),
    path('cheat/status/', views.CheatStatusView.as_view(), name='cheat-status'),
    
    # 순위 및 통계
    path('leaderboard/<int:room_id>/', views.LeaderboardView.as_view(), name='leaderboard'),
    path('stats/', views.PersonalStatsView.as_view(), name='personal-stats'),
    path('report/', views.ChallengeReportView.as_view(), name='challenge-report'),
    
    # 내부 API (자동 판정용)
    path('judge/', views.DailyChallengeJudgmentView.as_view(), name='daily-judgment'),
    path('reset/weekly/', views.WeeklyResetView.as_view(), name='weekly-reset'),
]