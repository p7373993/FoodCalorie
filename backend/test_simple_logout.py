#!/usr/bin/env python3
"""
간단한 로그아웃 API 테스트 (Django shell 방식)
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from accounts.views import LoginView, LogoutView
from accounts.serializers import LoginSerializer
from accounts.services import JWTAuthService
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_logout():
    print("=== 간단한 로그아웃 API 테스트 ===\n")
    
    # 1. 테스트 사용자 확인
    try:
        user = User.objects.get(email='logintest@example.com')
        print(f"✅ 테스트 사용자 발견: {user.email}")
    except User.DoesNotExist:
        print("❌ 테스트 사용자가 없습니다. 먼저 회원가입을 실행하세요.")
        return
    
    # 2. JWT 토큰 생성
    try:
        tokens = JWTAuthService.generate_tokens_with_extended_refresh(user, extend_refresh=False)
        access_token = tokens['access_token']
        refresh_token = tokens['refresh_token']
        print(f"✅ JWT 토큰 생성 성공")
        print(f"   Access Token: {access_token[:50]}...")
        print(f"   Refresh Token: {refresh_token[:50]}...")
    except Exception as e:
        print(f"❌ JWT 토큰 생성 실패: {e}")
        return
    
    print()
    
    # 3. 로그아웃 API 테스트 (Django RequestFactory 사용)
    print("3. 로그아웃 API 테스트...")
    factory = RequestFactory()
    
    # POST 요청 생성
    logout_data = {
        'refresh_token': refresh_token,
        'logout_all_devices': False,
        'redirect_url': 'http://localhost:3000/login'
    }
    
    request = factory.post(
        '/api/auth/logout/',
        data=json.dumps(logout_data),
        content_type='application/json',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )
    
    # 로그아웃 뷰 실행
    logout_view = LogoutView()
    request.user = user  # 인증된 사용자 설정
    
    try:
        response = logout_view.post(request)
        print(f"   응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            result = response.data
            print("✅ 로그아웃 성공!")
            print(f"   메시지: {result['message']}")
            print(f"   블랙리스트 상태: {result['logout_info']['blacklist_status']}")
            print(f"   리다이렉트 URL: {result['logout_info']['redirect_url']}")
            print(f"   전체 기기 로그아웃: {result['logout_info']['logout_all_devices']}")
        else:
            print(f"❌ 로그아웃 실패: {response.status_code}")
            print(f"   응답: {response.data}")
            
    except Exception as e:
        print(f"❌ 로그아웃 API 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== 테스트 완료 ===")

if __name__ == "__main__":
    test_logout() 