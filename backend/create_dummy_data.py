#!/usr/bin/env python
"""
테스트용 더미 데이터 생성 스크립트
대시보드 그래프 테스트를 위한 식사 기록 데이터를 생성합니다.
"""

import os
import sys
import django
from datetime import datetime, timedelta, date

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.db.models import Sum
from api_integrated.models import MealLog

def create_test_user():
    """테스트 사용자 생성 또는 가져오기"""
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ 테스트 사용자 생성: {user.username}")
    else:
        print(f"✅ 기존 테스트 사용자 사용: {user.username}")
    return user

def create_weekly_meal_data(user):
    """주간 식사 데이터 생성"""
    today = date.today()
    
    # 최근 7일간의 다양한 칼로리 데이터 생성
    meal_data = [
        # 날짜, 음식명, 칼로리, 식사타입
        (today - timedelta(days=6), "아침식사", 450, "breakfast"),
        (today - timedelta(days=6), "점심식사", 650, "lunch"),
        (today - timedelta(days=6), "저녁식사", 550, "dinner"),
        
        (today - timedelta(days=5), "아침식사", 380, "breakfast"),
        (today - timedelta(days=5), "점심식사", 720, "lunch"),
        (today - timedelta(days=5), "간식", 150, "snack"),
        (today - timedelta(days=5), "저녁식사", 480, "dinner"),
        
        (today - timedelta(days=4), "아침식사", 420, "breakfast"),
        (today - timedelta(days=4), "점심식사", 680, "lunch"),
        (today - timedelta(days=4), "저녁식사", 520, "dinner"),
        
        (today - timedelta(days=3), "아침식사", 350, "breakfast"),
        (today - timedelta(days=3), "점심식사", 750, "lunch"),
        (today - timedelta(days=3), "간식", 200, "snack"),
        (today - timedelta(days=3), "저녁식사", 600, "dinner"),
        
        (today - timedelta(days=2), "아침식사", 400, "breakfast"),
        (today - timedelta(days=2), "점심식사", 700, "lunch"),
        (today - timedelta(days=2), "저녁식사", 580, "dinner"),
        
        (today - timedelta(days=1), "아침식사", 380, "breakfast"),
        (today - timedelta(days=1), "점심식사", 650, "lunch"),
        (today - timedelta(days=1), "간식", 180, "snack"),
        (today - timedelta(days=1), "저녁식사", 520, "dinner"),
        
        # 오늘은 일부만 기록 (실제 상황 시뮬레이션)
        (today, "아침식사", 420, "breakfast"),
        (today, "점심식사", 680, "lunch"),
    ]
    
    created_count = 0
    for meal_date, food_name, calories, meal_type in meal_data:
        # 이미 존재하는지 확인
        existing = MealLog.objects.filter(
            user=user,
            date=meal_date,
            mealType=meal_type
        ).first()
        
        if not existing:
            meal = MealLog.objects.create(
                user=user,
                date=meal_date,
                mealType=meal_type,
                foodName=food_name,
                calories=calories,
                carbs=calories * 0.6 / 4,  # 탄수화물 60% 가정
                protein=calories * 0.2 / 4,  # 단백질 20% 가정
                fat=calories * 0.2 / 9,      # 지방 20% 가정
                nutriScore='B',
                time=datetime.strptime('12:00', '%H:%M').time()
            )
            created_count += 1
            print(f"🍽️ {meal_date} {meal_type}: {food_name} ({calories}kcal)")
    
    print(f"\n✅ 총 {created_count}개의 식사 기록이 생성되었습니다.")
    
    # 주간 통계 출력
    week_start = today - timedelta(days=6)
    weekly_stats = MealLog.objects.filter(
        user=user,
        date__range=[week_start, today]
    ).values('date').annotate(
        daily_calories=Sum('calories')
    ).order_by('date')
    
    print(f"\n📊 주간 칼로리 통계:")
    for stat in weekly_stats:
        print(f"   {stat['date']}: {stat['daily_calories']}kcal")

def main():
    """메인 함수"""
    print("🚀 테스트 데이터 생성 시작...")
    
    try:
        # 테스트 사용자 생성
        user = create_test_user()
        
        # 기존 테스트 데이터 삭제 (선택사항)
        if len(sys.argv) > 1 and sys.argv[1] == '--clean':
            deleted_count = MealLog.objects.filter(user=user).delete()[0]
            print(f"🗑️ 기존 테스트 데이터 {deleted_count}개 삭제")
        
        # 주간 식사 데이터 생성
        create_weekly_meal_data(user)
        
        print("\n🎉 테스트 데이터 생성 완료!")
        print("이제 대시보드에서 그래프를 확인해보세요.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()