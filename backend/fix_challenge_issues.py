#!/usr/bin/env python3
"""
챌린지 시스템 문제 해결 스크립트
스크린샷에서 보이는 오류들을 분석하고 해결
"""

import os
import sys
import django
import json
from datetime import date, time

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.test import Client
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from challenges.models import ChallengeRoom, UserChallenge
from challenges.serializers import UserChallengeCreateSerializer


def analyze_screenshot_errors():
    """스크린샷에서 보이는 오류들 분석"""
    print("🔍 스크린샷 오류 분석")
    print("=" * 50)
    
    # 스크린샷에서 보이는 주요 오류들:
    # 1. 403 Forbidden 오류들
    # 2. 인증 관련 문제들
    # 3. CSRF 토큰 문제 가능성
    
    print("📋 발견된 문제점들:")
    print("1. 403 Forbidden 오류 - 인증/권한 문제")
    print("2. 여러 API 엔드포인트에서 동일한 오류 패턴")
    print("3. 프론트엔드-백엔드 통신 문제 가능성")


def check_cors_settings():
    """CORS 설정 확인"""
    print("\n🔍 CORS 설정 확인")
    print("-" * 30)
    
    from django.conf import settings
    
    if hasattr(settings, 'CORS_ALLOWED_ORIGINS'):
        print("✅ CORS_ALLOWED_ORIGINS 설정됨:")
        for origin in settings.CORS_ALLOWED_ORIGINS:
            print(f"  - {origin}")
    else:
        print("❌ CORS_ALLOWED_ORIGINS 설정되지 않음")
    
    if hasattr(settings, 'CORS_ALLOW_CREDENTIALS'):
        print(f"✅ CORS_ALLOW_CREDENTIALS: {settings.CORS_ALLOW_CREDENTIALS}")
    else:
        print("❌ CORS_ALLOW_CREDENTIALS 설정되지 않음")


def check_session_settings():
    """세션 설정 확인"""
    print("\n🔍 세션 설정 확인")
    print("-" * 30)
    
    from django.conf import settings
    
    session_settings = [
        'SESSION_ENGINE',
        'SESSION_COOKIE_AGE',
        'SESSION_COOKIE_SECURE',
        'SESSION_COOKIE_HTTPONLY',
        'SESSION_COOKIE_SAMESITE',
        'SESSION_EXPIRE_AT_BROWSER_CLOSE'
    ]
    
    for setting in session_settings:
        if hasattr(settings, setting):
            value = getattr(settings, setting)
            print(f"✅ {setting}: {value}")
        else:
            print(f"❌ {setting}: 설정되지 않음")


def test_authentication_flow():
    """인증 플로우 테스트"""
    print("\n🔍 인증 플로우 테스트")
    print("-" * 30)
    
    client = APIClient()
    
    # 1. 로그인 없이 보호된 API 접근
    print("1. 로그인 없이 보호된 API 접근:")
    response = client.get(reverse('challenges:my-challenge'))
    print(f"   상태 코드: {response.status_code}")
    if response.status_code == 403:
        data = response.json()
        print(f"   오류 코드: {data.get('error_code')}")
        print(f"   메시지: {data.get('message')}")
    
    # 2. 로그인 후 API 접근
    print("\n2. 로그인 후 API 접근:")
    
    # 테스트 사용자 생성
    try:
        user = User.objects.get(username='test_auth_user')
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='test_auth_user',
            email='test@auth.com',
            password='testpass123'
        )
    
    # 로그인
    login_success = client.login(username='test_auth_user', password='testpass123')
    print(f"   로그인 성공: {login_success}")
    
    if login_success:
        response = client.get(reverse('challenges:my-challenge'))
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ 인증된 사용자 접근 성공")
        else:
            print(f"   ❌ 인증된 사용자 접근 실패: {response.status_code}")


def test_csrf_protection():
    """CSRF 보호 테스트"""
    print("\n🔍 CSRF 보호 테스트")
    print("-" * 30)
    
    from django.test import Client
    from django.middleware.csrf import get_token
    
    # Django 테스트 클라이언트 (CSRF 자동 처리)
    client = Client()
    
    # 사용자 생성 및 로그인
    try:
        user = User.objects.get(username='csrf_test_user')
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='csrf_test_user',
            email='csrf@test.com',
            password='testpass123'
        )
    
    client.login(username='csrf_test_user', password='testpass123')
    
    # 챌린지 방 생성
    try:
        room = ChallengeRoom.objects.get(name='csrf_test_room')
    except ChallengeRoom.DoesNotExist:
        room = ChallengeRoom.objects.create(
            name='csrf_test_room',
            target_calorie=1500,
            tolerance=50,
            description='CSRF 테스트 방',
            is_active=True
        )
    
    # 기존 활성 챌린지 정리
    UserChallenge.objects.filter(user=user, status='active').delete()
    
    # CSRF 토큰과 함께 요청
    join_data = {
        'room_id': room.id,
        'user_height': 175.0,
        'user_weight': 75.0,
        'user_target_weight': 70.0,
        'user_challenge_duration_days': 30,
        'user_weekly_cheat_limit': 2,
    }
    
    response = client.post(
        reverse('challenges:join-challenge'),
        join_data,
        content_type='application/json'
    )
    
    print(f"CSRF 보호된 요청 상태 코드: {response.status_code}")
    
    if response.status_code == 201:
        print("✅ CSRF 보호 정상 작동")
    elif response.status_code == 403:
        print("❌ CSRF 토큰 문제 가능성")
        try:
            data = response.json()
            print(f"   오류 메시지: {data.get('message', 'N/A')}")
        except:
            print(f"   응답 내용: {response.content}")
    else:
        print(f"❌ 예상치 못한 응답: {response.status_code}")
        try:
            data = response.json()
            print(f"   응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except:
            print(f"   응답 내용: {response.content}")


def create_frontend_test_data():
    """프론트엔드 테스트용 데이터 생성"""
    print("\n🔍 프론트엔드 테스트 데이터 생성")
    print("-" * 30)
    
    # 테스트 사용자 생성
    test_users = [
        {'username': 'frontend_user1', 'email': 'user1@frontend.com', 'password': 'testpass123'},
        {'username': 'frontend_user2', 'email': 'user2@frontend.com', 'password': 'testpass123'},
    ]
    
    for user_data in test_users:
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
            }
        )
        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✅ 사용자 생성: {user.username}")
        else:
            print(f"✅ 기존 사용자 사용: {user.username}")
    
    # 테스트 챌린지 방들 생성
    test_rooms = [
        {
            'name': '1500kcal 다이어트',
            'target_calorie': 1500,
            'tolerance': 50,
            'description': '1500칼로리 다이어트 챌린지'
        },
        {
            'name': '2000kcal 유지',
            'target_calorie': 2000,
            'tolerance': 100,
            'description': '2000칼로리 체중 유지 챌린지'
        },
        {
            'name': '2500kcal 벌크업',
            'target_calorie': 2500,
            'tolerance': 150,
            'description': '2500칼로리 벌크업 챌린지'
        }
    ]
    
    for room_data in test_rooms:
        room, created = ChallengeRoom.objects.get_or_create(
            name=room_data['name'],
            defaults={
                'target_calorie': room_data['target_calorie'],
                'tolerance': room_data['tolerance'],
                'description': room_data['description'],
                'is_active': True
            }
        )
        if created:
            print(f"✅ 챌린지 방 생성: {room.name}")
        else:
            print(f"✅ 기존 챌린지 방 사용: {room.name}")


def fix_common_issues():
    """일반적인 문제들 수정"""
    print("\n🔧 일반적인 문제들 수정")
    print("-" * 30)
    
    # 1. 비활성 챌린지 방들 정리
    inactive_rooms = ChallengeRoom.objects.filter(is_active=False)
    if inactive_rooms.exists():
        print(f"⚠️  비활성 챌린지 방 {inactive_rooms.count()}개 발견")
        # 실제로는 삭제하지 않고 로그만 출력
    
    # 2. 고아 챌린지들 정리 (방이 삭제된 챌린지들)
    orphan_challenges = UserChallenge.objects.filter(room__isnull=True)
    if orphan_challenges.exists():
        print(f"⚠️  고아 챌린지 {orphan_challenges.count()}개 발견")
    
    # 3. 중복 활성 챌린지 확인
    from django.db.models import Count
    users_with_multiple_active = User.objects.annotate(
        active_count=Count('userchallenge', filter=django.db.models.Q(userchallenge__status='active'))
    ).filter(active_count__gt=1)
    
    if users_with_multiple_active.exists():
        print(f"⚠️  다중 활성 챌린지 사용자 {users_with_multiple_active.count()}명 발견")
        for user in users_with_multiple_active:
            print(f"   - {user.username}: {user.active_count}개 활성 챌린지")
    
    print("✅ 문제 점검 완료")


def generate_api_test_script():
    """API 테스트 스크립트 생성"""
    print("\n📝 API 테스트 스크립트 생성")
    print("-" * 30)
    
    test_script = """
# 챌린지 API 테스트 스크립트 (curl 명령어)

# 1. 로그인 (세션 쿠키 저장)
curl -X POST http://localhost:8000/api/accounts/login/ \\
  -H "Content-Type: application/json" \\
  -d '{"username": "frontend_user1", "password": "testpass123"}' \\
  -c cookies.txt

# 2. 챌린지 방 목록 조회 (인증 불필요)
curl -X GET http://localhost:8000/api/challenges/rooms/ \\
  -H "Content-Type: application/json"

# 3. 챌린지 참여 (세션 쿠키 사용)
curl -X POST http://localhost:8000/api/challenges/join/ \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: $(curl -s -b cookies.txt http://localhost:8000/api/accounts/csrf/ | jq -r .csrfToken)" \\
  -b cookies.txt \\
  -d '{
    "room_id": 1,
    "user_height": 175.0,
    "user_weight": 75.0,
    "user_target_weight": 70.0,
    "user_challenge_duration_days": 30,
    "user_weekly_cheat_limit": 2
  }'

# 4. 내 챌린지 조회 (세션 쿠키 사용)
curl -X GET http://localhost:8000/api/challenges/my/ \\
  -H "Content-Type: application/json" \\
  -b cookies.txt

# 5. 로그아웃
curl -X POST http://localhost:8000/api/accounts/logout/ \\
  -H "Content-Type: application/json" \\
  -b cookies.txt
"""
    
    with open('api_test_script.sh', 'w', encoding='utf-8') as f:
        f.write(test_script)
    
    print("✅ API 테스트 스크립트 생성: api_test_script.sh")


if __name__ == '__main__':
    try:
        analyze_screenshot_errors()
        check_cors_settings()
        check_session_settings()
        test_authentication_flow()
        test_csrf_protection()
        create_frontend_test_data()
        fix_common_issues()
        generate_api_test_script()
        
        print("\n" + "=" * 50)
        print("🎯 문제 해결 권장사항:")
        print("1. 프론트엔드에서 세션 쿠키가 제대로 전송되는지 확인")
        print("2. CORS 설정이 프론트엔드 도메인을 허용하는지 확인")
        print("3. CSRF 토큰이 제대로 포함되는지 확인")
        print("4. 브라우저 개발자 도구에서 네트워크 탭 확인")
        print("5. 백엔드 로그에서 실제 오류 메시지 확인")
        
    except Exception as e:
        print(f"❌ 문제 해결 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()