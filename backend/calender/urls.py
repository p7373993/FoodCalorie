from django.urls import path
from . import views

urlpatterns = [
    # 캘린더 메인 데이터
    path('data/', views.get_calendar_data, name='calendar_data'),
    
    # 사용자 프로필 관리
    path('profile/', views.update_user_profile, name='update_profile'),
    
    # 식사 기록 조회
    path('meals/', views.get_meals_by_date, name='meals_by_date'),
    path('meals/calendar/', views.get_calendar_meals, name='calendar_meals'),
    
    # 일별 목표 설정
    path('daily-goal/', views.set_daily_goal, name='set_daily_goal'),
]