#!/usr/bin/env python
"""
사용자 데이터 수집 테스트 스크립트
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.db.models import Avg
from api_integrated.models import MealLog, WeightRecord

def test_user_data_collection():
    """사용자 데이터 수집 테스트"""
    print("🧪 사용자 데이터 수집 테스트 시작...")
    
    try:
        # 테스트 사용자 확인
        user = User.objects.get(username='test_user')
        print(f"✅ 테스트 사용자: {user.username}")
        
        # 날짜 설정
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        print(f"📅 기간: {week_ago} ~ {today}")
        
        # 1. 오늘의 식단 데이터
        today_meals = MealLog.objects.filter(user=user, date=today)
        today_total_calories = sum(meal.calories for meal in today_meals)
        today_meal_list = [f"{meal.foodName}({int(meal.calories)}kcal)" for meal in today_meals]
        
        print(f"\n📊 오늘의 식단 데이터:")
        print(f"  - 식사 개수: {today_meals.count()}개")
        print(f"  - 총 칼로리: {today_total_calories}kcal")
        print(f"  - 식사 목록: {today_meal_list}")
        
        # 2. 주간 식단 데이터
        weekly_meals = MealLog.objects.filter(user=user, date__gte=week_ago)
        weekly_meal_count = weekly_meals.count()
        
        # 🔧 일별 총 칼로리의 평균 계산 (개별 식사 평균이 아님)
        from django.db.models import Sum
        daily_calories = []
        for i in range(7):  # 최근 7일
            check_date = today - timedelta(days=i)
            day_total = weekly_meals.filter(date=check_date).aggregate(Sum('calories'))['calories__sum'] or 0
            if day_total > 0:  # 식사 기록이 있는 날만 포함
                daily_calories.append(day_total)
        
        weekly_avg_calories = sum(daily_calories) / len(daily_calories) if daily_calories else 0
        
        print(f"\n📈 주간 식단 데이터:")
        print(f"  - 주간 식사 개수: {weekly_meal_count}개")
        print(f"  - 평균 칼로리: {weekly_avg_calories:.1f}kcal")
        
        # 날짜별 상세 데이터
        print(f"\n📅 날짜별 상세:")
        for i in range(8):  # 오늘 포함 8일
            check_date = today - timedelta(days=i)
            day_meals = MealLog.objects.filter(user=user, date=check_date)
            day_calories = sum(meal.calories for meal in day_meals)
            print(f"  - {check_date}: {day_meals.count()}개 식사, {day_calories}kcal")
        
        # 3. 체중 데이터
        recent_weights = WeightRecord.objects.filter(user=user, date__gte=week_ago).order_by('date')
        weight_change = 0
        if recent_weights.count() >= 2:
            weight_change = recent_weights.last().weight - recent_weights.first().weight
        
        print(f"\n⚖️ 체중 데이터:")
        print(f"  - 체중 기록 개수: {recent_weights.count()}개")
        if recent_weights.count() >= 2:
            print(f"  - 첫 기록: {recent_weights.first().weight}kg ({recent_weights.first().date})")
            print(f"  - 마지막 기록: {recent_weights.last().weight}kg ({recent_weights.last().date})")
            print(f"  - 체중 변화: {weight_change:+.1f}kg")
        else:
            print(f"  - 체중 변화 계산 불가 (기록 부족)")
        
        # 4. AI 코칭에 전달될 데이터 요약
        print(f"\n🤖 AI 코칭에 전달될 데이터:")
        print(f"  - weekly_avg_calories: {weekly_avg_calories:.1f}")
        print(f"  - weekly_meal_count: {weekly_meal_count}")
        print(f"  - weight_change: {weight_change:+.1f}")
        
        # 5. 데이터 품질 검증
        print(f"\n✅ 데이터 품질 검증:")
        if weekly_meal_count > 0:
            print(f"  ✅ 주간 식사 데이터 있음")
        else:
            print(f"  ❌ 주간 식사 데이터 없음")
            
        if weekly_avg_calories > 0:
            print(f"  ✅ 평균 칼로리 계산됨")
        else:
            print(f"  ❌ 평균 칼로리 계산 안됨")
            
        if recent_weights.count() >= 2:
            print(f"  ✅ 체중 변화 계산 가능")
        else:
            print(f"  ⚠️ 체중 변화 계산 불가 (기록 {recent_weights.count()}개)")
        
        return True
        
    except User.DoesNotExist:
        print("❌ 테스트 사용자를 찾을 수 없습니다.")
        return False
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_user_data_collection()
    sys.exit(0 if success else 1)