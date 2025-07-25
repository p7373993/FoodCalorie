from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Sum, Avg, Q
from datetime import datetime, timedelta, date
import random

from .models import UserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis
from .serializers import (
    UserProfileSerializer, DailyGoalSerializer, BadgeSerializer,
    CalendarDataSerializer, MealLogSerializer, WeeklyAnalysisSerializer
)
from api_integrated.models import MealLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_calendar_data(request):
    """캘린더 페이지 전체 데이터 조회"""
    user = request.user
    
    # 사용자 프로필 가져오기 또는 생성
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'name': user.username,
            'calorie_goal': 2000,
            'protein_goal': 120,
            'carbs_goal': 250,
            'fat_goal': 65
        }
    )
    
    # 배지 데이터 생성 (처음 실행시)
    create_default_badges()
    
    # 사용자 배지 조회
    user_badges = UserBadge.objects.filter(user=user).select_related('badge')
    badges = [ub.badge for ub in user_badges]
    
    # 최근 45일간의 식사 기록 조회
    end_date = date.today()
    start_date = end_date - timedelta(days=45)
    
    meal_logs = MealLog.objects.filter(
        user=user,
        date__range=[start_date, end_date]
    ).order_by('date', 'time')
    
    # 날짜별로 그룹화하여 DailyLog 형식으로 변환
    daily_logs = []
    current_date = start_date
    
    while current_date <= end_date:
        date_meals = meal_logs.filter(date=current_date)
        
        # 일별 목표 조회
        daily_goal = DailyGoal.objects.filter(user=user, date=current_date).first()
        goal_text = daily_goal.goal_text if daily_goal else get_random_daily_goal()
        
        daily_log = {
            'date': current_date.strftime('%Y-%m-%d'),
            'meals': MealLogSerializer(date_meals, many=True).data,
            'mission': 'Drink 8 glasses of water today.',
            'emotion': get_daily_emotion(date_meals),
            'memo': 'Felt energetic today!',
            'daily_goal': goal_text
        }
        
        daily_logs.append(daily_log)
        current_date += timedelta(days=1)
    
    # 주간 분석 데이터
    weekly_analysis = get_or_create_weekly_analysis(user)
    
    response_data = {
        'user_profile': UserProfileSerializer(profile).data,
        'badges': BadgeSerializer(badges, many=True).data,
        'daily_logs': daily_logs,
        'weekly_analysis': WeeklyAnalysisSerializer(weekly_analysis).data if weekly_analysis else None
    }
    
    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """사용자 프로필 업데이트"""
    user = request.user
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_meals_by_date(request):
    """특정 날짜의 식사 기록 조회"""
    date_str = request.GET.get('date')
    if not date_str:
        return Response({'error': 'Date parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    meals = MealLog.objects.filter(user=request.user, date=target_date)
    serializer = MealLogSerializer(meals, many=True)
    
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_calendar_meals(request):
    """캘린더용 월별 식사 데이터 조회"""
    year = request.GET.get('year', datetime.now().year)
    month = request.GET.get('month', datetime.now().month)
    
    try:
        year = int(year)
        month = int(month)
    except ValueError:
        return Response({'error': 'Invalid year or month'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 해당 월의 첫날과 마지막날
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    meals = MealLog.objects.filter(
        user=request.user,
        date__range=[start_date, end_date]
    ).values('id', 'date', 'imageUrl', 'calories', 'time')
    
    # 프론트엔드 형식에 맞게 변환
    formatted_meals = []
    for meal in meals:
        formatted_meals.append({
            'id': meal['id'],
            'date': meal['date'].strftime('%Y-%m-%d'),
            'image_url': meal['imageUrl'].url if meal['imageUrl'] else f'https://picsum.photos/seed/{meal["id"]}/400/300',
            'calories': meal['calories'],
            'timestamp': datetime.combine(meal['date'], meal['time'] or datetime.min.time()).isoformat()
        })
    
    return Response(formatted_meals)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_daily_goal(request):
    """일별 목표 설정"""
    date_str = request.data.get('date')
    goal_text = request.data.get('goal_text')
    
    if not date_str or not goal_text:
        return Response({'error': 'Date and goal_text are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    daily_goal, created = DailyGoal.objects.update_or_create(
        user=request.user,
        date=target_date,
        defaults={'goal_text': goal_text}
    )
    
    serializer = DailyGoalSerializer(daily_goal)
    return Response(serializer.data)


def create_default_badges():
    """기본 배지 생성"""
    default_badges = [
        {'name': 'First Meal', 'icon': '🎉', 'description': 'Logged your very first meal.', 'condition_type': 'first_meal'},
        {'name': '7-Day Streak', 'icon': '🔥', 'description': 'Logged in for 7 days in a row.', 'condition_type': 'streak_7'},
        {'name': 'Protein Pro', 'icon': '💪', 'description': 'Met your protein goal 3 times.', 'condition_type': 'protein_goal'},
        {'name': 'Perfect Week', 'icon': '🌟', 'description': 'Stayed within calorie goals for a week.', 'condition_type': 'perfect_week'},
        {'name': 'Veggie Power', 'icon': '🥦', 'description': 'Ate 5 servings of vegetables in a day.', 'condition_type': 'veggie_power'},
        {'name': 'Hydration Hero', 'icon': '💧', 'description': 'Drank 8 glasses of water.', 'condition_type': 'hydration'},
    ]
    
    for badge_data in default_badges:
        Badge.objects.get_or_create(
            name=badge_data['name'],
            defaults=badge_data
        )


def get_random_daily_goal():
    """랜덤 일별 목표 생성"""
    goals = [
        '물 8잔 마시기',
        '단백질 120g 섭취하기',
        '야채 5접시 먹기',
        '30분 운동하기',
        '금연 유지하기',
        '금주 유지하기',
        '일찍 잠자리에 들기',
        '스트레스 관리하기',
        '건강한 간식 선택하기',
        '칼로리 목표 달성하기',
        '탄수화물 적정량 섭취',
        '지방 섭취량 조절하기',
        '규칙적인 식사 시간 지키기',
        '과식 피하기',
        '신선한 과일 섭취하기'
    ]
    return random.choice(goals)


def get_daily_emotion(meals):
    """일별 감정 상태 결정"""
    if not meals:
        return '😐'
    
    total_calories = sum(meal.calories for meal in meals)
    if total_calories >= 1800 and total_calories <= 2200:
        return '😊'
    elif total_calories < 1500:
        return '😔'
    elif total_calories > 2500:
        return '😅'
    else:
        return '😐'


def get_or_create_weekly_analysis(user):
    """주간 분석 데이터 생성 또는 조회"""
    today = date.today()
    # 이번 주 월요일 찾기
    monday = today - timedelta(days=today.weekday())
    
    # 기존 분석 데이터 확인
    analysis = WeeklyAnalysis.objects.filter(user=user, week_start=monday).first()
    if analysis:
        return analysis
    
    # 이번 주 데이터 계산
    week_end = monday + timedelta(days=6)
    week_meals = MealLog.objects.filter(
        user=user,
        date__range=[monday, week_end]
    )
    
    if not week_meals.exists():
        return None
    
    # 평균 계산
    totals = week_meals.aggregate(
        avg_calories=Avg('calories'),
        avg_protein=Avg('protein'),
        avg_carbs=Avg('carbs'),
        avg_fat=Avg('fat')
    )
    
    # 사용자 프로필 가져오기
    profile = UserProfile.objects.get_or_create(user=user)[0]
    
    # 달성률 계산
    calorie_rate = (totals['avg_calories'] / profile.calorie_goal * 100) if totals['avg_calories'] else 0
    protein_rate = (totals['avg_protein'] / profile.protein_goal * 100) if totals['avg_protein'] else 0
    carbs_rate = (totals['avg_carbs'] / profile.carbs_goal * 100) if totals['avg_carbs'] else 0
    fat_rate = (totals['avg_fat'] / profile.fat_goal * 100) if totals['avg_fat'] else 0
    
    # AI 조언 생성
    ai_advice = generate_ai_advice(calorie_rate, protein_rate, carbs_rate, fat_rate)
    
    # 분석 데이터 저장
    analysis = WeeklyAnalysis.objects.create(
        user=user,
        week_start=monday,
        avg_calories=totals['avg_calories'] or 0,
        avg_protein=totals['avg_protein'] or 0,
        avg_carbs=totals['avg_carbs'] or 0,
        avg_fat=totals['avg_fat'] or 0,
        calorie_achievement_rate=calorie_rate,
        protein_achievement_rate=protein_rate,
        carbs_achievement_rate=carbs_rate,
        fat_achievement_rate=fat_rate,
        ai_advice=ai_advice
    )
    
    return analysis


def generate_ai_advice(calorie_rate, protein_rate, carbs_rate, fat_rate):
    """AI 조언 생성"""
    if calorie_rate >= 90 and calorie_rate <= 110:
        return "완벽한 한 주였어요! 현재 패턴을 유지하세요. 🎉"
    elif calorie_rate < 90:
        return f"평균 칼로리가 목표보다 {100 - calorie_rate:.0f}% 부족해요. 균형 잡힌 식사를 늘려보세요. 💪"
    else:
        return f"평균 칼로리가 목표보다 {calorie_rate - 100:.0f}% 초과했어요. 다음 주는 조금 조절해보세요. 😊"