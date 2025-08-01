#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test account creation with 30 days meal data and 7 days weight data
Today only breakfast is recorded
"""

import os
import sys
import django
from datetime import datetime, timedelta, date
from django.contrib.auth.models import User
import random

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog, WeightRecord

def create_test_user():
    """테스트 사용자 생성 또는 가져오기"""
    username = 'testuser30days'
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': 'testuser30days@example.com',
            'first_name': '테스트',
            'last_name': '사용자'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ 새 테스트 사용자 생성: {user.username}")
    else:
        print(f"✅ 기존 테스트 사용자 사용: {user.username}")
    return user

def create_30days_meal_data(user):
    """30일치 식사 데이터 생성 (소숫점 없이)"""
    today = date.today()
    
    # 한국 음식 리스트
    korean_foods = [
        ("김치찌개", 350), ("된장찌개", 280), ("불고기", 420), ("비빔밥", 480),
        ("냉면", 380), ("삼겹살", 520), ("갈비탕", 450), ("김밥", 320),
        ("라면", 400), ("치킨", 580), ("피자", 650), ("햄버거", 550),
        ("짜장면", 480), ("짬뽕", 520), ("탕수육", 600), ("볶음밥", 420),
        ("순두부찌개", 250), ("갈비찜", 480), ("닭갈비", 380), ("떡볶이", 320),
        ("오므라이스", 450), ("돈까스", 520), ("생선구이", 280), ("나물반찬", 150),
        ("계란말이", 180), ("토스트", 250), ("샐러드", 200), ("과일", 120),
        ("요거트", 100), ("견과류", 180)
    ]
    
    created_count = 0
    
    for i in range(30):
        meal_date = today - timedelta(days=29-i)
        
        # 오늘은 아침만
        if i == 29:  # 오늘
            food_name, base_calories = random.choice(korean_foods[:10])  # 아침 적합한 음식
            calories = int(base_calories * random.uniform(0.8, 1.2))  # 소숫점 없이
            
            meal = MealLog.objects.create(
                user=user,
                date=meal_date,
                mealType='breakfast',
                foodName=f"아침 {food_name}",
                calories=calories,
                carbs=int(calories * 0.6 / 4),
                protein=int(calories * 0.2 / 4),
                fat=int(calories * 0.2 / 9),
                nutriScore=random.choice(['A', 'B', 'C']),
                time=datetime.strptime(f"{random.randint(7,9)}:{random.randint(0,59):02d}", '%H:%M').time()
            )
            created_count += 1
            print(f"🍽️ {meal_date} 아침: {food_name} ({calories}kcal)")
        else:
            # 다른 날들은 하루 2-4끼
            meals_per_day = random.randint(2, 4)
            meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
            selected_meals = random.sample(meal_types, meals_per_day)
            
            for meal_type in selected_meals:
                food_name, base_calories = random.choice(korean_foods)
                
                # 식사 타입별 칼로리 조정
                if meal_type == 'breakfast':
                    calories = int(base_calories * random.uniform(0.7, 1.0))
                    time_hour = random.randint(7, 9)
                elif meal_type == 'lunch':
                    calories = int(base_calories * random.uniform(1.0, 1.3))
                    time_hour = random.randint(12, 14)
                elif meal_type == 'dinner':
                    calories = int(base_calories * random.uniform(0.9, 1.2))
                    time_hour = random.randint(18, 20)
                else:  # snack
                    calories = int(base_calories * random.uniform(0.3, 0.6))
                    time_hour = random.randint(15, 17)
                
                meal_name_prefix = {
                    'breakfast': '아침',
                    'lunch': '점심', 
                    'dinner': '저녁',
                    'snack': '간식'
                }
                
                meal = MealLog.objects.create(
                    user=user,
                    date=meal_date,
                    mealType=meal_type,
                    foodName=f"{meal_name_prefix[meal_type]} {food_name}",
                    calories=calories,
                    carbs=int(calories * 0.6 / 4),
                    protein=int(calories * 0.2 / 4),
                    fat=int(calories * 0.2 / 9),
                    nutriScore=random.choice(['A', 'B', 'C', 'D']),
                    time=datetime.strptime(f"{time_hour}:{random.randint(0,59):02d}", '%H:%M').time()
                )
                created_count += 1
    
    print(f"\n✅ 총 {created_count}개의 식사 기록이 생성되었습니다.")

def create_weekly_weight_data(user):
    """일주일치 체중 데이터 생성 (소숫점 없이)"""
    today = date.today()
    base_weight = random.randint(60, 80)  # 기본 체중 60-80kg
    
    created_count = 0
    
    for i in range(7):
        weight_date = today - timedelta(days=6-i)
        
        # 체중 변화 (±2kg 범위에서 자연스럽게)
        if i == 0:
            weight = base_weight
        else:
            # 이전 체중에서 ±1kg 범위로 변화
            weight_change = random.randint(-1, 1)
            weight = max(50, min(100, base_weight + weight_change))
            base_weight = weight
        
        # 기존 기록이 있는지 확인
        existing = WeightRecord.objects.filter(user=user, date=weight_date).first()
        if not existing:
            weight_record = WeightRecord.objects.create(
                user=user,
                weight=weight,
                date=weight_date
            )
            created_count += 1
            print(f"⚖️ {weight_date}: {weight}kg")
    
    print(f"\n✅ 총 {created_count}개의 체중 기록이 생성되었습니다.")

def main():
    """메인 함수"""
    print("🚀 30일치 식사 데이터 및 일주일치 체중 데이터 생성 시작...")
    
    try:
        # 테스트 사용자 생성
        user = create_test_user()
        
        # 기존 데이터 삭제 옵션
        if len(sys.argv) > 1 and sys.argv[1] == '--clean':
            meal_deleted = MealLog.objects.filter(user=user).delete()[0]
            weight_deleted = WeightRecord.objects.filter(user=user).delete()[0]
            print(f"🗑️ 기존 식사 데이터 {meal_deleted}개, 체중 데이터 {weight_deleted}개 삭제")
        
        # 30일치 식사 데이터 생성
        create_30days_meal_data(user)
        
        # 일주일치 체중 데이터 생성
        create_weekly_weight_data(user)
        
        print(f"\n🎉 테스트 데이터 생성 완료!")
        print(f"사용자명: {user.username}")
        print(f"비밀번호: testpass123")
        print("오늘은 아침만 먹은 것으로 설정되었습니다.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()