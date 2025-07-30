#!/usr/bin/env python
"""
Gemini AI 코칭 테스트 스크립트
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.ai_coach import AICoachingService

def test_gemini_coaching():
    """Gemini AI 코칭 테스트"""
    print("🤖 Gemini 2.5 Flash AI 코칭 테스트")
    print("=" * 60)
    
    try:
        # 테스트 사용자 가져오기
        user = User.objects.get(username='testuser')
        print(f"👤 테스트 사용자: {user.username}")
        
        # AI 코칭 서비스 초기화
        coaching_service = AICoachingService()
        
        # 1. 일일 코칭 테스트
        print("\n🌅 일일 코칭 테스트:")
        print("-" * 40)
        daily_coaching = coaching_service.generate_daily_coaching(user)
        print(f"💬 AI 코칭: {daily_coaching}")
        
        # 2. 주간 리포트 테스트
        print("\n📊 주간 리포트 테스트:")
        print("-" * 40)
        weekly_report = coaching_service.generate_weekly_report(user)
        print(f"📋 주간 분석: {weekly_report.get('ai_analysis', '분석 실패')}")
        
        # 3. 음식 추천 테스트
        print("\n🍽️ 음식 추천 테스트:")
        print("-" * 40)
        meal_recommendation = coaching_service.generate_meal_recommendation(user, 'lunch')
        if 'recommendations' in meal_recommendation:
            for i, rec in enumerate(meal_recommendation['recommendations'], 1):
                print(f"  {i}. {rec['name']} ({rec['calories']}kcal) - {rec['reason']}")
        else:
            print(f"🍽️ 추천 결과: {meal_recommendation}")
        
        print("\n" + "=" * 60)
        print("✅ Gemini AI 테스트 완료!")
        
    except User.DoesNotExist:
        print("❌ testuser를 찾을 수 없습니다.")
        print("먼저 'python test_api.py' 명령을 실행하세요.")
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")

if __name__ == '__main__':
    test_gemini_coaching()