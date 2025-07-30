#!/usr/bin/env python
"""
사용자 계정 확인 스크립트
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog, WeightRecord

def check_users():
    """사용자 계정 확인"""
    print("🔍 테스트 계정 확인")
    print("=" * 60)
    
    users = User.objects.all()
    
    if not users.exists():
        print("❌ 등록된 사용자가 없습니다.")
        print("\n📝 테스트 계정을 생성하려면:")
        print("   python test_api.py")
        print("   또는")
        print("   python manage.py create_sample_data --users 2 --days 10")
        return
    
    for user in users:
        print(f"\n👤 사용자: {user.username}")
        print(f"   📧 이메일: {user.email}")
        print(f"   📅 가입일: {user.date_joined.strftime('%Y-%m-%d %H:%M')}")
        
        # 식사 기록 수 확인
        meal_count = MealLog.objects.filter(user=user).count()
        print(f"   🍽️ 식사 기록: {meal_count}개")
        
        # 체중 기록 수 확인
        weight_count = WeightRecord.objects.filter(user=user).count()
        print(f"   ⚖️ 체중 기록: {weight_count}개")
        
        # 최근 식사 기록
        recent_meals = MealLog.objects.filter(user=user).order_by('-date', '-time')[:3]
        if recent_meals:
            print(f"   📋 최근 식사:")
            for meal in recent_meals:
                print(f"      - {meal.date} {meal.mealType}: {meal.foodName} ({meal.calories}kcal)")
    
    print("\n" + "=" * 60)
    print("🌐 프론트엔드 로그인 정보:")
    print("=" * 60)
    
    # 주요 테스트 계정들 표시
    test_accounts = [
        {'username': 'testuser', 'email': 'test@example.com', 'password': 'testpass123'},
        {'username': 'sampleuser1', 'email': 'sample1@example.com', 'password': 'samplepass123'},
        {'username': 'sampleuser2', 'email': 'sample2@example.com', 'password': 'samplepass123'},
    ]
    
    for account in test_accounts:
        if User.objects.filter(username=account['username']).exists():
            print(f"✅ {account['username']}")
            print(f"   📧 이메일: {account['email']}")
            print(f"   🔑 비밀번호: {account['password']}")
            print()
    
    print("💡 추천 계정: testuser (가장 많은 테스트 데이터)")
    print("💡 백업 계정: sampleuser1, sampleuser2")

if __name__ == '__main__':
    check_users()