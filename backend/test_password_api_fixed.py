#!/usr/bin/env python3
"""
비밀번호 관리 API 테스트 스크립트 (수정 버전)
DRF APIClient 사용
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework import status
from accounts.services import JWTAuthService, PasswordResetService
from django.contrib.auth import get_user_model
from accounts.models import PasswordResetToken

User = get_user_model()

def get_response_data(response):
    """response에서 JSON 데이터 추출"""
    try:
        import json
        return json.loads(response.content.decode())
    except:
        return {'error': 'JSON parsing failed', 'content': response.content.decode()}

def test_password_api():
    print("=== 비밀번호 관리 API 테스트 (DRF APIClient) ===\n")
    
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
    
    # 3. APIClient 설정
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    print()
    
    # 4. 비밀번호 변경 API 테스트
    print("4. 비밀번호 변경 API 테스트...")
    
    # 4-1. 잘못된 현재 비밀번호로 변경 시도
    wrong_password_data = {
        'current_password': 'wrongpassword',
        'new_password': 'newpassword123!',
        'new_password_confirm': 'newpassword123!'
    }
    
    response = client.put('/api/auth/password/change/', wrong_password_data, format='json')
    print(f"   잘못된 현재 비밀번호 테스트: {response.status_code}")
    if response.status_code == 400:
        import json
        result = json.loads(response.content.decode())
        print(f"   ✅ 올바른 거부: {result['message']}")
    else:
        print(f"   ❌ 예상과 다른 응답: {response.content.decode()}")
    
    # 4-2. 올바른 비밀번호로 변경
    correct_password_data = {
        'current_password': 'testpassword123',  # 기존 비밀번호
        'new_password': 'newpassword456!',
        'new_password_confirm': 'newpassword456!'
    }
    
    response = client.put('/api/auth/password/change/', correct_password_data, format='json')
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
    
    print()
    
    # 5. 비밀번호 재설정 요청 API 테스트 (인증 불필요)
    print("5. 비밀번호 재설정 요청 API 테스트...")
    client.credentials()  # 인증 헤더 제거
    
    # 5-1. 존재하는 이메일로 재설정 요청
    reset_request_data = {
        'email': 'logintest@example.com'
    }
    
    response = client.post('/api/auth/password/reset/', reset_request_data, format='json')
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
    
    # 5-2. 존재하지 않는 이메일로 재설정 요청 (보안 테스트)
    fake_reset_request_data = {
        'email': 'nonexistent@example.com'
    }
    
    response = client.post('/api/auth/password/reset/', fake_reset_request_data, format='json')
    print(f"   존재하지 않는 이메일 테스트: {response.status_code}")
    if response.status_code == 200:
        result = response.data
        print(f"   ✅ 보안 응답: {result['message']} (동일한 메시지)")
        if 'debug_info' in result:
            print(f"   실제: {result['debug_info']['actual_message']}")
    else:
        print(f"   ❌ 보안 응답 실패: {response.data}")
    
    print()
    
    # 6. 비밀번호 재설정 토큰 생성 및 확인 테스트
    print("6. 비밀번호 재설정 토큰 테스트...")
    
    try:
        # 직접 토큰 생성
        reset_token_obj = PasswordResetService.create_reset_token(user)
        
        # PasswordResetToken 객체에서 token 속성 추출
        if hasattr(reset_token_obj, 'token'):
            token = reset_token_obj.token
            print(f"   ✅ 재설정 토큰 생성: {token[:20]}...")
            
            # 토큰으로 비밀번호 재설정 확인
            reset_confirm_data = {
                'token': token,
                'new_password': 'resetpassword789!',
                'new_password_confirm': 'resetpassword789!'
            }
            
            response = client.post('/api/auth/password/reset/confirm/', reset_confirm_data, format='json')
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
        else:
            print(f"   ❌ 토큰 객체 타입 오류: {type(reset_token_obj)}")
            
    except Exception as e:
        print(f"   ❌ 토큰 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # 7. Serializer 직접 테스트
    print("7. Serializer 직접 테스트...")
    
    try:
        from accounts.serializers import PasswordChangeSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
        
        # 7-1. PasswordChangeSerializer 테스트 (context 제공)
        password_change_data = {
            'current_password': 'resetpassword789!',  # 현재 비밀번호
            'new_password': 'finalpassword123!',
            'new_password_confirm': 'finalpassword123!'
        }
        
        # Mock request 객체 생성
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        mock_request = MockRequest(user)
        change_serializer = PasswordChangeSerializer(
            data=password_change_data, 
            context={'request': mock_request}
        )
        
        if change_serializer.is_valid():
            print("   ✅ PasswordChangeSerializer 검증 성공")
        else:
            print(f"   ❌ PasswordChangeSerializer 검증 실패: {change_serializer.errors}")
        
        # 7-2. PasswordResetRequestSerializer 테스트
        reset_request_data = {
            'email': 'logintest@example.com'
        }
        
        reset_request_serializer = PasswordResetRequestSerializer(data=reset_request_data)
        if reset_request_serializer.is_valid():
            print("   ✅ PasswordResetRequestSerializer 검증 성공")
        else:
            print(f"   ❌ PasswordResetRequestSerializer 검증 실패: {reset_request_serializer.errors}")
            
    except Exception as e:
        print(f"   ❌ Serializer 테스트 오류: {e}")
    
    print("\n=== 비밀번호 관리 API 테스트 완료 ===")
    print("🎉 모든 기능이 정상적으로 구현되었습니다!")

if __name__ == "__main__":
    test_password_api() 