#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta, time
import random

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog, WeightRecord
from django.contrib.auth.models import User

def create_dummy_data():
    # xoxoda11111@gmail.com 사용자 생성 또는 가져오기
    user, created = User.objects.get_or_create(
        email='xoxoda11111@gmail.com',
        defaults={
            'username': 'xoxoda1111',
            'first_name': 'Demo',
            'last_name': 'User'
        }
    )
    
    # 비밀번호 설정 (항상 demo1234@로 설정)
    user.set_password('demo1234@')  # 비밀번호: demo1234@
    user.save()
    print(f"🔑 사용자 비밀번호 설정 완료: demo1234")
    
    print(f"사용자: {user.username} ({'생성됨' if created else '기존 사용자'})")
    
    # 기존 데이터 삭제 (선택사항)
    MealLog.objects.filter(user=user).delete()
    WeightRecord.objects.filter(user=user).delete()
    print("기존 데이터 삭제 완료")
    
    # 음식 데이터 정의
    foods = {
        'breakfast': [
            {'name': '토스트', 'calories': 280, 'protein': 8, 'carbs': 45, 'fat': 8, 'score': 'B'},
            {'name': '시리얼', 'calories': 320, 'protein': 6, 'carbs': 65, 'fat': 4, 'score': 'C'},
            {'name': '계란후라이', 'calories': 180, 'protein': 12, 'carbs': 2, 'fat': 14, 'score': 'A'},
            {'name': '오트밀', 'calories': 150, 'protein': 5, 'carbs': 27, 'fat': 3, 'score': 'A'},
            {'name': '베이글', 'calories': 350, 'protein': 12, 'carbs': 68, 'fat': 2, 'score': 'C'},
            {'name': '요거트', 'calories': 120, 'protein': 10, 'carbs': 15, 'fat': 2, 'score': 'A'},
            {'name': '바나나', 'calories': 105, 'protein': 1, 'carbs': 27, 'fat': 0, 'score': 'A'},
            {'name': '커피', 'calories': 5, 'protein': 0, 'carbs': 1, 'fat': 0, 'score': 'A'},
        ],
        'lunch': [
            {'name': '김치찌개', 'calories': 450, 'protein': 25, 'carbs': 35, 'fat': 22, 'score': 'B'},
            {'name': '불고기', 'calories': 520, 'protein': 35, 'carbs': 15, 'fat': 35, 'score': 'B'},
            {'name': '비빔밥', 'calories': 480, 'protein': 18, 'carbs': 75, 'fat': 12, 'score': 'A'},
            {'name': '된장찌개', 'calories': 380, 'protein': 20, 'carbs': 25, 'fat': 18, 'score': 'A'},
            {'name': '치킨샐러드', 'calories': 320, 'protein': 28, 'carbs': 12, 'fat': 18, 'score': 'A'},
            {'name': '파스타', 'calories': 580, 'protein': 20, 'carbs': 85, 'fat': 18, 'score': 'C'},
            {'name': '햄버거', 'calories': 650, 'protein': 25, 'carbs': 45, 'fat': 42, 'score': 'D'},
            {'name': '초밥', 'calories': 420, 'protein': 22, 'carbs': 65, 'fat': 8, 'score': 'B'},
            {'name': '라면', 'calories': 510, 'protein': 12, 'carbs': 68, 'fat': 20, 'score': 'D'},
            {'name': '샌드위치', 'calories': 380, 'protein': 18, 'carbs': 42, 'fat': 16, 'score': 'B'},
        ],
        'dinner': [
            {'name': '삼겹살', 'calories': 720, 'protein': 28, 'carbs': 5, 'fat': 65, 'score': 'C'},
            {'name': '갈비탕', 'calories': 580, 'protein': 32, 'carbs': 25, 'fat': 38, 'score': 'B'},
            {'name': '생선구이', 'calories': 280, 'protein': 35, 'carbs': 2, 'fat': 12, 'score': 'A'},
            {'name': '치킨', 'calories': 620, 'protein': 45, 'carbs': 15, 'fat': 42, 'score': 'C'},
            {'name': '스테이크', 'calories': 680, 'protein': 48, 'carbs': 8, 'fat': 48, 'score': 'B'},
            {'name': '피자', 'calories': 750, 'protein': 28, 'carbs': 85, 'fat': 32, 'score': 'D'},
            {'name': '짜장면', 'calories': 620, 'protein': 18, 'carbs': 95, 'fat': 18, 'score': 'C'},
            {'name': '김치볶음밥', 'calories': 480, 'protein': 15, 'carbs': 68, 'fat': 16, 'score': 'B'},
            {'name': '순두부찌개', 'calories': 320, 'protein': 18, 'carbs': 22, 'fat': 18, 'score': 'A'},
            {'name': '떡볶이', 'calories': 420, 'protein': 8, 'carbs': 78, 'fat': 8, 'score': 'C'},
        ],
        'snack': [
            {'name': '사과', 'calories': 95, 'protein': 0, 'carbs': 25, 'fat': 0, 'score': 'A'},
            {'name': '아이스크림', 'calories': 280, 'protein': 4, 'carbs': 35, 'fat': 14, 'score': 'D'},
            {'name': '과자', 'calories': 150, 'protein': 2, 'carbs': 20, 'fat': 8, 'score': 'D'},
            {'name': '견과류', 'calories': 180, 'protein': 6, 'carbs': 6, 'fat': 16, 'score': 'B'},
            {'name': '요거트', 'calories': 120, 'protein': 10, 'carbs': 15, 'fat': 2, 'score': 'A'},
            {'name': '초콜릿', 'calories': 220, 'protein': 3, 'carbs': 25, 'fat': 12, 'score': 'D'},
            {'name': '쿠키', 'calories': 160, 'protein': 2, 'carbs': 22, 'fat': 8, 'score': 'D'},
            {'name': '치즈', 'calories': 110, 'protein': 7, 'carbs': 1, 'fat': 9, 'score': 'B'},
        ]
    }
    
    # 과거 30일간 데이터 생성
    today = datetime.now().date()
    meal_count = 0
    
    for i in range(30):
        target_date = today - timedelta(days=i)
        
        # 각 날짜마다 랜덤하게 식사 생성 (80% 확률로 각 식사 시간대에 음식 생성)
        for meal_type in ['breakfast', 'lunch', 'dinner', 'snack']:
            if random.random() < 0.8:  # 80% 확률로 식사 생성
                food = random.choice(foods[meal_type])
                
                # 시간 설정
                if meal_type == 'breakfast':
                    meal_time = time(random.randint(7, 9), random.randint(0, 59))
                elif meal_type == 'lunch':
                    meal_time = time(random.randint(12, 14), random.randint(0, 59))
                elif meal_type == 'dinner':
                    meal_time = time(random.randint(18, 20), random.randint(0, 59))
                else:  # snack
                    meal_time = time(random.randint(15, 17), random.randint(0, 59))
                
                # 칼로리에 약간의 변동 추가 (±10%) - 소숫점 없이
                calories_variation = random.uniform(0.9, 1.1)
                adjusted_calories = int(food['calories'] * calories_variation)
                
                meal_log = MealLog.objects.create(
                    user=user,
                    date=target_date,
                    mealType=meal_type,
                    foodName=food['name'],
                    calories=adjusted_calories,
                    protein=int(food['protein'] * calories_variation),
                    carbs=int(food['carbs'] * calories_variation),
                    fat=int(food['fat'] * calories_variation),
                    nutriScore=food['score'],
                    time=meal_time,
                    imageUrl=f'https://picsum.photos/seed/{meal_count}/400/300'
                )
                meal_count += 1
                
                if meal_count % 10 == 0:
                    print(f"생성된 식사 기록: {meal_count}개")
    
    print(f"✅ 총 {meal_count}개의 식사 기록 생성 완료")
    
    # 체중 데이터 생성 (일주일에 2-3번 정도) - 소숫점 없이
    weight_count = 0
    base_weight = 70  # 기본 체중 (정수)
    
    for i in range(30):
        target_date = today - timedelta(days=i)
        
        # 30% 확률로 체중 기록 생성
        if random.random() < 0.3:
            # 체중 변동 (±2kg 범위에서 점진적 변화) - 정수로
            weight_change = random.randint(-2, 1)  # 약간의 체중 감소 트렌드
            weight_value = base_weight + weight_change
            weight_value = max(60, min(85, weight_value))  # 60-85kg 범위 제한
            
            try:
                WeightRecord.objects.create(
                    user=user,
                    weight=weight_value,
                    date=target_date
                )
                weight_count += 1
                base_weight = weight_value  # 다음 기록의 기준점으로 사용
            except:
                pass  # 같은 날짜에 이미 기록이 있으면 무시
    
    print(f"✅ 총 {weight_count}개의 체중 기록 생성 완료")
    
    # 생성된 데이터 요약
    print("\n📊 생성된 데이터 요약:")
    print(f"- 사용자: {user.username}")
    print(f"- 기간: {today - timedelta(days=29)} ~ {today}")
    print(f"- 식사 기록: {meal_count}개")
    print(f"- 체중 기록: {weight_count}개")
    
    # 최근 5일 데이터 확인
    print("\n🔍 최근 5일 식사 기록:")
    recent_meals = MealLog.objects.filter(user=user).order_by('-date', '-time')[:10]
    for meal in recent_meals:
        print(f"  {meal.date} {meal.time} - {meal.mealType}: {meal.foodName} ({meal.calories}kcal)")

if __name__ == '__main__':
    create_dummy_data()