#!/usr/bin/env python3
"""
챌린지 참여 오류 디버깅 스크립트
"""

import os
import sys
import django
import json
from datetime import date

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.test import Client
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from challenges.models import ChallengeRoom, UserChallenge


def debug_challenge_join():
    """챌린지 참여 디버깅"""
    print("🔍 챌린지 참여 오류 디버깅 시작")
    print("=" * 50)
    
    # API 클라이언트 생성
    client = APIClient()
    
    # 테스트 사용자 생성 또는 가져오기
    try:
        user = User.objects.get(username='debug_user')
        print(f"✅ 기존 사용자 사용: {user.username}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='debug_user',
            email='debug@test.com',
            password='testpass123'
        )
        print(f"✅ 새 사용자 생성: {user.username}")
    
    # 기존 활성 챌린지 정리
    UserChallenge.objects.filter(user=user, status='active').delete()
    print("✅ 기존 활성 챌린지 정리 완료")
    
    # 테스트용 챌린지 방 생성 또는 가져오기
    try:
        room = ChallengeRoom.objects.get(name='debug_test_room')
        print(f"✅ 기존 챌린지 방 사용: {room.name}")
    except ChallengeRoom.DoesNotExist:
        room = ChallengeRoom.objects.create(
            name='debug_test_room',
            target_calorie=1500,
            tolerance=50,
            description='디버깅용 테스트 방',
            is_active=True
        )
        print(f"✅ 새 챌린지 방 생성: {room.name}")
    
    # 사용자 로그인
    login_success = client.login(username='debug_user', password='testpass123')
    if login_success:
        print("✅ 사용자 로그인 성공")
    else:
        print("❌ 사용자 로그인 실패")
        return
    
    # 챌린지 참여 요청 데이터
    join_data = {
        'room_id': room.id,
        'user_height': 175.0,
        'user_weight': 75.0,
        'user_target_weight': 70.0,
        'user_challenge_duration_days': 30,
        'user_weekly_cheat_limit': 2,
        'min_daily_meals': 2,
        'challenge_cutoff_time': '23:00'
    }
    
    print("\n🔍 챌린지 참여 요청 데이터:")
    print(json.dumps(join_data, indent=2, ensure_ascii=False))
    
    # 챌린지 참여 요청
    url = reverse('challenges:join-challenge')
    print(f"\n🔍 요청 URL: {url}")
    
    response = client.post(url, join_data, format='json')
    
    print(f"\n📊 응답 상태 코드: {response.status_code}")
    print(f"📊 응답 데이터:")
    
    try:
        response_data = response.json()
        print(json.dumps(response_data, indent=2, ensure_ascii=False))
        
        if response.status_code == 201:
            print("\n🎉 챌린지 참여 성공!")
        else:
            print(f"\n❌ 챌린지 참여 실패: {response.status_code}")
            
            # 오류 세부 정보 분석
            if 'details' in response_data:
                print("\n🔍 검증 오류 세부 정보:")
                for field, errors in response_data['details'].items():
                    print(f"  {field}: {errors}")
                    
    except Exception as e:
        print(f"❌ 응답 파싱 오류: {str(e)}")
        print(f"원본 응답: {response.content}")
    
    # 현재 사용자의 챌린지 상태 확인
    print("\n🔍 사용자 챌린지 상태 확인:")
    user_challenges = UserChallenge.objects.filter(user=user)
    print(f"총 챌린지 수: {user_challenges.count()}")
    
    for challenge in user_challenges:
        print(f"  - {challenge.room.name}: {challenge.status}")
    
    # 내 챌린지 조회 테스트
    print("\n🔍 내 챌린지 조회 테스트:")
    my_challenge_url = reverse('challenges:my-challenge')
    my_response = client.get(my_challenge_url)
    
    print(f"상태 코드: {my_response.status_code}")
    if my_response.status_code == 200:
        my_data = my_response.json()
        print(f"활성 챌린지 수: {len(my_data.get('data', {}).get('active_challenges', []))}")
    
    client.logout()
    print("\n✅ 디버깅 완료")


def check_database_state():
    """데이터베이스 상태 확인"""
    print("\n🔍 데이터베이스 상태 확인")
    print("-" * 30)
    
    # 사용자 수
    user_count = User.objects.count()
    print(f"총 사용자 수: {user_count}")
    
    # 챌린지 방 수
    room_count = ChallengeRoom.objects.count()
    active_room_count = ChallengeRoom.objects.filter(is_active=True).count()
    print(f"총 챌린지 방 수: {room_count} (활성: {active_room_count})")
    
    # 사용자 챌린지 수
    challenge_count = UserChallenge.objects.count()
    active_challenge_count = UserChallenge.objects.filter(status='active').count()
    print(f"총 사용자 챌린지 수: {challenge_count} (활성: {active_challenge_count})")
    
    # 최근 챌린지들
    recent_challenges = UserChallenge.objects.order_by('-created_at')[:5]
    print(f"\n최근 챌린지 5개:")
    for challenge in recent_challenges:
        print(f"  - {challenge.user.username}: {challenge.room.name} ({challenge.status})")


def test_serializer_validation():
    """시리얼라이저 검증 테스트"""
    print("\n🔍 시리얼라이저 검증 테스트")
    print("-" * 30)
    
    from challenges.serializers import UserChallengeCreateSerializer
    from django.test import RequestFactory
    
    # 가짜 요청 생성
    factory = RequestFactory()
    request = factory.post('/api/challenges/join/')
    
    # 사용자 설정
    try:
        user = User.objects.get(username='debug_user')
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='debug_user',
            email='debug@test.com',
            password='testpass123'
        )
    
    request.user = user
    
    # 챌린지 방 확인
    try:
        room = ChallengeRoom.objects.get(name='debug_test_room')
    except ChallengeRoom.DoesNotExist:
        room = ChallengeRoom.objects.create(
            name='debug_test_room',
            target_calorie=1500,
            tolerance=50,
            description='디버깅용 테스트 방',
            is_active=True
        )
    
    # 테스트 데이터
    test_data = {
        'room_id': room.id,
        'user_height': 175.0,
        'user_weight': 75.0,
        'user_target_weight': 70.0,
        'user_challenge_duration_days': 30,
        'user_weekly_cheat_limit': 2,
        'min_daily_meals': 2,
        'challenge_cutoff_time': '23:00'
    }
    
    # 시리얼라이저 테스트
    serializer = UserChallengeCreateSerializer(
        data=test_data,
        context={'request': request}
    )
    
    print(f"시리얼라이저 유효성: {serializer.is_valid()}")
    
    if not serializer.is_valid():
        print("❌ 검증 오류:")
        for field, errors in serializer.errors.items():
            print(f"  {field}: {errors}")
    else:
        print("✅ 시리얼라이저 검증 통과")
        
        # 실제 생성 테스트
        try:
            # 기존 활성 챌린지 정리
            UserChallenge.objects.filter(user=user, status='active').delete()
            
            user_challenge = serializer.save(status='active')
            print(f"✅ 챌린지 생성 성공: {user_challenge.id}")
        except Exception as e:
            print(f"❌ 챌린지 생성 실패: {str(e)}")


if __name__ == '__main__':
    try:
        check_database_state()
        test_serializer_validation()
        debug_challenge_join()
    except Exception as e:
        print(f"❌ 디버깅 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()