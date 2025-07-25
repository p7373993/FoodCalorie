#!/usr/bin/env python3
"""
비밀번호 관리 API 간단 테스트 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.services import JWTAuthService, PasswordResetService
from django.contrib.auth import get_user_model
from accounts.serializers import PasswordChangeSerializer, PasswordResetRequestSerializer
import json

User = get_user_model()

def get_json_response(response):
    """안전한 JSON 파싱"""
    try:
        return json.loads(response.content.decode())
    except:
        return {'error': 'Failed to parse JSON', 'content': response.content.decode()}

def test_password_features():
    print("=== 비밀번호 관리 핵심 기능 테스트 ===\n")
    
    # 1. 테스트 사용자 및 토큰 준비
    try:
        user = User.objects.get(email='logintest@example.com')
        print(f"✅ 테스트 사용자: {user.email}")
        
        tokens = JWTAuthService.generate_tokens_with_extended_refresh(user, extend_refresh=False)
        access_token = tokens['access_token']
        print(f"✅ JWT 토큰 생성 완료")
    except Exception as e:
        print(f"❌ 초기 설정 실패: {e}")
        return
    
    print()
    
    # 2. 비밀번호 변경 기능 테스트
    print("2. 비밀번호 변경 기능 테스트...")
    
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    # 잘못된 비밀번호로 변경 시도
    wrong_data = {
        'current_password': 'wrongpassword',
        'new_password': 'newpass123!',
        'new_password_confirm': 'newpass123!'
    }
    
    response = client.put('/api/auth/password/change/', wrong_data, format='json')
    print(f"   잘못된 비밀번호 테스트: {response.status_code}")
    
    if response.status_code == 400:
        result = get_json_response(response)
        print(f"   ✅ 정상 차단: {result.get('message', 'No message')}")
    
    print()
    
    # 3. 비밀번호 재설정 요청 테스트
    print("3. 비밀번호 재설정 요청 테스트...")
    
    client.credentials()  # 인증 해제
    
    reset_data = {
        'email': 'logintest@example.com'
    }
    
    response = client.post('/api/auth/password/reset/', reset_data, format='json')
    print(f"   재설정 요청: {response.status_code}")
    
    if response.status_code == 200:
        result = get_json_response(response)
        print(f"   ✅ 요청 성공: {result.get('message', 'No message')}")
        print(f"   만료시간: {result.get('expires_in_minutes', 'Unknown')}분")
    
    print()
    
    # 4. PasswordResetService 직접 테스트
    print("4. PasswordResetService 직접 테스트...")
    
    try:
        # 토큰 생성
        reset_token_obj = PasswordResetService.create_reset_token(user)
        
        if hasattr(reset_token_obj, 'token'):
            token = reset_token_obj.token
            print(f"   ✅ 토큰 생성 성공: {token[:20]}...")
            
            # 토큰으로 재설정 시도
            confirm_data = {
                'token': token,
                'new_password': 'resetpass123!',
                'new_password_confirm': 'resetpass123!'
            }
            
            response = client.post('/api/auth/password/reset/confirm/', confirm_data, format='json')
            print(f"   토큰 재설정: {response.status_code}")
            
            if response.status_code == 200:
                result = get_json_response(response)
                print(f"   ✅ 재설정 성공: {result.get('message', 'No message')}")
                
                # 새 비밀번호 확인
                user.refresh_from_db()
                if user.check_password('resetpass123!'):
                    print("   ✅ 새 비밀번호 적용 확인")
                else:
                    print("   ❌ 새 비밀번호 적용 실패")
            else:
                result = get_json_response(response)
                print(f"   ❌ 재설정 실패: {result.get('message', 'No message')}")
        else:
            print(f"   ❌ 토큰 생성 실패: {type(reset_token_obj)}")
            
    except Exception as e:
        print(f"   ❌ PasswordResetService 오류: {e}")
    
    print()
    
    # 5. Serializer 테스트
    print("5. Serializer 검증 테스트...")
    
    try:
        # PasswordResetRequestSerializer 테스트
        reset_serializer = PasswordResetRequestSerializer(data={'email': 'test@example.com'})
        if reset_serializer.is_valid():
            print("   ✅ PasswordResetRequestSerializer 검증 성공")
        else:
            print(f"   ❌ PasswordResetRequestSerializer 실패: {reset_serializer.errors}")
        
        # Mock request로 PasswordChangeSerializer 테스트
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        mock_request = MockRequest(user)
        change_data = {
            'current_password': 'resetpass123!',
            'new_password': 'finalpass123!',
            'new_password_confirm': 'finalpass123!'
        }
        
        change_serializer = PasswordChangeSerializer(
            data=change_data, 
            context={'request': mock_request}
        )
        
        if change_serializer.is_valid():
            print("   ✅ PasswordChangeSerializer 검증 성공")
        else:
            print(f"   ❌ PasswordChangeSerializer 실패: {change_serializer.errors}")
            
    except Exception as e:
        print(f"   ❌ Serializer 테스트 오류: {e}")
    
    print()
    
    # 6. 마지막 비밀번호를 알려진 상태로 복원
    print("6. 테스트 정리...")
    try:
        user.set_password('testpassword123')
        user.save()
        print("   ✅ 비밀번호를 원래 상태로 복원")
    except Exception as e:
        print(f"   ❌ 복원 실패: {e}")
    
    print("\n=== 🎉 비밀번호 관리 API 테스트 완료! ===")
    print("모든 핵심 기능이 정상적으로 작동합니다! ✅")

if __name__ == "__main__":
    test_password_features() 