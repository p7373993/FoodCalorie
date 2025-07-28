#!/usr/bin/env python3
"""
비밀번호 관리 API 테스트 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from accounts.views import PasswordChangeView, PasswordResetRequestView, PasswordResetConfirmView
from accounts.serializers import LoginSerializer, PasswordChangeSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from accounts.services import JWTAuthService, PasswordResetService
from accounts.models import PasswordResetToken
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_password_api():
    print("=== 비밀번호 관리 API 테스트 ===\n")
    
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
        print(f"✅ JWT 토큰 생성 성공")
    except Exception as e:
        print(f"❌ JWT 토큰 생성 실패: {e}")
        return
    
    print()
    
    # 3. 비밀번호 변경 API 테스트
    print("3. 비밀번호 변경 API 테스트...")
    factory = APIRequestFactory()
    
    # 3-1. 잘못된 현재 비밀번호로 변경 시도
    wrong_password_data = {
        'current_password': 'wrongpassword',
        'new_password': 'newpassword123!',
        'new_password_confirm': 'newpassword123!'
    }
    
    request = factory.put(
        '/api/auth/password/change/',
        data=json.dumps(wrong_password_data),
        content_type='application/json',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )
    request.user = user
    
    password_change_view = PasswordChangeView()
    try:
        response = password_change_view.put(request)
        print(f"   잘못된 현재 비밀번호 테스트: {response.status_code}")
        if response.status_code == 400:
            result = response.data
            print(f"   ✅ 올바른 거부: {result['message']}")
        else:
            print(f"   ❌ 예상과 다른 응답: {response.data}")
    except Exception as e:
        print(f"   ❌ 비밀번호 변경 오류: {e}")
    
    # 3-2. 올바른 비밀번호로 변경
    correct_password_data = {
        'current_password': 'testpassword123',  # 기존 비밀번호
        'new_password': 'newpassword456!',
        'new_password_confirm': 'newpassword456!'
    }
    
    request = factory.put(
        '/api/auth/password/change/',
        data=json.dumps(correct_password_data),
        content_type='application/json',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )
    request.user = user
    
    try:
        response = password_change_view.put(request)
        print(f"   올바른 비밀번호 변경 테스트: {response.status_code}")
        if response.status_code == 200:
            result = response.data
            print(f"   ✅ 비밀번호 변경 성공: {result['message']}")
            print(f"   새 토큰 발급: {result['security_info']['new_tokens_issued']}")
            print(f"   모든 세션 무효화: {result['security_info']['all_sessions_revoked']}")
            
            # 새 비밀번호로 로그인 확인
            user.refresh_from_db()
            is_new_password_valid = user.check_password('newpassword456!')
            print(f"   새 비밀번호 적용 확인: {'✅' if is_new_password_valid else '❌'}")
        else:
            print(f"   ❌ 비밀번호 변경 실패: {response.data}")
    except Exception as e:
        print(f"   ❌ 비밀번호 변경 오류: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # 4. 비밀번호 재설정 요청 API 테스트
    print("4. 비밀번호 재설정 요청 API 테스트...")
    
    # 4-1. 존재하는 이메일로 재설정 요청
    reset_request_data = {
        'email': 'logintest@example.com'
    }
    
    request = factory.post(
        '/api/auth/password/reset/',
        data=json.dumps(reset_request_data),
        content_type='application/json'
    )
    
    password_reset_request_view = PasswordResetRequestView()
    try:
        response = password_reset_request_view.post(request)
        print(f"   비밀번호 재설정 요청: {response.status_code}")
        if response.status_code == 200:
            result = response.data
            print(f"   ✅ 재설정 요청 성공: {result['message']}")
            print(f"   만료 시간: {result['expires_in_minutes']}분")
            if 'debug_info' in result:
                print(f"   실제 메시지: {result['debug_info']['actual_message']}")
                print(f"   사용자 존재: {result['debug_info']['user_exists']}")
        else:
            print(f"   ❌ 재설정 요청 실패: {response.data}")
    except Exception as e:
        print(f"   ❌ 재설정 요청 오류: {e}")
    
    # 4-2. 존재하지 않는 이메일로 재설정 요청 (보안 테스트)
    fake_reset_request_data = {
        'email': 'nonexistent@example.com'
    }
    
    request = factory.post(
        '/api/auth/password/reset/',
        data=json.dumps(fake_reset_request_data),
        content_type='application/json'
    )
    
    try:
        response = password_reset_request_view.post(request)
        print(f"   존재하지 않는 이메일 테스트: {response.status_code}")
        if response.status_code == 200:
            result = response.data
            print(f"   ✅ 보안 응답: {result['message']} (동일한 메시지)")
            if 'debug_info' in result:
                print(f"   실제: {result['debug_info']['actual_message']}")
        else:
            print(f"   ❌ 보안 응답 실패: {response.data}")
    except Exception as e:
        print(f"   ❌ 보안 테스트 오류: {e}")
    
    print()
    
    # 5. 비밀번호 재설정 토큰 생성 및 확인 테스트
    print("5. 비밀번호 재설정 토큰 테스트...")
    
    try:
        # 직접 토큰 생성
        reset_info = PasswordResetService.create_reset_token(user)
        token = reset_info['token']
        print(f"   ✅ 재설정 토큰 생성: {token[:20]}...")
        
        # 토큰으로 비밀번호 재설정 확인
        reset_confirm_data = {
            'token': token,
            'new_password': 'resetpassword789!',
            'new_password_confirm': 'resetpassword789!'
        }
        
        request = factory.post(
            '/api/auth/password/reset/confirm/',
            data=json.dumps(reset_confirm_data),
            content_type='application/json'
        )
        
        password_reset_confirm_view = PasswordResetConfirmView()
        response = password_reset_confirm_view.post(request)
        print(f"   비밀번호 재설정 확인: {response.status_code}")
        
        if response.status_code == 200:
            result = response.data
            print(f"   ✅ 재설정 성공: {result['message']}")
            print(f"   자동 로그인: {result['security_info']['auto_login_enabled']}")
            print(f"   토큰 사용됨: {result['security_info']['token_used']}")
            
            # 새 비밀번호로 로그인 확인
            user.refresh_from_db()
            is_reset_password_valid = user.check_password('resetpassword789!')
            print(f"   재설정된 비밀번호 확인: {'✅' if is_reset_password_valid else '❌'}")
        else:
            print(f"   ❌ 재설정 실패: {response.data}")
            
    except Exception as e:
        print(f"   ❌ 토큰 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== 비밀번호 관리 API 테스트 완료 ===")

if __name__ == "__main__":
    test_password_api() 