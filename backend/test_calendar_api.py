#!/usr/bin/env python
import os
import sys
import django
import requests

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog
from django.contrib.auth.models import User
from datetime import date, datetime

print('=== 캘린더 API 테스트 ===')

# 1. MealLog 데이터 확인
print(f'\n1. MealLog 데이터 확인:')
print(f'   총 MealLog 개수: {MealLog.objects.count()}')

# 사용자별 데이터 확인
for user in User.objects.all():
    count = MealLog.objects.filter(user=user).count()
    if count > 0:
        print(f'   {user.username}: {count}개')

# user가 null인 데이터 확인
null_count = MealLog.objects.filter(user__isnull=True).count()
if null_count > 0:
    print(f'   user가 null인 데이터: {null_count}개')

# 2. 최근 MealLog 5개 확인
print(f'\n2. 최근 MealLog 5개:')
recent_meals = MealLog.objects.order_by('-date', '-time')[:5]
for meal in recent_meals:
    user_name = meal.user.username if meal.user else 'None'
    print(f'   {meal.date} {meal.time} - {meal.foodName} ({user_name}) - {meal.calories}kcal')

# 3. 캘린더 API 테스트
print(f'\n3. 캘린더 API 테스트:')
try:
    response = requests.get('http://localhost:8000/api/calendar/data/', timeout=10)
    print(f'   상태 코드: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'   daily_logs 개수: {len(data.get("daily_logs", []))}')
        
        # 식사가 있는 날짜 확인
        meal_days = [log for log in data.get("daily_logs", []) if log.get("meals")]
        print(f'   식사가 있는 날짜: {len(meal_days)}개')
        
        for log in meal_days[:3]:  # 최근 3개만 출력
            print(f'     {log["date"]}: {len(log["meals"])}개 식사')
    else:
        print(f'   에러: {response.text}')
except Exception as e:
    print(f'   API 호출 실패: {e}')

print('\n=== 테스트 완료 ===')