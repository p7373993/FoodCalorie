from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Sum, Avg, Q
from datetime import datetime, timedelta, date
import random

from .models import CalendarUserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis
from .serializers import (
    CalendarUserProfileSerializer, DailyGoalSerializer, BadgeSerializer,
    CalendarDataSerializer, MealLogSerializer, WeeklyAnalysisSerializer
)
from api_integrated.models import MealLog


@api_view(['GET'])
@permission_classes([AllowAny])  # 임시로 인증 해제
def get_calendar_data(request):
    """캘린더 페이지 전체 데이터 조회"""
    print(f"🔍 캘린더 API 호출 - 사용자: {request.user}")
    print(f"🔍 인증 상태: {request.user.is_authenticated}")
    
    # 인증된 사용자가 있으면 사용, 없으면 xoxoda@naver.com 사용
    if request.user.is_authenticated:
        user = request.user
    else:
        try:
            user = User.objects.get(email='xoxoda@naver.com')
            print(f"🔧 기본 사용자 사용: {user.username}")
        except User.DoesNotExist:
            return Response({'error': '사용자를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    
    # user가 null인 MealLog들을 현재 사용자에게 할당 (데이터 복구)
    null_user_meals = MealLog.objects.filter(user__isnull=True)
    if null_user_meals.exists():
        print(f"🔧 user가 null인 MealLog {null_user_meals.count()}개를 {user.username}에게 할당")
        null_user_meals.update(user=user)
    
    # 사용자 프로필 가져오기 또는 생성
    profile, created = CalendarUserProfile.objects.get_or_create(
        user=user,
        defaults={
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
    
    # 요청된 년월 파라미터 처리 (없으면 현재 월)
    year = request.GET.get('year')
    month = request.GET.get('month')
    
    if year and month:
        try:
            year = int(year)
            month = int(month)
            # 해당 월의 첫날과 마지막날
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
        except (ValueError, TypeError):
            # 잘못된 파라미터인 경우 현재 월 사용
            today = date.today()
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    else:
        # 파라미터가 없으면 최근 60일간 데이터 (기본값)
        end_date = date.today()
        start_date = end_date - timedelta(days=60)
    
    meal_logs = MealLog.objects.filter(
        user=user,
        date__range=[start_date, end_date]
    ).order_by('date', 'time')
    
    print(f"🔍 사용자 {user.username}의 식사 기록 조회 ({start_date} ~ {end_date}): {meal_logs.count()}개")
    
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
            'mission': get_daily_mission(current_date),
            'emotion': get_daily_emotion(date_meals),
            'memo': get_daily_memo(date_meals),
            'daily_goal': goal_text
        }
        
        daily_logs.append(daily_log)
        if date_meals.exists():
            print(f"📅 {current_date}: {date_meals.count()}개 식사 기록 추가")
        
        current_date += timedelta(days=1)
    
    # 주간 분석 데이터
    weekly_analysis = get_or_create_weekly_analysis(user)
    
    response_data = {
        'user_profile': CalendarUserProfileSerializer(profile).data,
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
    profile, created = CalendarUserProfile.objects.get_or_create(user=user)
    
    serializer = CalendarUserProfileSerializer(profile, data=request.data, partial=True)
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
    user = request.user
    
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
        user=user,
        date__range=[start_date, end_date]
    ).order_by('date', 'time')
    
    # 프론트엔드 형식에 맞게 변환
    formatted_meals = []
    for meal in meals:
        # imageUrl 처리 개선
        image_url = None
        if meal.imageUrl:
            if hasattr(meal.imageUrl, 'url'):
                image_url = meal.imageUrl.url
            else:
                image_url = str(meal.imageUrl)
        else:
            image_url = f'https://picsum.photos/seed/{meal.id}/400/300'
        
        formatted_meals.append({
            'id': meal.id,
            'date': meal.date.strftime('%Y-%m-%d'),
            'image_url': image_url,
            'calories': meal.calories,
            'timestamp': datetime.combine(meal.date, meal.time or datetime.min.time()).isoformat()
        })
    
    print(f"📊 캘린더용 월별 데이터: {len(formatted_meals)}개 식사 기록 반환")
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


def get_daily_mission(current_date):
    """일별 미션 생성"""
    missions = [
        '물 8잔 마시기 💧',
        '30분 운동하기 🏃‍♂️',
        '야채 5접시 먹기 🥬',
        '단백질 충분히 섭취하기 💪',
        '건강한 간식 선택하기 🍎',
        '규칙적인 식사 시간 지키기 ⏰',
        '충분한 수면 취하기 😴',
        '스트레스 관리하기 🧘‍♀️'
    ]
    # 날짜를 시드로 사용해서 같은 날에는 같은 미션이 나오도록
    random.seed(current_date.toordinal())
    mission = random.choice(missions)
    random.seed()  # 시드 초기화
    return mission

def get_daily_memo(meals):
    """일별 메모 생성"""
    if not meals:
        return '오늘은 식사 기록이 없네요. 내일은 더 신경써보세요!'
    
    meal_count = len(meals)
    total_calories = sum(meal.calories for meal in meals)
    
    if meal_count >= 3 and 1800 <= total_calories <= 2200:
        return '완벽한 하루였어요! 이 패턴을 유지해보세요. ✨'
    elif meal_count < 2:
        return '식사 횟수가 적네요. 규칙적인 식사를 권장해요. 🍽️'
    elif total_calories < 1500:
        return '칼로리가 부족해 보여요. 영양가 있는 식사를 더 드세요. 🥗'
    elif total_calories > 2500:
        return '칼로리가 조금 높네요. 내일은 조금 조절해보세요. 😊'
    else:
        return '좋은 하루였어요! 내일도 건강한 식단 유지해보세요. 👍'

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
    profile = CalendarUserProfile.objects.get_or_create(user=user)[0]
    
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