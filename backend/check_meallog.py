#!/usr/bin/env python
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog
from django.contrib.auth.models import User

print('=== MealLog 데이터 확인 ===')
print(f'총 MealLog 개수: {MealLog.objects.count()}')
print('\n사용자별 MealLog:')
for user in User.objects.all():
    count = MealLog.objects.filter(user=user).count()
    print(f'  {user.username}: {count}개')

print('\n최근 MealLog 5개:')
recent_meals = MealLog.objects.order_by('-date', '-time')[:5]
for meal in recent_meals:
    user_name = meal.user.username if meal.user else 'None'
    print(f'  {meal.date} {meal.time} - {meal.foodName} ({user_name})')

print('\nuser가 None인 MealLog:')
null_user_meals = MealLog.objects.filter(user__isnull=True)
print(f'  총 {null_user_meals.count()}개')