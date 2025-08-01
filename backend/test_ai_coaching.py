#!/usr/bin/env python
"""
AI 코칭 API 테스트 스크립트
"""

import os
import sys
import django
import requests
from datetime import datetime

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog

def test_ai_coaching_api():
    """AI 코칭 API 테스트"""
    print("🧪 AI 코칭 API 테스트 시작...")
    
    try:
        # 테스트 사용자 확인
        user = User.objects.get(username='test_user')
        print(f"✅ 테스트 사용자 확인: {user.username}")
        
        # 테스트 데이터 준비
        test_data = {
            'type': 'detailed_meal_analysis',
            'meal_data': {
                'food_name': '돈까스',
                'calories': 650,
                'protein': 25,
                'carbs': 45,
                'fat': 35,
                'mass': 200,
                'grade': 'C',
                'confidence': 0.8
            }
        }
        
        print(f"📤 요청 데이터: {test_data}")
        
        # API 호출 (직접 함수 호출)
        from api_integrated.views import ai_coaching_view
        from django.test import RequestFactory
        from django.contrib.auth import get_user_model
        
        factory = RequestFactory()
        request = factory.post('/api/ai/coaching/', 
                             data=test_data, 
                             content_type='application/json')
        request.user = user
        
        # 뷰 함수 직접 호출
        response = ai_coaching_view(request)
        
        print(f"📥 응답 상태: {response.status_code}")
        print(f"📥 응답 데이터: {response.data}")
        
        if response.status_code == 200:
            print("✅ AI 코칭 API 테스트 성공!")
            return True
        else:
            print(f"❌ AI 코칭 API 테스트 실패: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_ai_coaching_api()
    sys.exit(0 if success else 1)