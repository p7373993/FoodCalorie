from django.urls import path
from . import views

app_name = 'chegam'

urlpatterns = [
    # 사용자 프로필
    path('api/profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # 식단 관리
    path('api/meals/', views.MealListCreateView.as_view(), name='meal-list-create'),
    path('api/meals/<int:pk>/', views.MealDetailView.as_view(), name='meal-detail'),
    path('api/meals/calendar/', views.CalendarMealsView.as_view(), name='calendar-meals'),
    
    # 체중 관리
    path('api/weight/', views.WeightEntryListCreateView.as_view(), name='weight-list-create'),
    
    # 게임화
    path('api/gamification/', views.GamificationProfileView.as_view(), name='gamification-profile'),
    path('api/gamification/update/', views.update_gamification_view, name='gamification-update'),
    
    # 챌린지
    path('api/challenges/', views.ChallengeListCreateView.as_view(), name='challenge-list-create'),
    path('api/challenges/<int:pk>/', views.ChallengeDetailView.as_view(), name='challenge-detail'),
    path('api/challenges/<int:pk>/join/', views.ChallengeJoinView.as_view(), name='challenge-join'),
    
    # AI 코칭
    path('api/ai/coaching/', views.ai_coaching_view, name='ai-coaching'),
]