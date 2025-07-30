#!/usr/bin/env python
"""
백엔드 API 테스트 스크립트
"""
import os
import sys
import django
from datetime import datetime, date, timedelta

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog, WeightRecord
try:
    from rest_framework.authtoken.models import Token
except ImportError:
    Token = None

def create_test_user():
    """테스트 사용자 생성"""
    try:
        user = User.objects.get(username='testuser')
        print(f"✅ 기존 테스트 사용자 사용: {user.username}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        print(f"✅ 새 테스트 사용자 생성: {user.username}")
    
    # 토큰 생성 (가능한 경우)
    if Token:
        try:
            token, created = Token.objects.get_or_create(user=user)
            print(f"🔑 사용자 토큰: {token.key}")
        except Exception as e:
            print(f"⚠️ 토큰 생성 실패: {e}")
    else:
        print("⚠️ Token 모델을 사용할 수 없습니다.")
    
    return user

def create_test_meal_logs(user):
    """테스트 식사 기록 생성"""
    print("\n📝 테스트 식사 기록 생성 중...")
    
    # 기존 기록 삭제
    MealLog.objects.filter(user=user).delete()
    
    # 최근 7일간의 테스트 데이터 생성
    today = date.today()
    
    test_meals = [
        # 오늘
        {'date': today, 'mealType': 'breakfast', 'foodName': '계란후라이', 'calories': 180, 'carbs': 2, 'protein': 12, 'fat': 14, 'nutriScore': 'B'},
        {'date': today, 'mealType': 'lunch', 'foodName': '김치찌개', 'calories': 320, 'carbs': 15, 'protein': 18, 'fat': 22, 'nutriScore': 'B'},
        {'date': today, 'mealType': 'dinner', 'foodName': '불고기', 'calories': 450, 'carbs': 8, 'protein': 35, 'fat': 28, 'nutriScore': 'C'},
        
        # 어제
        {'date': today - timedelta(days=1), 'mealType': 'breakfast', 'foodName': '토스트', 'calories': 250, 'carbs': 35, 'protein': 8, 'fat': 9, 'nutriScore': 'C'},
        {'date': today - timedelta(days=1), 'mealType': 'lunch', 'foodName': '비빔밥', 'calories': 380, 'carbs': 55, 'protein': 15, 'fat': 12, 'nutriScore': 'B'},
        {'date': today - timedelta(days=1), 'mealType': 'dinner', 'foodName': '삼겹살', 'calories': 520, 'carbs': 3, 'protein': 25, 'fat': 45, 'nutriScore': 'D'},
        
        # 2일 전
        {'date': today - timedelta(days=2), 'mealType': 'breakfast', 'foodName': '시리얼', 'calories': 200, 'carbs': 40, 'protein': 6, 'fat': 3, 'nutriScore': 'B'},
        {'date': today - timedelta(days=2), 'mealType': 'lunch', 'foodName': '라면', 'calories': 480, 'carbs': 65, 'protein': 12, 'fat': 18, 'nutriScore': 'D'},
        {'date': today - timedelta(days=2), 'mealType': 'snack', 'foodName': '사과', 'calories': 80, 'carbs': 20, 'protein': 0, 'fat': 0, 'nutriScore': 'A'},
        
        # 3일 전
        {'date': today - timedelta(days=3), 'mealType': 'breakfast', 'foodName': '요거트', 'calories': 120, 'carbs': 18, 'protein': 8, 'fat': 2, 'nutriScore': 'A'},
        {'date': today - timedelta(days=3), 'mealType': 'lunch', 'foodName': '치킨샐러드', 'calories': 280, 'carbs': 12, 'protein': 25, 'fat': 15, 'nutriScore': 'B'},
        {'date': today - timedelta(days=3), 'mealType': 'dinner', 'foodName': '스테이크', 'calories': 600, 'carbs': 5, 'protein': 45, 'fat': 42, 'nutriScore': 'D'},
    ]
    
    created_count = 0
    for meal_data in test_meals:
        meal_log = MealLog.objects.create(
            user=user,
            date=meal_data['date'],
            mealType=meal_data['mealType'],
            foodName=meal_data['foodName'],
            calories=meal_data['calories'],
            carbs=meal_data['carbs'],
            protein=meal_data['protein'],
            fat=meal_data['fat'],
            nutriScore=meal_data['nutriScore'],
            time=datetime.now().time()
        )
        created_count += 1
        print(f"  📅 {meal_data['date']} {meal_data['mealType']}: {meal_data['foodName']} ({meal_data['calories']}kcal)")
    
    print(f"✅ {created_count}개의 테스트 식사 기록 생성 완료")

def create_test_weight_records(user):
    """테스트 체중 기록 생성"""
    print("\n⚖️ 테스트 체중 기록 생성 중...")
    
    # 기존 기록 삭제
    WeightRecord.objects.filter(user=user).delete()
    
    today = date.today()
    base_weight = 70.0
    
    # 최근 10일간의 체중 기록 생성 (약간의 변동)
    for i in range(10):
        record_date = today - timedelta(days=i)
        # 체중 변동 시뮬레이션 (±1kg 범위)
        weight_variation = (i % 3 - 1) * 0.3  # -0.3, 0, 0.3 패턴
        weight = base_weight + weight_variation
        
        weight_record = WeightRecord.objects.create(
            user=user,
            date=record_date,
            weight=round(weight, 1)
        )
        print(f"  📅 {record_date}: {weight}kg")
    
    print(f"✅ 10개의 테스트 체중 기록 생성 완료")

def test_api_endpoints():
    """API 엔드포인트 테스트"""
    print("\n🔍 API 엔드포인트 테스트...")
    
    import requests
    
    base_url = 'http://localhost:8000/api'
    
    # 1. 대시보드 데이터 테스트
    try:
        response = requests.get(f'{base_url}/dashboard/data/')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 대시보드 API: 주간 칼로리 {len(data.get('weekly_calories', {}).get('days', []))}일")
        else:
            print(f"❌ 대시보드 API 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 대시보드 API 오류: {e}")
    
    # 2. 식사 기록 조회 테스트
    try:
        response = requests.get(f'{base_url}/logs/')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 식사 기록 API: {len(data.get('results', []))}개 기록")
        else:
            print(f"❌ 식사 기록 API 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 식사 기록 API 오류: {e}")
    
    # 3. 체중 기록 테스트
    try:
        response = requests.get(f'{base_url}/weight/')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 체중 기록 API: {len(data.get('records', []))}개 기록")
        else:
            print(f"❌ 체중 기록 API 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 체중 기록 API 오류: {e}")

def main():
    """메인 함수"""
    print("🚀 백엔드 API 테스트 시작")
    print("=" * 50)
    
    # 1. 테스트 사용자 생성
    user = create_test_user()
    
    # 2. 테스트 데이터 생성
    create_test_meal_logs(user)
    create_test_weight_records(user)
    
    # 3. API 테스트 (서버가 실행 중인 경우)
    print("\n⚠️ 서버가 실행 중이면 API 테스트를 진행합니다...")
    print("서버 실행: python manage.py runserver")
    
    print("\n✅ 테스트 데이터 생성 완료!")
    print("=" * 50)
    print("🌐 프론트엔드에서 다음 계정으로 로그인하세요:")
    print(f"   이메일: test@example.com")
    print(f"   비밀번호: testpass123")
    print("=" * 50)

if __name__ == '__main__':
    main()