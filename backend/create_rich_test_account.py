#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
풍부한 데이터를 가진 새로운 테스트 계정 생성
"""

import os
import sys
import django
from datetime import datetime, timedelta, date, time
from django.contrib.auth.models import User
import random

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog, WeightRecord
from challenges.models import UserChallenge, DailyChallengeRecord, CheatDayRequest, ChallengeBadge, UserChallengeBadge, ChallengeRoom

def create_rich_test_account():
    """풍부한 데이터를 가진 테스트 계정 생성"""
    
    # 새 테스트 사용자 생성
    username = 'rich_test_user'
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': 'rich_test@example.com',
            'first_name': 'Rich',
            'last_name': 'Tester',
            'is_active': True
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ 새 테스트 사용자 생성: {user.username}")
    else:
        # 기존 데이터 정리
        MealLog.objects.filter(user=user).delete()
        WeightRecord.objects.filter(user=user).delete()
        UserChallenge.objects.filter(user=user).delete()
        UserChallengeBadge.objects.filter(user=user).delete()
        print(f"🔄 기존 사용자 데이터 정리: {user.username}")
    
    # 1. 60일간의 식사 데이터 생성
    create_meal_data(user)
    
    # 2. 30일간의 체중 데이터 생성
    create_weight_data(user)
    
    # 3. 챌린지 참여 및 기록 생성
    create_challenge_data(user)
    
    # 4. 배지 수여
    award_badges(user)
    
    print(f"\n🎉 풍부한 테스트 데이터 생성 완료!")
    print(f"사용자명: {user.username}")
    print(f"비밀번호: testpass123")
    print(f"이메일: {user.email}")

def create_meal_data(user):
    """60일간의 다양한 식사 데이터 생성"""
    print("🍽️ 식사 데이터 생성 중...")
    
    # 한국 음식 리스트 (더 다양하게)
    korean_foods = [
        ("김치찌개", 350), ("된장찌개", 280), ("불고기", 420), ("비빔밥", 480),
        ("냉면", 380), ("삼겹살", 520), ("갈비탕", 450), ("김밥", 320),
        ("라면", 400), ("치킨", 580), ("피자", 650), ("햄버거", 550),
        ("짜장면", 480), ("짬뽕", 520), ("탕수육", 600), ("볶음밥", 420),
        ("순두부찌개", 250), ("갈비찜", 480), ("닭갈비", 380), ("떡볶이", 320),
        ("오므라이스", 450), ("돈까스", 520), ("생선구이", 280), ("나물반찬", 150),
        ("계란말이", 180), ("토스트", 250), ("샐러드", 200), ("과일", 120),
        ("요거트", 100), ("견과류", 180), ("스테이크", 650), ("파스타", 580),
        ("초밥", 450), ("우동", 380), ("카레", 520), ("마라탕", 480),
        ("족발", 680), ("보쌈", 520), ("닭발", 380), ("곱창", 450),
        ("회", 280), ("매운탕", 320), ("삼계탕", 580), ("설렁탕", 420),
        ("칼국수", 380), ("만두", 320), ("잡채", 280), ("bulgogi", 420)
    ]
    
    today = date.today()
    meal_count = 0
    
    for i in range(60):  # 60일간
        meal_date = today - timedelta(days=59-i)
        
        # 하루 식사 횟수 (2-5끼)
        meals_per_day = random.randint(2, 5)
        meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        
        # 오늘은 아침만 (마지막 날)
        if i == 59:
            selected_meals = ['breakfast']
        else:
            # 기본 식사 (아침, 점심, 저녁) + 간식
            selected_meals = ['breakfast', 'lunch', 'dinner']
            if meals_per_day > 3:
                selected_meals.append('snack')
            if meals_per_day == 5:
                selected_meals.append('snack')  # 간식 2번
        
        for j, meal_type in enumerate(selected_meals):
            food_name, base_calories = random.choice(korean_foods)
            
            # 식사 타입별 칼로리 조정
            if meal_type == 'breakfast':
                calories = int(base_calories * random.uniform(0.7, 1.0))
                hour = random.randint(7, 9)
            elif meal_type == 'lunch':
                calories = int(base_calories * random.uniform(1.0, 1.3))
                hour = random.randint(12, 14)
            elif meal_type == 'dinner':
                calories = int(base_calories * random.uniform(0.9, 1.2))
                hour = random.randint(18, 20)
            else:  # snack
                calories = int(base_calories * random.uniform(0.3, 0.6))
                hour = random.randint(15, 17) if j == 3 else random.randint(21, 22)
            
            meal_time = time(hour, random.randint(0, 59))
            
            meal_name_prefix = {
                'breakfast': '아침',
                'lunch': '점심', 
                'dinner': '저녁',
                'snack': '간식'
            }
            
            MealLog.objects.create(
                user=user,
                date=meal_date,
                mealType=meal_type,
                foodName=f"{meal_name_prefix[meal_type]} {food_name}",
                calories=calories,
                carbs=int(calories * 0.6 / 4),
                protein=int(calories * 0.2 / 4),
                fat=int(calories * 0.2 / 9),
                nutriScore=random.choice(['A', 'B', 'C', 'D']),
                time=meal_time
            )
            meal_count += 1
    
    print(f"   총 {meal_count}개의 식사 기록 생성")

def create_weight_data(user):
    """30일간의 체중 데이터 생성 (자연스러운 변화)"""
    print("⚖️ 체중 데이터 생성 중...")
    
    today = date.today()
    base_weight = random.randint(65, 75)  # 시작 체중
    weight_count = 0
    
    for i in range(30):
        weight_date = today - timedelta(days=29-i)
        
        # 자연스러운 체중 변화 (전체적으로 감소 추세)
        if i == 0:
            weight = base_weight
        else:
            # 80% 확률로 감소, 20% 확률로 증가
            if random.random() < 0.8:
                change = random.uniform(-0.3, -0.1)  # 감소
            else:
                change = random.uniform(0.1, 0.2)   # 증가
            
            base_weight = max(50, min(100, base_weight + change))
            weight = round(base_weight, 1)
        
        WeightRecord.objects.create(
            user=user,
            weight=int(weight),  # 소숫점 없이
            date=weight_date
        )
        weight_count += 1
    
    print(f"   총 {weight_count}개의 체중 기록 생성 ({base_weight:.1f}kg → {weight}kg)")

def create_challenge_data(user):
    """챌린지 참여 및 상세 기록 생성"""
    print("🏆 챌린지 데이터 생성 중...")
    
    # 1500kcal 챌린지에 참여
    room = ChallengeRoom.objects.filter(target_calorie=1500).first()
    if not room:
        print("   ❌ 1500kcal 챌린지 방을 찾을 수 없습니다.")
        return
    
    # 챌린지 참여 생성
    challenge_start = date.today() - timedelta(days=45)
    user_challenge = UserChallenge.objects.create(
        user=user,
        room=room,
        user_height=170,
        user_weight=70,
        user_target_weight=65,
        user_challenge_duration_days=60,
        user_weekly_cheat_limit=2,
        min_daily_meals=2,
        challenge_cutoff_time=time(23, 0),
        status='active',
        challenge_start_date=challenge_start,
        remaining_duration_days=15
    )
    
    print(f"   챌린지 참여: {room.name}")
    
    # 45일간의 일일 챌린지 기록 생성
    success_count = 0
    failure_count = 0
    cheat_count = 0
    current_streak = 0
    max_streak = 0
    temp_streak = 0
    
    for i in range(45):
        record_date = challenge_start + timedelta(days=i)
        
        # 해당 날짜의 총 칼로리 계산 (실제 식사 기록 기반)
        daily_meals = MealLog.objects.filter(user=user, date=record_date)
        total_calories = sum(meal.calories for meal in daily_meals)
        meal_count = daily_meals.count()
        
        target_calories = room.target_calorie
        tolerance = room.tolerance
        
        # 치팅 데이 (주 1-2회, 10% 확률)
        is_cheat_day = random.random() < 0.1
        if is_cheat_day:
            CheatDayRequest.objects.create(
                user_challenge=user_challenge,
                date=record_date,
                is_approved=True,
                reason="주간 치팅 사용"
            )
            cheat_count += 1
        
        # 성공 여부 판정
        if is_cheat_day:
            is_success = True
        else:
            calorie_in_range = (target_calories - tolerance) <= total_calories <= (target_calories + tolerance)
            meal_count_ok = meal_count >= user_challenge.min_daily_meals
            is_success = calorie_in_range and meal_count_ok
        
        # 일일 기록 생성
        DailyChallengeRecord.objects.create(
            user_challenge=user_challenge,
            date=record_date,
            total_calories=total_calories,
            target_calories=target_calories,
            is_success=is_success,
            is_cheat_day=is_cheat_day,
            meal_count=meal_count
        )
        
        # 통계 업데이트
        if is_success:
            success_count += 1
            temp_streak += 1
            max_streak = max(max_streak, temp_streak)
        else:
            failure_count += 1
            temp_streak = 0
    
    # 현재 연속 성공 계산 (최근 기록부터)
    recent_records = DailyChallengeRecord.objects.filter(
        user_challenge=user_challenge
    ).order_by('-date')[:10]
    
    for record in reversed(recent_records):
        if record.is_success:
            current_streak += 1
        else:
            break
    
    # 챌린지 통계 업데이트
    user_challenge.total_success_days = success_count
    user_challenge.total_failure_days = failure_count
    user_challenge.current_streak_days = current_streak
    user_challenge.max_streak_days = max_streak
    user_challenge.current_weekly_cheat_count = cheat_count % 2  # 이번 주 치팅 사용
    user_challenge.save()
    
    print(f"   45일간 기록: 성공 {success_count}일, 실패 {failure_count}일, 치팅 {cheat_count}일")
    print(f"   현재 연속: {current_streak}일, 최고 연속: {max_streak}일")

def award_badges(user):
    """배지 수여"""
    print("🏅 배지 수여 중...")
    
    user_challenge = UserChallenge.objects.filter(user=user, status='active').first()
    if not user_challenge:
        print("   ❌ 활성 챌린지가 없어 배지를 수여할 수 없습니다.")
        return
    
    # 수여할 배지들
    badge_names = [
        '첫 걸음',           # 1일 연속
        '3일 연속',          # 3일 연속
        '일주일 챔피언',      # 7일 연속
        '꾸준함의 시작',      # 10일 총 성공
        '성실한 도전자'       # 30일 총 성공
    ]
    
    awarded_count = 0
    for badge_name in badge_names:
        try:
            badge = ChallengeBadge.objects.get(name=badge_name)
            user_badge, created = UserChallengeBadge.objects.get_or_create(
                user=user,
                badge=badge,
                defaults={'user_challenge': user_challenge}
            )
            if created:
                awarded_count += 1
                print(f"   ✅ 배지 수여: {badge.name} {badge.icon}")
        except ChallengeBadge.DoesNotExist:
            continue
    
    print(f"   총 {awarded_count}개 배지 수여")

if __name__ == '__main__':
    create_rich_test_account()