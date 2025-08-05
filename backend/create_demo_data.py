#!/usr/bin/env python3
"""
시연영상용 완전한 데모 데이터 생성 스크립트
"""

import os
import sys
import django
from datetime import datetime, timedelta, date, time
import random
from decimal import Decimal

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from api_integrated.models import MealLog, WeightRecord, AICoachTip
from challenges.models import ChallengeRoom, UserChallenge, DailyChallengeRecord, ChallengeBadge, UserChallengeBadge
from calender.models import CalendarUserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis

def clear_existing_data():
    """기존 데이터 정리"""
    print("🧹 기존 데이터 정리 중...")
    
    # 사용자 데이터는 유지하고 관련 데이터만 삭제
    MealLog.objects.all().delete()
    WeightRecord.objects.all().delete()
    AICoachTip.objects.all().delete()
    DailyChallengeRecord.objects.all().delete()
    UserChallenge.objects.all().delete()
    ChallengeRoom.objects.all().delete()
    ChallengeBadge.objects.all().delete()
    UserChallengeBadge.objects.all().delete()
    CalendarUserProfile.objects.all().delete()
    DailyGoal.objects.all().delete()
    Badge.objects.all().delete()
    UserBadge.objects.all().delete()
    WeeklyAnalysis.objects.all().delete()
    
    print("✅ 기존 데이터 정리 완료")

def create_demo_users():
    """시연용 사용자 계정 생성"""
    print("👥 시연용 사용자 계정 생성 중...")
    
    users_data = [
        {
            'username': 'demo_user',
            'email': 'demo@example.com',
            'password': 'demo123!',
            'first_name': '김',
            'last_name': '시연',
            'profile': {
                'nickname': '건강한김시연',
                'height': 170.0,
                'weight': 65.0,
                'age': 28,
                'gender': 'female',
                'bio': '건강한 식단 관리를 통해 목표 체중 달성을 위해 노력하고 있습니다! 💪'
            }
        },
        {
            'username': 'fitness_lover',
            'email': 'fitness@example.com',
            'password': 'fitness123!',
            'first_name': '박',
            'last_name': '헬스',
            'profile': {
                'nickname': '헬스매니아박',
                'height': 175.0,
                'weight': 72.0,
                'age': 32,
                'gender': 'male',
                'bio': '운동과 식단 관리로 건강한 라이프스타일을 추구합니다 🏋️‍♂️'
            }
        },
        {
            'username': 'diet_master',
            'email': 'diet@example.com',
            'password': 'diet123!',
            'first_name': '이',
            'last_name': '다이어트',
            'profile': {
                'nickname': '다이어트마스터',
                'height': 165.0,
                'weight': 58.0,
                'age': 25,
                'gender': 'female',
                'bio': '체계적인 칼로리 관리로 건강한 다이어트 진행 중입니다 🥗'
            }
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # 사용자 생성 또는 가져오기
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
            }
        )
        
        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✅ 사용자 생성: {user.username}")
        else:
            print(f"📝 기존 사용자 사용: {user.username}")
        
        # 프로필 생성 또는 업데이트
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults=user_data['profile']
        )
        
        if not profile_created:
            for key, value in user_data['profile'].items():
                setattr(profile, key, value)
            profile.save()
        
        created_users.append(user)
    
    print(f"✅ 총 {len(created_users)}명의 사용자 계정 준비 완료")
    return created_users

def create_meal_data(users):
    """식사 기록 데이터 생성 (최근 2주간)"""
    print("🍽️ 식사 기록 데이터 생성 중...")
    
    # 한국 음식 데이터
    korean_foods = [
        # 아침 식사
        {'name': '김치찌개', 'calories': 320, 'protein': 18, 'carbs': 25, 'fat': 15, 'score': 'B', 'meal_type': 'breakfast'},
        {'name': '계란후라이', 'calories': 180, 'protein': 12, 'carbs': 2, 'fat': 14, 'score': 'B', 'meal_type': 'breakfast'},
        {'name': '토스트', 'calories': 250, 'protein': 8, 'carbs': 35, 'fat': 8, 'score': 'C', 'meal_type': 'breakfast'},
        {'name': '오트밀', 'calories': 150, 'protein': 5, 'carbs': 27, 'fat': 3, 'score': 'A', 'meal_type': 'breakfast'},
        {'name': '그릭요거트', 'calories': 130, 'protein': 15, 'carbs': 9, 'fat': 4, 'score': 'A', 'meal_type': 'breakfast'},
        
        # 점심 식사
        {'name': '불고기덮밥', 'calories': 650, 'protein': 35, 'carbs': 75, 'fat': 18, 'score': 'C', 'meal_type': 'lunch'},
        {'name': '비빔밥', 'calories': 520, 'protein': 20, 'carbs': 68, 'fat': 15, 'score': 'B', 'meal_type': 'lunch'},
        {'name': '김치볶음밥', 'calories': 480, 'protein': 15, 'carbs': 65, 'fat': 16, 'score': 'C', 'meal_type': 'lunch'},
        {'name': '닭가슴살샐러드', 'calories': 280, 'protein': 35, 'carbs': 12, 'fat': 8, 'score': 'A', 'meal_type': 'lunch'},
        {'name': '연어초밥', 'calories': 420, 'protein': 25, 'carbs': 45, 'fat': 12, 'score': 'B', 'meal_type': 'lunch'},
        {'name': '된장찌개', 'calories': 180, 'protein': 12, 'carbs': 15, 'fat': 8, 'score': 'B', 'meal_type': 'lunch'},
        
        # 저녁 식사
        {'name': '삼겹살구이', 'calories': 720, 'protein': 28, 'carbs': 5, 'fat': 65, 'score': 'D', 'meal_type': 'dinner'},
        {'name': '갈비찜', 'calories': 580, 'protein': 32, 'carbs': 25, 'fat': 38, 'score': 'C', 'meal_type': 'dinner'},
        {'name': '생선구이', 'calories': 320, 'protein': 28, 'carbs': 8, 'fat': 18, 'score': 'B', 'meal_type': 'dinner'},
        {'name': '두부김치', 'calories': 250, 'protein': 15, 'carbs': 18, 'fat': 12, 'score': 'B', 'meal_type': 'dinner'},
        {'name': '닭볶음탕', 'calories': 450, 'protein': 35, 'carbs': 20, 'fat': 25, 'score': 'B', 'meal_type': 'dinner'},
        
        # 간식
        {'name': '사과', 'calories': 95, 'protein': 0.5, 'carbs': 25, 'fat': 0.3, 'score': 'A', 'meal_type': 'snack'},
        {'name': '바나나', 'calories': 105, 'protein': 1.3, 'carbs': 27, 'fat': 0.4, 'score': 'A', 'meal_type': 'snack'},
        {'name': '견과류믹스', 'calories': 180, 'protein': 6, 'carbs': 8, 'fat': 15, 'score': 'B', 'meal_type': 'snack'},
        {'name': '프로틴바', 'calories': 220, 'protein': 20, 'carbs': 15, 'fat': 8, 'score': 'B', 'meal_type': 'snack'},
        {'name': '치킨브레스트', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6, 'score': 'A', 'meal_type': 'snack'},
    ]
    
    meal_count = 0
    today = date.today()
    
    for user in users:
        # 각 사용자별로 최근 14일간 식사 기록 생성
        for days_ago in range(14):
            meal_date = today - timedelta(days=days_ago)
            
            # 하루에 2-4끼 식사 (랜덤)
            daily_meals = random.randint(2, 4)
            meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
            selected_types = random.sample(meal_types, daily_meals)
            
            for meal_type in selected_types:
                # 해당 식사 시간대에 맞는 음식 선택
                suitable_foods = [f for f in korean_foods if f['meal_type'] == meal_type]
                if not suitable_foods:
                    suitable_foods = korean_foods
                
                food = random.choice(suitable_foods)
                
                # 시간 설정
                if meal_type == 'breakfast':
                    meal_time = time(random.randint(7, 9), random.randint(0, 59))
                elif meal_type == 'lunch':
                    meal_time = time(random.randint(12, 14), random.randint(0, 59))
                elif meal_type == 'dinner':
                    meal_time = time(random.randint(18, 20), random.randint(0, 59))
                else:  # snack
                    meal_time = time(random.randint(15, 17), random.randint(0, 59))
                
                # 칼로리 약간 변동 (±10%)
                calorie_variation = random.uniform(0.9, 1.1)
                adjusted_calories = round(food['calories'] * calorie_variation)
                adjusted_protein = round(food['protein'] * calorie_variation, 1)
                adjusted_carbs = round(food['carbs'] * calorie_variation, 1)
                adjusted_fat = round(food['fat'] * calorie_variation, 1)
                
                MealLog.objects.create(
                    user=user,
                    date=meal_date,
                    mealType=meal_type,
                    foodName=food['name'],
                    calories=adjusted_calories,
                    protein=adjusted_protein,
                    carbs=adjusted_carbs,
                    fat=adjusted_fat,
                    nutriScore=food['score'],
                    time=meal_time,
                    imageUrl=f"https://example.com/food-images/{food['name']}.jpg"
                )
                meal_count += 1
    
    print(f"✅ 총 {meal_count}개의 식사 기록 생성 완료")

def create_weight_data(users):
    """체중 기록 데이터 생성"""
    print("⚖️ 체중 기록 데이터 생성 중...")
    
    weight_count = 0
    today = date.today()
    
    for user in users:
        profile = user.profile
        base_weight = profile.weight or 65.0  # 기본값 설정
        
        # 최근 2주간 체중 변화 (점진적 감소 또는 증가)
        weight_trend = random.choice([-0.3, -0.2, -0.1, 0.1, 0.2])  # 주간 변화량
        
        for days_ago in range(0, 14, 2):  # 이틀에 한 번씩 기록
            record_date = today - timedelta(days=days_ago)
            
            # 체중 변화 계산 (점진적 변화 + 일일 변동)
            weeks_passed = days_ago / 7
            trend_change = weight_trend * weeks_passed
            daily_variation = random.uniform(-0.5, 0.5)  # 일일 변동
            
            current_weight = base_weight + trend_change + daily_variation
            current_weight = round(current_weight, 1)
            
            WeightRecord.objects.create(
                user=user,
                weight=current_weight,
                date=record_date
            )
            weight_count += 1
    
    print(f"✅ 총 {weight_count}개의 체중 기록 생성 완료")

def create_challenge_data(users):
    """챌린지 데이터 생성"""
    print("🏆 챌린지 데이터 생성 중...")
    
    # 챌린지 방 생성
    challenge_rooms_data = [
        {
            'name': '1500kcal 다이어트 챌린지',
            'target_calorie': 1500,
            'tolerance': 50,
            'description': '건강한 다이어트를 위한 1500kcal 챌린지입니다. 균형잡힌 식단으로 목표를 달성해보세요!',
            'dummy_users_count': 45
        },
        {
            'name': '2000kcal 유지 챌린지',
            'target_calorie': 2000,
            'tolerance': 75,
            'description': '현재 체중 유지를 위한 2000kcal 챌린지입니다. 꾸준한 관리가 핵심입니다!',
            'dummy_users_count': 32
        },
        {
            'name': '2500kcal 벌크업 챌린지',
            'target_calorie': 2500,
            'tolerance': 100,
            'description': '근육량 증가를 위한 2500kcal 챌린지입니다. 단백질 섭취에 특히 신경써주세요!',
            'dummy_users_count': 28
        }
    ]
    
    created_rooms = []
    for room_data in challenge_rooms_data:
        room = ChallengeRoom.objects.create(**room_data)
        created_rooms.append(room)
        print(f"✅ 챌린지 방 생성: {room.name}")
    
    # 사용자 챌린지 참여
    for i, user in enumerate(users):
        room = created_rooms[i % len(created_rooms)]  # 각 사용자를 다른 방에 배정
        profile = user.profile
        
        # 챌린지 참여 정보
        challenge_duration = random.randint(14, 30)  # 2-4주
        start_date = date.today() - timedelta(days=random.randint(5, 10))
        
        user_challenge = UserChallenge.objects.create(
            user=user,
            room=room,
            user_height=profile.height or 170.0,
            user_weight=profile.weight or 65.0,
            user_target_weight=(profile.weight or 65.0) + random.uniform(-5, -2),  # 목표 체중
            user_challenge_duration_days=challenge_duration,
            user_weekly_cheat_limit=random.randint(1, 2),
            min_daily_meals=random.randint(2, 3),
            challenge_cutoff_time=time(23, 0),
            current_streak_days=random.randint(3, 8),
            max_streak_days=random.randint(5, 12),
            remaining_duration_days=max(0, challenge_duration - (date.today() - start_date).days),
            total_success_days=random.randint(8, 15),
            total_failure_days=random.randint(2, 5),
            challenge_start_date=start_date
        )
        
        # 일일 챌린지 기록 생성
        for days_ago in range(min(10, (date.today() - start_date).days)):
            record_date = date.today() - timedelta(days=days_ago)
            
            # 해당 날짜의 총 칼로리 계산 (실제 식사 기록 기반)
            daily_meals = MealLog.objects.filter(user=user, date=record_date)
            total_calories = sum(meal.calories for meal in daily_meals)
            
            if total_calories > 0:  # 식사 기록이 있는 경우만
                target_calories = room.target_calorie
                calorie_diff = abs(total_calories - target_calories)
                is_success = calorie_diff <= room.tolerance
                
                DailyChallengeRecord.objects.create(
                    user_challenge=user_challenge,
                    date=record_date,
                    total_calories=total_calories,
                    target_calories=target_calories,
                    is_success=is_success,
                    is_cheat_day=random.choice([True, False]) if not is_success else False,
                    meal_count=daily_meals.count()
                )
        
        print(f"✅ {user.username} 챌린지 참여: {room.name}")
    
    print(f"✅ 챌린지 데이터 생성 완료")

def create_badge_data(users):
    """배지 시스템 데이터 생성"""
    print("🏅 배지 시스템 데이터 생성 중...")
    
    # 챌린지 배지 생성
    challenge_badges_data = [
        {'name': '첫 걸음', 'description': '첫 번째 챌린지 참여', 'icon': '🎯', 'condition_type': 'streak', 'condition_value': 1},
        {'name': '꾸준함의 힘', 'description': '3일 연속 성공', 'icon': '🔥', 'condition_type': 'streak', 'condition_value': 3},
        {'name': '일주일 마스터', 'description': '7일 연속 성공', 'icon': '⭐', 'condition_type': 'streak', 'condition_value': 7},
        {'name': '완벽주의자', 'description': '완벽한 한 주 달성', 'icon': '💎', 'condition_type': 'perfect_week', 'condition_value': 1},
        {'name': '챌린지 완주자', 'description': '챌린지 완료', 'icon': '🏆', 'condition_type': 'completion', 'condition_value': 1},
    ]
    
    for badge_data in challenge_badges_data:
        ChallengeBadge.objects.create(**badge_data)
    
    # 캘린더 배지 생성
    calendar_badges_data = [
        {'name': '첫 식사', 'icon': '🍽️', 'description': '첫 번째 식사 기록', 'condition_type': 'first_meal'},
        {'name': '7일 연속', 'icon': '🔥', 'description': '7일 연속 식사 기록', 'condition_type': 'streak_7'},
        {'name': '단백질 마스터', 'icon': '💪', 'description': '단백질 목표 달성', 'condition_type': 'protein_goal'},
        {'name': '완벽한 주', 'icon': '⭐', 'description': '일주일 완벽 달성', 'condition_type': 'perfect_week'},
        {'name': '야채 파워', 'icon': '🥗', 'description': '야채 중심 식단', 'condition_type': 'veggie_power'},
        {'name': '수분 충전', 'icon': '💧', 'description': '충분한 수분 섭취', 'condition_type': 'hydration'},
    ]
    
    for badge_data in calendar_badges_data:
        Badge.objects.create(**badge_data)
    
    # 사용자에게 배지 부여
    challenge_badges = ChallengeBadge.objects.all()
    calendar_badges = Badge.objects.all()
    
    for user in users:
        # 챌린지 배지 (랜덤하게 일부 획득)
        earned_challenge_badges = random.sample(list(challenge_badges), random.randint(2, 4))
        for badge in earned_challenge_badges:
            UserChallengeBadge.objects.create(
                user=user,
                badge=badge,
                user_challenge=user.user_challenges.first()
            )
        
        # 캘린더 배지 (랜덤하게 일부 획득)
        earned_calendar_badges = random.sample(list(calendar_badges), random.randint(2, 4))
        for badge in earned_calendar_badges:
            UserBadge.objects.create(user=user, badge=badge)
    
    print(f"✅ 배지 시스템 데이터 생성 완료")

def create_calendar_data(users):
    """캘린더 관련 데이터 생성"""
    print("📅 캘린더 데이터 생성 중...")
    
    for user in users:
        # 캘린더 프로필 생성
        CalendarUserProfile.objects.create(
            user=user,
            calorie_goal=random.randint(1800, 2200),
            protein_goal=random.randint(100, 150),
            carbs_goal=random.randint(200, 300),
            fat_goal=random.randint(50, 80)
        )
        
        # 일일 목표 생성 (최근 1주일)
        for days_ago in range(7):
            goal_date = date.today() - timedelta(days=days_ago)
            goals = [
                '물 2L 이상 마시기',
                '야채 5가지 이상 섭취',
                '단백질 목표량 달성',
                '간식 줄이기',
                '운동 30분 이상',
                '일찍 잠자리에 들기',
                '스트레스 관리하기'
            ]
            
            DailyGoal.objects.create(
                user=user,
                date=goal_date,
                goal_text=random.choice(goals),
                is_completed=random.choice([True, False])
            )
        
        # 주간 분석 데이터 생성
        for weeks_ago in range(2):
            week_start = date.today() - timedelta(days=date.today().weekday() + weeks_ago * 7)
            
            WeeklyAnalysis.objects.create(
                user=user,
                week_start=week_start,
                avg_calories=random.uniform(1800, 2200),
                avg_protein=random.uniform(80, 120),
                avg_carbs=random.uniform(200, 280),
                avg_fat=random.uniform(50, 80),
                calorie_achievement_rate=random.uniform(0.85, 1.15),
                protein_achievement_rate=random.uniform(0.8, 1.2),
                carbs_achievement_rate=random.uniform(0.9, 1.1),
                fat_achievement_rate=random.uniform(0.8, 1.1),
                ai_advice="이번 주는 단백질 섭취가 부족했습니다. 닭가슴살, 계란, 두부 등을 더 섭취해보세요!"
            )
    
    print(f"✅ 캘린더 데이터 생성 완료")

def create_ai_tips():
    """AI 코치 팁 생성"""
    print("🤖 AI 코치 팁 생성 중...")
    
    tips_data = [
        {
            'message': '오늘 단백질 섭취량이 목표보다 부족합니다. 저녁에 닭가슴살이나 두부 요리를 추가해보세요!',
            'type': 'suggestion',
            'priority': 'medium'
        },
        {
            'message': '3일 연속 목표 칼로리를 달성했습니다! 정말 잘하고 계시네요 👏',
            'type': 'encouragement',
            'priority': 'low'
        },
        {
            'message': '어제 칼로리 섭취량이 목표보다 300kcal 초과했습니다. 오늘은 조금 더 주의해주세요.',
            'type': 'warning',
            'priority': 'high'
        },
        {
            'message': '이번 주 야채 섭취량이 부족합니다. 컬러풀한 샐러드로 영양소를 보충해보세요! 🥗',
            'type': 'suggestion',
            'priority': 'medium'
        },
        {
            'message': '꾸준한 식단 관리로 체중이 2kg 감소했습니다! 계속 화이팅하세요! 💪',
            'type': 'encouragement',
            'priority': 'low'
        },
        {
            'message': '최근 3일간 식사 기록이 없습니다. 꾸준한 기록이 성공의 열쇠입니다!',
            'type': 'warning',
            'priority': 'high'
        }
    ]
    
    for tip_data in tips_data:
        AICoachTip.objects.create(**tip_data)
    
    print(f"✅ AI 코치 팁 {len(tips_data)}개 생성 완료")

def main():
    """메인 실행 함수"""
    print("🎬 시연영상용 데모 데이터 생성 시작!")
    print("=" * 50)
    
    try:
        # 1. 기존 데이터 정리
        clear_existing_data()
        
        # 2. 사용자 계정 생성
        users = create_demo_users()
        
        # 3. 식사 기록 데이터 생성
        create_meal_data(users)
        
        # 4. 체중 기록 데이터 생성
        create_weight_data(users)
        
        # 5. 챌린지 데이터 생성
        create_challenge_data(users)
        
        # 6. 배지 시스템 데이터 생성
        create_badge_data(users)
        
        # 7. 캘린더 데이터 생성
        create_calendar_data(users)
        
        # 8. AI 코치 팁 생성
        create_ai_tips()
        
        print("=" * 50)
        print("🎉 시연영상용 데모 데이터 생성 완료!")
        print("\n📋 생성된 데이터 요약:")
        print(f"👥 사용자: {User.objects.count()}명")
        print(f"🍽️ 식사 기록: {MealLog.objects.count()}개")
        print(f"⚖️ 체중 기록: {WeightRecord.objects.count()}개")
        print(f"🏆 챌린지 방: {ChallengeRoom.objects.count()}개")
        print(f"🎯 사용자 챌린지: {UserChallenge.objects.count()}개")
        print(f"📊 일일 기록: {DailyChallengeRecord.objects.count()}개")
        print(f"🏅 배지: {ChallengeBadge.objects.count() + Badge.objects.count()}개")
        print(f"🤖 AI 팁: {AICoachTip.objects.count()}개")
        
        print("\n🔑 로그인 정보:")
        print("사용자명: demo_user, 비밀번호: demo123!")
        print("사용자명: fitness_lover, 비밀번호: fitness123!")
        print("사용자명: diet_master, 비밀번호: diet123!")
        
        print("\n🎬 시연 준비 완료! 멋진 영상 촬영하세요! 📹")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()