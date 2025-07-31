#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Add various test data to existing xoxoda@naver.com account
- 30 days meal data
- 7 days weight data  
- Challenge participation data
- Calendar event data
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
from challenges.models import Challenge, UserChallenge
from calender.models import CalendarEvent

def get_existing_user():
    """기존 xoxoda@naver.com 사용자 가져오기"""
    try:
        user = User.objects.get(email='xoxoda@naver.com')
        print(f"✅ 기존 사용자 찾음: {user.username} ({user.email})")
        return user
    except User.DoesNotExist:
        print("❌ xoxoda@naver.com 사용자를 찾을 수 없습니다.")
        sys.exit(1)

def add_meal_data(user):
    """30일치 다양한 식사 데이터 추가"""
    today = date.today()
    
    # 한국 음식 리스트 (더 다양하게)
    korean_foods = [
        # 한식
        ("김치찌개", 350), ("된장찌개", 280), ("불고기", 420), ("비빔밥", 480),
        ("냉면", 380), ("삼겹살", 520), ("갈비탕", 450), ("김밥", 320),
        ("순두부찌개", 250), ("갈비찜", 480), ("닭갈비", 380), ("떡볶이", 320),
        ("잡채", 280), ("bulgogi", 420), ("kimchi", 50), ("bibimbap", 480),
        
        # 중식/일식
        ("짜장면", 480), ("짬뽕", 520), ("탕수육", 600), ("볶음밥", 420),
        ("초밥", 350), ("라멘", 450), ("우동", 380), ("돈까스", 520),
        
        # 양식
        ("스테이크", 650), ("파스타", 520), ("피자", 650), ("햄버거", 550),
        ("샐러드", 200), ("샌드위치", 380), ("오므라이스", 450),
        
        # 간식/디저트
        ("과일", 120), ("요거트", 100), ("견과류", 180), ("아이스크림", 250),
        ("케이크", 350), ("쿠키", 150), ("초콜릿", 200),
        
        # 음료
        ("커피", 50), ("녹차", 5), ("주스", 120), ("스무디", 180)
    ]
    
    created_count = 0
    
    # 기존 데이터 삭제 여부 확인
    existing_meals = MealLog.objects.filter(user=user).count()
    if existing_meals > 0:
        print(f"⚠️ 기존 식사 데이터 {existing_meals}개가 있습니다.")
        response = input("기존 데이터를 삭제하고 새로 생성하시겠습니까? (y/N): ")
        if response.lower() == 'y':
            deleted_count = MealLog.objects.filter(user=user).delete()[0]
            print(f"🗑️ 기존 식사 데이터 {deleted_count}개 삭제")
    
    for i in range(30):
        meal_date = today - timedelta(days=29-i)
        
        # 하루 2-4끼 랜덤
        meals_per_day = random.randint(2, 4)
        meal_types = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
        selected_meals = random.sample(meal_types, meals_per_day)
        
        for meal_type in selected_meals:
            food_name, base_calories = random.choice(korean_foods)
            
            # 식사 타입별 칼로리 및 시간 조정
            if meal_type == 'Breakfast':
                calories = int(base_calories * random.uniform(0.7, 1.0))
                time_hour = random.randint(7, 9)
                prefix = "아침"
            elif meal_type == 'Lunch':
                calories = int(base_calories * random.uniform(1.0, 1.3))
                time_hour = random.randint(12, 14)
                prefix = "점심"
            elif meal_type == 'Dinner':
                calories = int(base_calories * random.uniform(0.9, 1.2))
                time_hour = random.randint(18, 20)
                prefix = "저녁"
            else:  # Snack
                calories = int(base_calories * random.uniform(0.3, 0.6))
                time_hour = random.randint(15, 17)
                prefix = "간식"
            
            meal = MealLog.objects.create(
                user=user,
                date=meal_date,
                mealType=meal_type,
                foodName=f"{prefix} {food_name}",
                calories=calories,
                carbs=int(calories * 0.6 / 4),
                protein=int(calories * 0.2 / 4),
                fat=int(calories * 0.2 / 9),
                nutriScore=random.choice(['A', 'B', 'C', 'D', 'E']),
                time=datetime.strptime(f"{time_hour}:{random.randint(0,59):02d}", '%H:%M').time()
            )
            created_count += 1
    
    print(f"✅ 총 {created_count}개의 식사 기록이 생성되었습니다.")

def add_weight_data(user):
    """7일치 체중 데이터 추가"""
    today = date.today()
    base_weight = 70  # 기본 체중
    
    created_count = 0
    
    # 기존 데이터 확인
    existing_weights = WeightRecord.objects.filter(user=user).count()
    if existing_weights > 0:
        print(f"⚠️ 기존 체중 데이터 {existing_weights}개가 있습니다.")
        response = input("기존 데이터를 삭제하고 새로 생성하시겠습니까? (y/N): ")
        if response.lower() == 'y':
            deleted_count = WeightRecord.objects.filter(user=user).delete()[0]
            print(f"🗑️ 기존 체중 데이터 {deleted_count}개 삭제")
    
    for i in range(14):  # 2주치 데이터
        weight_date = today - timedelta(days=13-i)
        
        # 자연스러운 체중 변화
        weight_change = random.uniform(-0.5, 0.5)
        weight = round(base_weight + weight_change, 1)
        base_weight = weight
        
        # 기존 기록이 없는 경우만 생성
        if not WeightRecord.objects.filter(user=user, date=weight_date).exists():
            weight_record = WeightRecord.objects.create(
                user=user,
                weight=weight,
                date=weight_date
            )
            created_count += 1
            print(f"⚖️ {weight_date}: {weight}kg")
    
    print(f"✅ 총 {created_count}개의 체중 기록이 생성되었습니다.")

def add_challenge_data(user):
    """챌린지 참여 데이터 추가"""
    try:
        # 기존 챌린지들 가져오기
        challenges = Challenge.objects.all()[:3]  # 최대 3개 챌린지
        
        created_count = 0
        for challenge in challenges:
            # 이미 참여 중인지 확인
            if not UserChallenge.objects.filter(user=user, challenge=challenge).exists():
                user_challenge = UserChallenge.objects.create(
                    user=user,
                    challenge=challenge,
                    progress=random.randint(0, 80),  # 0-80% 진행률
                    joined_at=datetime.now() - timedelta(days=random.randint(1, 10))
                )
                created_count += 1
                print(f"🏆 챌린지 참여: {challenge.title} (진행률: {user_challenge.progress}%)")
        
        print(f"✅ 총 {created_count}개의 챌린지에 참여했습니다.")
        
    except Exception as e:
        print(f"⚠️ 챌린지 데이터 추가 중 오류: {e}")

def add_calendar_events(user):
    """캘린더 이벤트 데이터 추가"""
    try:
        today = date.today()
        events = [
            ("운동 계획", "헬스장 가기", "2025-08-01"),
            ("식단 관리", "저칼로리 식단 시작", "2025-08-02"),
            ("건강 검진", "정기 건강 검진 예약", "2025-08-05"),
            ("요가 수업", "요가 클래스 참여", "2025-08-07"),
            ("다이어트 목표", "목표 체중 달성하기", "2025-08-10"),
        ]
        
        created_count = 0
        for title, description, event_date in events:
            event_datetime = datetime.strptime(f"{event_date} 10:00", "%Y-%m-%d %H:%M")
            
            if not CalendarEvent.objects.filter(user=user, title=title, date=event_datetime.date()).exists():
                calendar_event = CalendarEvent.objects.create(
                    user=user,
                    title=title,
                    description=description,
                    date=event_datetime.date(),
                    time=event_datetime.time(),
                    category='health'
                )
                created_count += 1
                print(f"📅 이벤트 추가: {title} ({event_date})")
        
        print(f"✅ 총 {created_count}개의 캘린더 이벤트가 생성되었습니다.")
        
    except Exception as e:
        print(f"⚠️ 캘린더 이벤트 추가 중 오류: {e}")

def main():
    """메인 함수"""
    print("🚀 xoxoda@naver.com 계정에 다양한 테스트 데이터 추가 시작...")
    
    try:
        # 기존 사용자 가져오기
        user = get_existing_user()
        
        print("\n📊 추가할 데이터 종류:")
        print("1. 30일치 식사 데이터")
        print("2. 14일치 체중 데이터")
        print("3. 챌린지 참여 데이터")
        print("4. 캘린더 이벤트 데이터")
        
        # 식사 데이터 추가
        print("\n🍽️ 식사 데이터 추가 중...")
        add_meal_data(user)
        
        # 체중 데이터 추가
        print("\n⚖️ 체중 데이터 추가 중...")
        add_weight_data(user)
        
        # 챌린지 데이터 추가
        print("\n🏆 챌린지 데이터 추가 중...")
        add_challenge_data(user)
        
        # 캘린더 이벤트 추가
        print("\n📅 캘린더 이벤트 추가 중...")
        add_calendar_events(user)
        
        print(f"\n🎉 {user.email} 계정에 테스트 데이터 추가 완료!")
        print("이제 대시보드와 캘린더에서 다양한 데이터를 확인할 수 있습니다.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()