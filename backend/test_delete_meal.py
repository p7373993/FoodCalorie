#!/usr/bin/env python3
"""
식사 기록 삭제 기능 테스트 스크립트
"""

import os
import sys
import django
from django.conf import settings

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog
from datetime import date

def test_delete_meal():
    """식사 기록 삭제 기능 테스트"""
    
    print("=== 식사 기록 삭제 기능 테스트 ===")
    
    # 테스트 사용자 생성 또는 가져오기
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
    
    # 테스트 식사 기록 생성
    meal_log = MealLog.objects.create(
        user=user,
        date=date.today(),
        mealType='lunch',
        foodName='테스트 음식',
        calories=500,
        protein=20,
        carbs=60,
        fat=15,
        nutriScore='B',
        time='12:00:00'
    )
    
    print(f"✅ 테스트 식사 기록 생성: {meal_log.id} - {meal_log.foodName}")
    
    # 삭제 전 확인
    total_before = MealLog.objects.filter(user=user).count()
    print(f"📊 삭제 전 식사 기록 수: {total_before}")
    
    # 식사 기록 삭제
    meal_id = meal_log.id
    meal_name = meal_log.foodName
    meal_log.delete()
    
    print(f"🗑️ 식사 기록 삭제 완료: {meal_id} - {meal_name}")
    
    # 삭제 후 확인
    total_after = MealLog.objects.filter(user=user).count()
    print(f"📊 삭제 후 식사 기록 수: {total_after}")
    
    # 삭제된 기록이 실제로 없는지 확인
    try:
        deleted_meal = MealLog.objects.get(id=meal_id)
        print(f"❌ 오류: 삭제된 기록이 여전히 존재함: {deleted_meal}")
    except MealLog.DoesNotExist:
        print(f"✅ 확인: 식사 기록이 성공적으로 삭제됨")
    
    print(f"✅ 테스트 완료: {total_before - total_after}개 기록 삭제됨")

if __name__ == '__main__':
    test_delete_meal()