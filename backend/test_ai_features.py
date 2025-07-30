#!/usr/bin/env python
"""
AI 기능 테스트 스크립트
"""
import os
import sys
import django
import requests
import json

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

def test_ai_features():
    """AI 기능 테스트"""
    print("🤖 AI 기능 테스트 시작")
    print("=" * 50)
    
    # 테스트 사용자 토큰 가져오기
    try:
        user = User.objects.get(username='testuser')
        token, created = Token.objects.get_or_create(user=user)
        headers = {'Authorization': f'Token {token.key}'}
        base_url = 'http://localhost:8000/api'
        
        print(f"✅ 테스트 사용자: {user.username}")
        print(f"🔑 토큰: {token.key[:20]}...")
        
    except User.DoesNotExist:
        print("❌ 테스트 사용자를 찾을 수 없습니다.")
        print("먼저 'python manage.py create_sample_data' 명령을 실행하세요.")
        return
    
    # 1. AI 코칭 테스트
    print("\n1️⃣ AI 코칭 테스트")
    print("-" * 30)
    
    try:
        # 일일 코칭
        response = requests.get(f'{base_url}/ai/coaching/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 일일 코칭: {data['data']['message']}")
        else:
            print(f"❌ 일일 코칭 실패: {response.status_code}")
        
        # 주간 코칭
        response = requests.post(f'{base_url}/ai/coaching/', 
                               json={'type': 'weekly'}, 
                               headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 주간 코칭: 평균 {data['data'].get('avg_daily_calories', 0)}kcal")
        else:
            print(f"❌ 주간 코칭 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ AI 코칭 테스트 오류: {e}")
    
    # 2. 음식 추천 테스트
    print("\n2️⃣ 음식 추천 테스트")
    print("-" * 30)
    
    try:
        # 개인화된 추천
        response = requests.get(f'{base_url}/ai/recommendations/?meal_type=lunch&count=3', 
                              headers=headers)
        if response.status_code == 200:
            data = response.json()
            recommendations = data['data']['recommendations']
            print(f"✅ 점심 추천 ({len(recommendations)}개):")
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"   {i}. {rec['name']} ({rec['calories']}kcal)")
        else:
            print(f"❌ 개인화된 추천 실패: {response.status_code}")
        
        # 건강한 대안 추천
        response = requests.post(f'{base_url}/ai/recommendations/', 
                               json={'type': 'alternatives', 'food_name': '라면', 'count': 2}, 
                               headers=headers)
        if response.status_code == 200:
            data = response.json()
            alternatives = data['data']['result']
            print(f"✅ 라면 대안 ({len(alternatives)}개):")
            for i, alt in enumerate(alternatives[:2], 1):
                print(f"   {i}. {alt['name']} ({alt['calories']}kcal) - {alt['reason']}")
        else:
            print(f"❌ 대안 추천 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 음식 추천 테스트 오류: {e}")
    
    # 3. 영양 분석 테스트
    print("\n3️⃣ 영양 분석 테스트")
    print("-" * 30)
    
    try:
        response = requests.get(f'{base_url}/ai/nutrition-analysis/?period=week', 
                              headers=headers)
        if response.status_code == 200:
            data = response.json()
            stats = data['data']['nutrition_stats']
            print(f"✅ 주간 영양 분석:")
            print(f"   총 칼로리: {stats.get('total_calories', 0)}kcal")
            print(f"   평균 칼로리: {stats.get('avg_calories', 0):.1f}kcal")
            print(f"   총 식사 수: {data['data']['total_meals']}회")
            
            grade_dist = data['data']['grade_distribution']
            print(f"   등급 분포: A({grade_dist.get('A', 0)}) B({grade_dist.get('B', 0)}) C({grade_dist.get('C', 0)})")
        else:
            print(f"❌ 영양 분석 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 영양 분석 테스트 오류: {e}")
    
    # 4. 대시보드 데이터 테스트
    print("\n4️⃣ 대시보드 데이터 테스트")
    print("-" * 30)
    
    try:
        response = requests.get(f'{base_url}/dashboard/data/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            weekly_calories = data['weekly_calories']
            print(f"✅ 대시보드 데이터:")
            print(f"   주간 평균 칼로리: {weekly_calories['avg_daily_calories']}kcal")
            print(f"   최근 식사 수: {len(data['recent_meals'])}개")
            
            weight_data = data.get('weight_data', {})
            if weight_data.get('latest_weight'):
                print(f"   최근 체중: {weight_data['latest_weight']}kg")
        else:
            print(f"❌ 대시보드 데이터 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 대시보드 테스트 오류: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 AI 기능 테스트 완료!")
    print("\n📋 사용 가능한 API 엔드포인트:")
    print("   GET  /api/ai/coaching/ - 일일 코칭")
    print("   POST /api/ai/coaching/ - 맞춤형 코칭")
    print("   GET  /api/ai/recommendations/ - 음식 추천")
    print("   POST /api/ai/recommendations/ - 특정 조건 추천")
    print("   GET  /api/ai/nutrition-analysis/ - 영양 분석")
    print("   GET  /api/dashboard/data/ - 대시보드 데이터")

if __name__ == '__main__':
    test_ai_features()