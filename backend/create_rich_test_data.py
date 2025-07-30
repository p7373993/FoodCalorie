#!/usr/bin/env python
"""
풍부한 테스트 데이터 생성 스크립트
"""
import os
import sys
import django
from datetime import date, timedelta, datetime
import random

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog, WeightRecord

def create_rich_test_data():
    """풍부한 테스트 데이터 생성"""
    
    # 테스트 사용자 생성 또는 가져오기
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': '테스트',
            'last_name': '사용자'
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ 새 테스트 사용자 생성: {user.username}")
    else:
        print(f"📋 기존 테스트 사용자 사용: {user.username}")
    
    # 기존 데이터 삭제
    MealLog.objects.filter(user=user).delete()
    WeightRecord.objects.filter(user=user).delete()
    print("🗑️ 기존 테스트 데이터 삭제 완료")
    
    # 다양한 한국 음식 데이터
    korean_foods = [
        # 아침 메뉴
        {'name': '계란후라이', 'calories': 180, 'protein': 13, 'carbs': 1, 'fat': 14, 'grade': 'A'},
        {'name': '토스트', 'calories': 250, 'protein': 8, 'carbs': 35, 'fat': 9, 'grade': 'B'},
        {'name': '시리얼', 'calories': 150, 'protein': 3, 'carbs': 30, 'fat': 2, 'grade': 'C'},
        {'name': '요거트', 'calories': 120, 'protein': 10, 'carbs': 15, 'fat': 3, 'grade': 'A'},
        {'name': '오트밀', 'calories': 160, 'protein': 6, 'carbs': 28, 'fat': 3, 'grade': 'A'},
        
        # 점심 메뉴
        {'name': '비빔밥', 'calories': 380, 'protein': 12, 'carbs': 65, 'fat': 8, 'grade': 'B'},
        {'name': '김치찌개', 'calories': 320, 'protein': 18, 'carbs': 25, 'fat': 15, 'grade': 'B'},
        {'name': '불고기', 'calories': 450, 'protein': 35, 'carbs': 15, 'fat': 28, 'grade': 'C'},
        {'name': '된장찌개', 'calories': 150, 'protein': 8, 'carbs': 12, 'fat': 6, 'grade': 'A'},
        {'name': '삼겹살', 'calories': 520, 'protein': 25, 'carbs': 2, 'fat': 45, 'grade': 'D'},
        {'name': '치킨샐러드', 'calories': 280, 'protein': 25, 'carbs': 10, 'fat': 15, 'grade': 'A'},
        {'name': '라면', 'calories': 480, 'protein': 12, 'carbs': 68, 'fat': 18, 'grade': 'D'},
        {'name': '김밥', 'calories': 350, 'protein': 8, 'carbs': 55, 'fat': 12, 'grade': 'C'},
        
        # 저녁 메뉴
        {'name': '생선구이', 'calories': 200, 'protein': 30, 'carbs': 0, 'fat': 8, 'grade': 'A'},
        {'name': '닭가슴살', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 4, 'grade': 'A'},
        {'name': '두부조림', 'calories': 180, 'protein': 15, 'carbs': 8, 'fat': 10, 'grade': 'A'},
        {'name': '갈비탕', 'calories': 420, 'protein': 28, 'carbs': 20, 'fat': 25, 'grade': 'C'},
        {'name': '순두부찌개', 'calories': 220, 'protein': 12, 'carbs': 15, 'fat': 12, 'grade': 'B'},
        
        # 간식
        {'name': '사과', 'calories': 80, 'protein': 0, 'carbs': 21, 'fat': 0, 'grade': 'A'},
        {'name': '바나나', 'calories': 90, 'protein': 1, 'carbs': 23, 'fat': 0, 'grade': 'A'},
        {'name': '견과류', 'calories': 160, 'protein': 6, 'carbs': 6, 'fat': 14, 'grade': 'A'},
        {'name': '과자', 'calories': 250, 'protein': 3, 'carbs': 35, 'fat': 12, 'grade': 'E'},
        {'name': '아이스크림', 'calories': 200, 'protein': 3, 'carbs': 25, 'fat': 10, 'grade': 'E'},
    ]
    
    # 최근 30일간 데이터 생성
    today = date.today()
    meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
    
    meal_count = 0
    for i in range(30):
        current_date = today - timedelta(days=i)
        
        # 하루에 2-4끼 식사 (랜덤)
        daily_meals = random.randint(2, 4)
        
        for meal_idx in range(daily_meals):
            # 식사 타입 결정
            if meal_idx == 0:
                meal_type = 'breakfast'
                food_pool = korean_foods[:5]  # 아침 메뉴
            elif meal_idx == 1:
                meal_type = 'lunch'
                food_pool = korean_foods[5:13]  # 점심 메뉴
            elif meal_idx == 2:
                meal_type = 'dinner'
                food_pool = korean_foods[13:18]  # 저녁 메뉴
            else:
                meal_type = 'snack'
                food_pool = korean_foods[18:]  # 간식
            
            # 랜덤 음식 선택
            food = random.choice(food_pool)
            
            # 약간의 변동성 추가 (±20%)
            variation = random.uniform(0.8, 1.2)
            
            MealLog.objects.create(
                user=user,
                date=current_date,
                mealType=meal_type,
                foodName=food['name'],
                calories=int(food['calories'] * variation),
                protein=round(food['protein'] * variation, 1),
                carbs=round(food['carbs'] * variation, 1),
                fat=round(food['fat'] * variation, 1),
                nutriScore=food['grade'],
                time=f"{random.randint(7, 22):02d}:{random.randint(0, 59):02d}"
            )
            meal_count += 1
    
    print(f"🍽️ {meal_count}개의 식사 기록 생성 완료")
    
    # 체중 데이터 생성 (최근 14일)
    base_weight = 70.0  # 기준 체중
    weight_count = 0
    
    for i in range(14):
        current_date = today - timedelta(days=i)
        
        # 체중 변화 시뮬레이션 (점진적 감소)
        weight_change = -0.1 * i + random.uniform(-0.5, 0.5)
        current_weight = base_weight + weight_change
        
        # 70% 확률로 체중 기록
        if random.random() < 0.7:
            WeightRecord.objects.create(
                user=user,
                weight=round(current_weight, 1),
                date=current_date
            )
            weight_count += 1
    
    print(f"⚖️ {weight_count}개의 체중 기록 생성 완료")
    
    # 통계 출력
    total_calories = MealLog.objects.filter(user=user).aggregate(
        total=django.db.models.Sum('calories')
    )['total']
    avg_daily_calories = total_calories / 30 if total_calories else 0
    
    grade_stats = {}
    for grade in ['A', 'B', 'C', 'D', 'E']:
        count = MealLog.objects.filter(user=user, nutriScore=grade).count()
        grade_stats[grade] = count
    
    print(f"\n📊 생성된 데이터 통계:")
    print(f"   총 칼로리: {total_calories:,}kcal")
    print(f"   일평균 칼로리: {avg_daily_calories:.0f}kcal")
    print(f"   등급별 분포: {grade_stats}")
    print(f"\n✅ 테스트 데이터 생성 완료!")
    print(f"   로그인 정보: username=testuser, password=testpass123")

if __name__ == '__main__':
    create_rich_test_data()