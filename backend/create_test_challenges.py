#!/usr/bin/env python
"""
테스트용 챌린지 방 생성 스크립트
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from challenges.models import ChallengeRoom

def create_test_challenge_rooms():
    """테스트용 챌린지 방들을 생성합니다."""
    
    # 기존 챌린지 방 삭제 (테스트용)
    ChallengeRoom.objects.all().delete()
    
    # 테스트 챌린지 방들 생성
    challenge_rooms = [
        {
            'name': '1200kcal 다이어트 챌린지',
            'target_calorie': 1200,
            'tolerance': 50,
            'description': '강력한 다이어트를 원하는 분들을 위한 1200kcal 챌린지입니다. 의지력이 강한 분들께 추천합니다.',
            'dummy_users_count': 45
        },
        {
            'name': '1500kcal 건강 관리',
            'target_calorie': 1500,
            'tolerance': 75,
            'description': '적당한 칼로리 제한으로 건강하게 체중을 관리하는 챌린지입니다. 초보자에게 추천합니다.',
            'dummy_users_count': 78
        },
        {
            'name': '1800kcal 균형 식단',
            'target_calorie': 1800,
            'tolerance': 100,
            'description': '균형 잡힌 식단으로 건강을 유지하는 챌린지입니다. 체중 유지가 목표인 분들께 적합합니다.',
            'dummy_users_count': 92
        },
        {
            'name': '2000kcal 근육 증량',
            'target_calorie': 2000,
            'tolerance': 100,
            'description': '근육량 증가와 체중 증량을 목표로 하는 챌린지입니다. 운동과 함께 하시는 분들께 추천합니다.',
            'dummy_users_count': 34
        },
        {
            'name': '2200kcal 벌크업',
            'target_calorie': 2200,
            'tolerance': 150,
            'description': '적극적인 체중 증량과 근육 증가를 위한 고칼로리 챌린지입니다.',
            'dummy_users_count': 23
        }
    ]
    
    created_rooms = []
    for room_data in challenge_rooms:
        room = ChallengeRoom.objects.create(**room_data)
        created_rooms.append(room)
        print(f"✅ 생성됨: {room.name} ({room.target_calorie}kcal)")
    
    print(f"\n🎉 총 {len(created_rooms)}개의 챌린지 방이 생성되었습니다!")
    return created_rooms

if __name__ == '__main__':
    try:
        create_test_challenge_rooms()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        sys.exit(1)