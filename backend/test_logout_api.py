#!/usr/bin/env python3
"""
로그아웃 API 테스트 스크립트
"""

import requests
import json
import time

# API 베이스 URL
BASE_URL = "http://localhost:8000/api/auth"

def test_logout_api():
    print("=== 로그아웃 API 테스트 ===\n")
    
    # 1. 로그인하여 토큰 획득
    print("1. 로그인하여 JWT 토큰 획득...")
    login_data = {
        "email": "logintest@example.com",
        "password": "testpassword123",
        "remember_me": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        if response.status_code == 200:
            login_result = response.json()
            print("✅ 로그인 성공")
            
            access_token = login_result['auth']['access_token']
            refresh_token = login_result['auth']['refresh_token']
            user_email = login_result['user']['email']
            
            print(f"   사용자: {user_email}")
            print(f"   Access Token: {access_token[:50]}...")
            print(f"   Refresh Token: {refresh_token[:50]}...")
            
        else:
            print(f"❌ 로그인 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return
            
    except Exception as e:
        print(f"❌ 로그인 요청 실패: {e}")
        return
    
    print()
    
    # 2. 일반 로그아웃 테스트
    print("2. 일반 로그아웃 테스트...")
    logout_data = {
        "refresh_token": refresh_token,
        "logout_all_devices": False,
        "redirect_url": "http://localhost:3000/login"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/logout/", json=logout_data, headers=headers)
        print(f"   응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            logout_result = response.json()
            print("✅ 로그아웃 성공")
            print(f"   메시지: {logout_result['message']}")
            print(f"   블랙리스트 상태: {logout_result['logout_info']['blacklist_status']}")
            print(f"   리다이렉트 URL: {logout_result['logout_info']['redirect_url']}")
            print(f"   로그아웃 시간: {logout_result['logout_info']['logout_timestamp']}")
        else:
            print(f"❌ 로그아웃 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            
    except Exception as e:
        print(f"❌ 로그아웃 요청 실패: {e}")
    
    print()
    
    # 3. 전체 기기 로그아웃 테스트를 위해 다시 로그인
    print("3. 전체 기기 로그아웃 테스트를 위한 재로그인...")
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        if response.status_code == 200:
            login_result = response.json()
            print("✅ 재로그인 성공")
            
            access_token2 = login_result['auth']['access_token']
            refresh_token2 = login_result['auth']['refresh_token']
            
        else:
            print(f"❌ 재로그인 실패: {response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ 재로그인 요청 실패: {e}")
        return
    
    print()
    
    # 4. 전체 기기 로그아웃 테스트
    print("4. 전체 기기 로그아웃 테스트...")
    logout_all_data = {
        "refresh_token": refresh_token2,
        "logout_all_devices": True,
        "redirect_url": "http://localhost:3000/login"
    }
    
    headers2 = {
        "Authorization": f"Bearer {access_token2}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/logout/", json=logout_all_data, headers=headers2)
        print(f"   응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            logout_result = response.json()
            print("✅ 전체 기기 로그아웃 성공")
            print(f"   메시지: {logout_result['message']}")
            print(f"   블랙리스트 상태: {logout_result['logout_info']['blacklist_status']}")
            print(f"   전체 기기 로그아웃: {logout_result['logout_info']['logout_all_devices']}")
        else:
            print(f"❌ 전체 기기 로그아웃 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            
    except Exception as e:
        print(f"❌ 전체 기기 로그아웃 요청 실패: {e}")
    
    print("\n=== 로그아웃 API 테스트 완료 ===")

if __name__ == "__main__":
    # 서버가 시작될 때까지 잠시 대기
    print("서버 시작 대기 중...")
    time.sleep(5)
    
    test_logout_api() 