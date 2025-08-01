#!/usr/bin/env python
"""
AI 주간 리포트 생성 테스트
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.db.models import Avg, Sum
from api_integrated.models import MealLog, WeightRecord
from api_integrated.views import generate_weekly_report

def test_weekly_report():
    """AI 주간 리포트 생성 테스트"""
    print("🤖 AI 주간 리포트 생성 테스트 시작...")
    
    try:
        # 테스트 사용자
        user = User.objects.get(username='test_user')
        
        # 데이터 수집 (실제 AI 코칭 뷰와 동일한 로직)
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        # 주간 식단 데이터
        weekly_meals = MealLog.objects.filter(user=user, date__gte=week_ago)
        weekly_meal_count = weekly_meals.count()
        
        # 일별 총 칼로리의 평균 계산
        daily_calories = []
        for i in range(7):
            check_date = today - timedelta(days=i)
            day_total = weekly_meals.filter(date=check_date).aggregate(Sum('calories'))['calories__sum'] or 0
            if day_total > 0:
                daily_calories.append(day_total)
        
        weekly_avg_calories = sum(daily_calories) / len(daily_calories) if daily_calories else 0
        
        # 체중 데이터
        recent_weights = WeightRecord.objects.filter(user=user, date__gte=week_ago).order_by('date')
        weight_change = 0
        if recent_weights.count() >= 2:
            weight_change = recent_weights.last().weight - recent_weights.first().weight
        
        print(f"📊 수집된 데이터:")
        print(f"  - 주간 평균 칼로리: {weekly_avg_calories:.1f}kcal")
        print(f"  - 주간 식사 횟수: {weekly_meal_count}회")
        print(f"  - 체중 변화: {weight_change:+.1f}kg")
        
        # AI 주간 리포트 생성
        print(f"\n🤖 AI 주간 리포트 생성 중...")
        report = generate_weekly_report(
            weekly_avg_calories=weekly_avg_calories,
            weekly_meal_count=weekly_meal_count,
            weight_change=weight_change,
            user=user
        )
        
        print(f"\n📝 생성된 주간 리포트:")
        print("=" * 60)
        print(report)
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_weekly_report()
    sys.exit(0 if success else 1)