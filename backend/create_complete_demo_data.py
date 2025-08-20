#!/usr/bin/env python3
"""
완전한 시연용 데이터 생성 스크립트
- 사용자 계정
- 한달치 식사 기록
- 체중 데이터
- 챌린지 데이터
- AI 코치 팁
- 캘린더 데이터
- 배지 데이터
"""

import os
import sys
import django
from datetime import datetime, timedelta, date, time
import random
from decimal import Decimal

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import UserProfile
from api_integrated.models import MealLog, WeightRecord, AICoachTip
from challenges.models import ChallengeRoom, UserChallenge, DailyChallengeRecord, ChallengeBadge, UserChallengeBadge
from calender.models import CalendarUserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis

def clear_existing_data():
    """기존 데이터 정리"""
    print("🧹 기존 데이터 정리 중...")
    
    # 기존 데이터 삭제
    MealLog.objects.all().delete()
    WeightRecord.objects.all().delete()
    AICoachTip.objects.all().delete()
    DailyChallengeRecord.objects.all().delete()
    UserChallenge.objects.all().delete()
    ChallengeRoom.objects.all().delete()
    ChallengeBadge.objects.all().delete()
    UserChallengeBadge.objects.all().delete()
    CalendarUserProfile.objects.all().delete()
    DailyGoal.objects.all().delete()
    Badge.objects.all().delete()
    UserBadge.objects.all().delete()
    WeeklyAnalysis.objects.all().delete()
    
    print("✅ 기존 데이터 정리 완료")

def create_demo_users():
    """시연용 사용자 계정 생성"""
    print("👥 시연용 사용자 계정 생성 중...")
    
    users_data = [
        {
            'username': 'demo_user',
            'email': 'demo@example.com',
            'password': 'demo123!',
            'first_name': '김',
            'last_name': '시연',
            'profile': {
                'nickname': '건강한김시연',
                'height': 165.0,
                'weight': 58.0,
                'age': 28,
                'gender': 'female',
                'bio': '건강한 식단 관리를 통해 목표 체중 달성을 위해 노력하고 있습니다! 💪'
            }
        },
        {
            'username': 'fitness_lover',
            'email': 'fitness@example.com',
            'password': 'fitness123!',
            'first_name': '박',
            'last_name': '헬스',
            'profile': {
                'nickname': '헬스매니아박',
                'height': 175.0,
                'weight': 72.0,
                'age': 32,
                'gender': 'male',
                'bio': '운동과 식단 관리로 건강한 라이프스타일을 추구합니다 🏋️‍♂️'
            }
        },
        {
            'username': 'diet_master',
            'email': 'diet@example.com',
            'password': 'diet123!',
            'first_name': '이',
            'last_name': '다이어트',
            'profile': {
                'nickname': '다이어트마스터',
                'height': 160.0,
                'weight': 55.0,
                'age': 25,
                'gender': 'female',
                'bio': '체계적인 칼로리 관리로 건강한 다이어트 진행 중입니다 🥗'
            }
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # 사용자 생성 또는 가져오기
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
            }
        )
        
        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✅ 새 사용자 생성: {user.username}")
        else:
            print(f"📝 기존 사용자 사용: {user.username}")
        
        # 프로필 생성 또는 업데이트
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults=user_data['profile']
        )
        
        if not profile_created:
            for key, value in user_data['profile'].items():
                setattr(profile, key, value)
            profile.save()
            print(f"📝 프로필 업데이트: {user.username}")
        else:
            print(f"✅ 프로필 생성: {user.username}")
        
        created_users.append(user)
    
    print(f"✅ 총 {len(created_users)}명의 사용자 계정 생성 완료")
    return created_users

def get_korean_food_data():
    """한국 음식 데이터"""
    return [
        # 아침 음식
        {'name': '현미밥', 'calories': 200, 'carbs': 40, 'protein': 4, 'fat': 1, 'score': 'A'},
        {'name': '계란말이', 'calories': 150, 'carbs': 2, 'protein': 12, 'fat': 10, 'score': 'A'},
        {'name': '된장국', 'calories': 80, 'carbs': 8, 'protein': 6, 'fat': 3, 'score': 'A'},
        {'name': '김치', 'calories': 30, 'carbs': 5, 'protein': 2, 'fat': 0, 'score': 'A'},
        {'name': '시리얼', 'calories': 120, 'carbs': 25, 'protein': 3, 'fat': 1, 'score': 'B'},
        {'name': '토스트', 'calories': 180, 'carbs': 30, 'protein': 5, 'fat': 6, 'score': 'B'},
        {'name': '우유', 'calories': 100, 'carbs': 12, 'protein': 8, 'fat': 5, 'score': 'A'},
        {'name': '바나나', 'calories': 105, 'carbs': 27, 'protein': 1, 'fat': 0, 'score': 'A'},
        
        # 점심 음식
        {'name': '비빔밥', 'calories': 450, 'carbs': 70, 'protein': 15, 'fat': 12, 'score': 'A'},
        {'name': '김치찌개', 'calories': 320, 'carbs': 15, 'protein': 20, 'fat': 18, 'score': 'B'},
        {'name': '된장찌개', 'calories': 280, 'carbs': 12, 'protein': 18, 'fat': 15, 'score': 'A'},
        {'name': '불고기', 'calories': 380, 'carbs': 25, 'protein': 35, 'fat': 16, 'score': 'B'},
        {'name': '닭볶음탕', 'calories': 420, 'carbs': 20, 'protein': 40, 'fat': 18, 'score': 'B'},
        {'name': '순두부찌개', 'calories': 260, 'carbs': 8, 'protein': 22, 'fat': 14, 'score': 'A'},
        {'name': '잡채', 'calories': 340, 'carbs': 45, 'protein': 12, 'fat': 14, 'score': 'B'},
        {'name': '김밥', 'calories': 300, 'carbs': 50, 'protein': 8, 'fat': 8, 'score': 'B'},
        
        # 저녁 음식
        {'name': '삼겹살', 'calories': 550, 'carbs': 0, 'protein': 25, 'fat': 45, 'score': 'C'},
        {'name': '갈비찜', 'calories': 480, 'carbs': 15, 'protein': 35, 'fat': 28, 'score': 'C'},
        {'name': '닭가슴살구이', 'calories': 220, 'carbs': 0, 'protein': 45, 'fat': 3, 'score': 'A'},
        {'name': '연어구이', 'calories': 280, 'carbs': 0, 'protein': 35, 'fat': 15, 'score': 'A'},
        {'name': '두부조림', 'calories': 180, 'carbs': 8, 'protein': 18, 'fat': 8, 'score': 'A'},
        {'name': '시금치나물', 'calories': 60, 'carbs': 8, 'protein': 6, 'fat': 2, 'score': 'A'},
        {'name': '미역국', 'calories': 90, 'carbs': 10, 'protein': 8, 'fat': 3, 'score': 'A'},
        {'name': '잡곡밥', 'calories': 220, 'carbs': 45, 'protein': 5, 'fat': 2, 'score': 'A'},
        
        # 간식
        {'name': '사과', 'calories': 95, 'carbs': 25, 'protein': 0, 'fat': 0, 'score': 'A'},
        {'name': '요구르트', 'calories': 120, 'carbs': 18, 'protein': 8, 'fat': 4, 'score': 'A'},
        {'name': '견과류', 'calories': 180, 'carbs': 6, 'protein': 6, 'fat': 16, 'score': 'A'},
        {'name': '아이스크림', 'calories': 250, 'carbs': 30, 'protein': 4, 'fat': 12, 'score': 'D'},
        {'name': '초콜릿', 'calories': 220, 'carbs': 25, 'protein': 2, 'fat': 12, 'score': 'D'},
        {'name': '과자', 'calories': 150, 'carbs': 20, 'protein': 2, 'fat': 7, 'score': 'C'},
        {'name': '커피', 'calories': 5, 'carbs': 1, 'protein': 0, 'fat': 0, 'score': 'A'},
    ]

def create_meal_data():
    """한달치 식사 데이터 생성 (3끼만)"""
    print("🍽️ 한달치 식사 데이터 생성 중...")
    
    users = User.objects.all()
    start_date = date.today() - timedelta(days=60)  # 2달치 데이터
    
    # 음식 데이터 (실제 이미지 URL 포함)
    breakfast_foods = [
        {
            'name': '계란 토스트',
            'calories': 320,
            'protein': 15,
            'carbs': 35,
            'fat': 12,
            'image_url': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop'
        },
        {
            'name': '오트밀 바나나',
            'calories': 280,
            'protein': 8,
            'carbs': 45,
            'fat': 6,
            'image_url': 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&h=300&fit=crop'
        },
        {
            'name': '그릭요거트 베리',
            'calories': 220,
            'protein': 18,
            'carbs': 25,
            'fat': 4,
            'image_url': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop'
        },
        {
            'name': '샌드위치',
            'calories': 380,
            'protein': 20,
            'carbs': 40,
            'fat': 15,
            'image_url': 'https://images.unsplash.com/photo-1528735602786-227c84787c5e?w=400&h=300&fit=crop'
        },
        {
            'name': '스무디 볼',
            'calories': 250,
            'protein': 12,
            'carbs': 35,
            'fat': 8,
            'image_url': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
        }
    ]
    
    lunch_foods = [
        {
            'name': '치킨 샐러드',
            'calories': 420,
            'protein': 35,
            'carbs': 25,
            'fat': 18,
            'image_url': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop'
        },
        {
            'name': '연어 구이',
            'calories': 480,
            'protein': 42,
            'carbs': 30,
            'fat': 22,
            'image_url': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
        },
        {
            'name': '비빔밥',
            'calories': 520,
            'protein': 25,
            'carbs': 65,
            'fat': 20,
            'image_url': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop'
        },
        {
            'name': '파스타',
            'calories': 580,
            'protein': 18,
            'carbs': 75,
            'fat': 25,
            'image_url': 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop'
        },
        {
            'name': '스테이크',
            'calories': 650,
            'protein': 45,
            'carbs': 15,
            'fat': 35,
            'image_url': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop'
        }
    ]
    
    dinner_foods = [
        {
            'name': '구운 닭고기',
            'calories': 380,
            'protein': 40,
            'carbs': 20,
            'fat': 15,
            'image_url': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop'
        },
        {
            'name': '생선 구이',
            'calories': 320,
            'protein': 35,
            'carbs': 15,
            'fat': 12,
            'image_url': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
        },
        {
            'name': '채식 스튜',
            'calories': 280,
            'protein': 12,
            'carbs': 45,
            'fat': 8,
            'image_url': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop'
        },
        {
            'name': '된장찌개',
            'calories': 350,
            'protein': 20,
            'carbs': 35,
            'fat': 12,
            'image_url': 'https://images.unsplash.com/photo-1563379091339-03246963d4a9?w=400&h=300&fit=crop'
        },
        {
            'name': '새우 볶음밥',
            'calories': 420,
            'protein': 25,
            'carbs': 55,
            'fat': 15,
            'image_url': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop'
        }
    ]
    
    for user in users:
        # 김시연은 2달치, 더미 사용자들도 1달치
        if user.username == 'demo_user':
            days_to_generate = 60
            print(f"🍽️ {user.username} (김시연)의 2달치 식사 데이터 생성 중...")
        else:
            days_to_generate = 30
            print(f"🍽️ {user.username}의 1달치 식사 데이터 생성 중...")
        
        for day in range(days_to_generate):
            current_date = start_date + timedelta(days=day)
            
            # 오늘 날짜는 건너뛰기 (아직 식사하지 않은 것으로 처리)
            if current_date == date.today():
                continue
            
            # 아침 (7-9시)
            breakfast_time = time(random.randint(7, 9), random.randint(0, 59))
            breakfast_food = random.choice(breakfast_foods)
            
            MealLog.objects.create(
                user=user,
                date=current_date,
                mealType='breakfast',
                foodName=breakfast_food['name'],
                calories=breakfast_food['calories'],
                protein=breakfast_food['protein'],
                carbs=breakfast_food['carbs'],
                fat=breakfast_food['fat'],
                time=breakfast_time,
                imageUrl=breakfast_food['image_url'],
                nutriScore='A'
            )
            
            # 점심 (12-14시)
            lunch_time = time(random.randint(12, 14), random.randint(0, 59))
            lunch_food = random.choice(lunch_foods)
            
            MealLog.objects.create(
                user=user,
                date=current_date,
                mealType='lunch',
                foodName=lunch_food['name'],
                calories=lunch_food['calories'],
                protein=lunch_food['protein'],
                carbs=lunch_food['carbs'],
                fat=lunch_food['fat'],
                time=lunch_time,
                imageUrl=lunch_food['image_url'],
                nutriScore='A'
            )
            
            # 저녁 (18-20시)
            dinner_time = time(random.randint(18, 20), random.randint(0, 59))
            dinner_food = random.choice(dinner_foods)
            
            MealLog.objects.create(
                user=user,
                date=current_date,
                mealType='dinner',
                foodName=dinner_food['name'],
                calories=dinner_food['calories'],
                protein=dinner_food['protein'],
                carbs=dinner_food['carbs'],
                fat=dinner_food['fat'],
                time=dinner_time,
                imageUrl=dinner_food['image_url'],
                nutriScore='A'
            )
    
    print(f"✅ {len(users)}명의 사용자에 대해 식사 데이터 생성 완료")
    print(f"   - 김시연: 2달치 (60일) 데이터")
    print(f"   - 더미 사용자 + 기타 사용자: 1달치 (30일) 데이터")

def create_weight_records_for_user(user, start_date, days=30):
    """사용자별 체중 기록 생성"""
    # 김시연은 2달치, 더미 사용자들도 1달치
    if user.username == 'demo_user':
        days = 60
        print(f"⚖️ {user.username} (김시연)의 {days}일치 체중 기록 생성 중...")
    else:
        print(f"⚖️ {user.username}의 {days}일치 체중 기록 생성 중...")
    
    # 초기 체중 (프로필에서 가져오기)
    initial_weight = user.profile.weight or 65.0
    
    weight_records = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        # 체중 변화 (-0.3kg ~ +0.2kg)
        weight_change = random.uniform(-0.3, 0.2)
        current_weight = initial_weight + weight_change
        
        # 주말에는 체중 측정 안할 수도 있음 (30% 확률)
        if current_date.weekday() >= 5 and random.random() < 0.3:
            continue
            
        weight_record = WeightRecord(
            user=user,
            weight=round(current_weight, 1),
            date=current_date
        )
        weight_records.append(weight_record)
    
    # 일괄 생성
    WeightRecord.objects.bulk_create(weight_records)
    print(f"✅ {user.username}의 {len(weight_records)}개 체중 기록 생성 완료")

def create_challenge_data():
    """챌린지 데이터 생성"""
    print("🏆 챌린지 데이터 생성 중...")
    
    # 9개 칼로리 챌린지 하드코딩
    challenge_rooms = [
        {
            'name': '1200kcal 다이어트 챌린지',
            'target_calorie': 1200,
            'tolerance': 60,
            'description': '강력한 다이어트를 위한 1200kcal 챌린지입니다. 체중 감량 목표를 달성해보세요!',
            'is_active': True,
            'dummy_users_count': 15
        },
        {
            'name': '1400kcal 건강 다이어트',
            'target_calorie': 1400,
            'tolerance': 70,
            'description': '건강한 다이어트를 위한 1400kcal 챌린지입니다. 무리하지 않는 다이어트!',
            'is_active': True,
            'dummy_users_count': 22
        },
        {
            'name': '1500kcal 균형 다이어트',
            'target_calorie': 1500,
            'tolerance': 75,
            'description': '균형잡힌 다이어트를 위한 1500kcal 챌린지입니다. 초보자에게 추천!',
            'is_active': True,
            'dummy_users_count': 28
        },
        {
            'name': '1600kcal 가벼운 다이어트',
            'target_calorie': 1600,
            'tolerance': 80,
            'description': '가벼운 다이어트를 위한 1600kcal 챌린지입니다. 부담 없이 시작해보세요!',
            'is_active': True,
            'dummy_users_count': 25
        },
        {
            'name': '1800kcal 균형 식단',
            'target_calorie': 1800,
            'tolerance': 90,
            'description': '균형잡힌 식단으로 건강을 유지하는 1800kcal 챌린지입니다.',
            'is_active': True,
            'dummy_users_count': 32
        },
        {
            'name': '2000kcal 체중 유지',
            'target_calorie': 2000,
            'tolerance': 100,
            'description': '적정 체중 유지를 위한 2000kcal 챌린지입니다. 건강한 체중 관리!',
            'is_active': True,
            'dummy_users_count': 18
        },
        {
            'name': '2200kcal 근육 증량',
            'target_calorie': 2200,
            'tolerance': 110,
            'description': '근육량 증가를 위한 2200kcal 챌린지입니다. 운동과 함께 하세요!',
            'is_active': True,
            'dummy_users_count': 14
        },
        {
            'name': '2400kcal 벌크업',
            'target_calorie': 2400,
            'tolerance': 120,
            'description': '적극적인 체중 증량을 위한 2400kcal 챌린지입니다. 벌크업 목표!',
            'is_active': True,
            'dummy_users_count': 12
        },
        {
            'name': '2600kcal 하드 벌크업',
            'target_calorie': 2600,
            'tolerance': 130,
            'description': '강력한 체중 증량을 위한 2600kcal 챌린지입니다. 고칼로리 도전!',
            'is_active': True,
            'dummy_users_count': 8
        }
    ]
    
    created_rooms = []
    for i, room_data in enumerate(challenge_rooms):
        room, created = ChallengeRoom.objects.get_or_create(
            name=room_data['name'],
            defaults=room_data
        )
        
        # 챌린지 방 생성일을 과거로 설정 (30-60일 전)
        past_date = date.today() - timedelta(days=random.randint(30, 60))
        room.created_at = timezone.make_aware(
            datetime.combine(past_date, datetime.min.time())
        )
        room.save()
        
        if created:
            print(f"✅ 챌린지 룸 생성: {room.name} (생성일: {past_date})")
        else:
            print(f"📝 기존 챌린지 룸 사용: {room.name} (생성일 업데이트: {past_date})")
        created_rooms.append(room)
    
    # 더미 사용자 생성 (10명 추가)
    dummy_users = []
    dummy_names = [
        '김다이어트', '박헬스', '이건강', '최운동', '정피트니스',
        '강웰빙', '조바디', '윤스포츠', '임피트', '한건강'
    ]
    
    for i, name in enumerate(dummy_names):
        user, created = User.objects.get_or_create(
            username=f'dummy_user_{i+1}',
            defaults={
                'email': f'dummy{i+1}@example.com',
                'first_name': name[:1],
                'last_name': name[1:],
            }
        )
        
        if created:
            user.set_password('dummy123!')
            user.save()
            print(f"✅ 더미 사용자 생성: {user.username}")
        
        # 프로필 생성
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'nickname': name,
                'height': random.uniform(160.0, 180.0),
                'weight': random.uniform(55.0, 80.0),
                'age': random.randint(20, 40),
                'gender': random.choice(['male', 'female']),
                'bio': f'{name}입니다! 건강한 라이프스타일을 추구합니다 💪'
            }
        )
        
        dummy_users.append(user)
    
    # 모든 사용자 (기존 + 더미)
    all_users = list(User.objects.all())
    
    # 김시연 사용자 찾기
    kim_user = User.objects.filter(username='demo_user').first()
    
    # 사용자들을 챌린지에 참여시킴 (각 사용자는 하나의 챌린지만 참여)
    for user in all_users:
        # 각 사용자마다 랜덤하게 하나의 챌린지 선택
        selected_room = random.choice(created_rooms)
        
        # 김시연은 1500kcal 챌린지에 참여 (25일 진행)
        if user == kim_user:
            selected_room = next((room for room in created_rooms if room.target_calorie == 1500), created_rooms[2])
            start_days_ago = 25
            consecutive_success = 12  # 최근 12일 연속 성공 (더 현실적)
            total_success = 20  # 총 20일 성공 (80% 성공률)
            print(f"DEBUG: 김시연 챌린지 설정 - 시작일: {date.today() - timedelta(days=start_days_ago)}, 25일 전")
        else:
            # 챌린지 방 생성일 이후에 참여하도록 설정
            room_created_days_ago = (date.today() - selected_room.created_at.date()).days
            max_start_days_ago = min(room_created_days_ago - 1, 35)  # 방 생성 다음날부터 참여 가능
            
            # 더미 사용자들의 다양한 참여 패턴
            if user.username.startswith('dummy_user_'):
                # 더미 사용자들은 더 다양한 패턴
                participation_type = random.choice(['new', 'active', 'struggling'])
                
                if participation_type == 'new':  # 최근 시작한 사용자
                    start_days_ago = random.randint(3, 10)
                    consecutive_success = random.randint(2, start_days_ago)
                    total_success = random.randint(consecutive_success, start_days_ago)
                elif participation_type == 'active':  # 활발한 사용자
                    start_days_ago = random.randint(10, max(10, max_start_days_ago))
                    consecutive_success = random.randint(5, min(start_days_ago, 15))
                    total_success = random.randint(int(start_days_ago * 0.7), start_days_ago)
                else:  # 어려움을 겪는 사용자
                    start_days_ago = random.randint(15, max(15, max_start_days_ago))
                    consecutive_success = random.randint(0, 5)
                    total_success = random.randint(consecutive_success, int(start_days_ago * 0.6))
            else:
                # 기본 사용자들
                start_days_ago = random.randint(5, max(5, max_start_days_ago))
                max_possible_consecutive = min(start_days_ago, 12)
                consecutive_success = random.randint(0, max_possible_consecutive)
                total_success = random.randint(consecutive_success, start_days_ago)
        
        challenge_start_date = date.today() - timedelta(days=start_days_ago)
        
        user_challenge, created = UserChallenge.objects.get_or_create(
            user=user,
            room=selected_room,
            defaults={
                'user_height': user.profile.height or 170.0,
                'user_weight': user.profile.weight or 65.0,
                'user_target_weight': (user.profile.weight or 65.0) - random.uniform(1.0, 5.0),
                'user_challenge_duration_days': 30,
                'user_weekly_cheat_limit': random.choice([0, 1, 2]),
                'min_daily_meals': random.choice([2, 3]),
                'remaining_duration_days': max(0, 30 - start_days_ago),
                'status': 'active',
                'challenge_start_date': challenge_start_date,
                # 미리 계산된 통계 설정
                'current_streak_days': consecutive_success,
                'max_streak_days': consecutive_success,
                'total_success_days': total_success,
                'total_failure_days': start_days_ago - total_success
            }
        )
        if created:
            print(f"✅ {user.username}이 {selected_room.name}에 참여 (시작: {challenge_start_date}, 참여기간: {start_days_ago}일)")
    
    # 일일 챌린지 기록 생성 (논리적으로 맞는 데이터)
    for user_challenge in UserChallenge.objects.all():
        start_date = user_challenge.challenge_start_date
        today = date.today()
        
        # 실제 참여 일수 계산
        participation_days = (today - start_date).days + 1
        
        # UserChallenge에서 이미 설정된 통계 사용
        total_success = user_challenge.total_success_days
        consecutive_success = user_challenge.current_streak_days
        
        # 성공 패턴 생성 (시간순으로)
        success_pattern = []
        
        # 김시연의 특별한 패턴
        if user_challenge.user == kim_user:
            # 25일 중 20일 성공, 최근 12일 연속 성공
            success_pattern = []
            for day in range(participation_days):
                if day >= participation_days - consecutive_success:  # 최근 12일은 연속 성공
                    success_pattern.append(True)
                elif day < total_success - consecutive_success:  # 초기 8일 성공
                    success_pattern.append(True)
                else:  # 중간 5일 실패
                    success_pattern.append(False)
            
            print(f"DEBUG: 김시연 성공 패턴 - 총 {len(success_pattern)}일, 성공 {sum(success_pattern)}일")
        else:
            # 다른 사용자들의 패턴
            # 먼저 연속 성공 기간 설정 (최근 날짜)
            success_pattern = [False] * participation_days
            
            # 최근 연속 성공 설정
            for i in range(consecutive_success):
                if participation_days - 1 - i >= 0:
                    success_pattern[participation_days - 1 - i] = True
            
            # 나머지 성공일 랜덤 배치
            remaining_success = total_success - consecutive_success
            available_indices = [i for i in range(participation_days - consecutive_success) if not success_pattern[i]]
            
            if remaining_success > 0 and available_indices:
                success_indices = random.sample(available_indices, min(remaining_success, len(available_indices)))
                for idx in success_indices:
                    success_pattern[idx] = True
        
        # 일일 기록 생성 (실제 식사 기록과 동기화)
        daily_records = []
        for day in range(participation_days):
            current_date = start_date + timedelta(days=day)
            is_success = success_pattern[day] if day < len(success_pattern) else False
            
            target_calories = user_challenge.room.target_calorie
            tolerance = user_challenge.room.tolerance
            
            # 실제 식사 기록에서 칼로리 가져오기
            from django.db.models import Sum
            actual_meal_calories = MealLog.objects.filter(
                user=user_challenge.user,
                date=current_date
            ).aggregate(total=Sum('calories'))['total'] or 0
            
            # 챌린지 타입별 성공 조건 함수
            def is_calorie_success(calories, target, tolerance):
                if target <= 2000:
                    # 다이어트/유지: 목표 이하로 먹어야 성공
                    return calories <= (target + tolerance)
                else:
                    # 벌크업: 목표 이상으로 먹어야 성공
                    return calories >= (target - tolerance)
            
            # 김시연의 경우 패턴을 우선하고, 다른 사용자는 실제 칼로리 우선
            if user_challenge.user == kim_user:
                # 김시연은 미리 정의된 패턴 사용
                if is_success:
                    if target_calories <= 2000:
                        # 다이어트: 목표 근처에서 약간 적게
                        actual_calories = target_calories + random.uniform(-tolerance * 0.5, tolerance * 0.8)
                    else:
                        # 벌크업: 목표 근처에서 약간 많게
                        actual_calories = target_calories + random.uniform(-tolerance * 0.8, tolerance * 0.5)
                else:
                    if target_calories <= 2000:
                        # 다이어트 실패: 너무 많이 먹음
                        actual_calories = target_calories + random.uniform(tolerance * 1.2, tolerance * 2)
                    else:
                        # 벌크업 실패: 너무 적게 먹음
                        actual_calories = target_calories - random.uniform(tolerance * 1.2, tolerance * 2)
            else:
                # 다른 사용자들은 실제 식사 기록 우선
                if actual_meal_calories > 0:
                    actual_calories = actual_meal_calories
                    # 챌린지 타입별 성공/실패 재판정
                    is_success = is_calorie_success(actual_calories, target_calories, tolerance)
                else:
                    # 식사 기록이 없으면 패턴에 따라 칼로리 생성
                    if is_success:
                        if target_calories <= 2000:
                            # 다이어트: 목표 근처에서 약간 적게
                            actual_calories = target_calories + random.uniform(-tolerance * 0.5, tolerance * 0.8)
                        else:
                            # 벌크업: 목표 근처에서 약간 많게
                            actual_calories = target_calories + random.uniform(-tolerance * 0.8, tolerance * 0.5)
                    else:
                        if target_calories <= 2000:
                            # 다이어트 실패: 너무 많이 먹음
                            actual_calories = target_calories + random.uniform(tolerance * 1.2, tolerance * 2)
                        else:
                            # 벌크업 실패: 너무 적게 먹음
                            actual_calories = target_calories - random.uniform(tolerance * 1.2, tolerance * 2)
            
            # 치팅 사용 여부 (가끔씩)
            is_cheat_day = random.random() < 0.05  # 5% 확률
            
            daily_record = DailyChallengeRecord(
                user_challenge=user_challenge,
                date=current_date,
                total_calories=round(actual_calories, 1),
                target_calories=target_calories,
                is_success=is_success or is_cheat_day,
                is_cheat_day=is_cheat_day,
                meal_count=random.randint(2, 4)
            )
            daily_records.append(daily_record)
        
        # 일괄 생성
        DailyChallengeRecord.objects.bulk_create(daily_records)
        
        print(f"📊 {user_challenge.user.username}의 {user_challenge.room.name} 기록:")
        print(f"   - 참여 기간: {participation_days}일")
        print(f"   - 총 성공: {total_success}일")
        print(f"   - 연속 성공: {consecutive_success}일")
        print(f"   - 성공률: {total_success/participation_days*100:.1f}%")
        
        # 치팅 사용 횟수 업데이트
        cheat_count = DailyChallengeRecord.objects.filter(
            user_challenge=user_challenge,
            is_cheat_day=True
        ).count()
        user_challenge.current_weekly_cheat_count = min(cheat_count, user_challenge.user_weekly_cheat_limit)
        user_challenge.save()
    
    print(f"✅ 챌린지 데이터 생성 완료 (총 {len(all_users)}명 참여)")

def create_badges():
    """배지 데이터 생성"""
    print("🏅 배지 데이터 생성 중...")
    
    # 기존 배지들 삭제 (중복 방지)
    ChallengeBadge.objects.all().delete()
    Badge.objects.all().delete()
    UserChallengeBadge.objects.all().delete()
    print("   🗑️ 기존 배지들 삭제 완료")
    
    # 챌린지 배지
    challenge_badges = [
        {
            'name': '첫 챌린지',
            'description': '첫 번째 챌린지에 참여',
            'icon': '🎯',
            'condition_type': 'completion',
            'condition_value': 1
        },
        {
            'name': '연속 성공',
            'description': '7일 연속 성공',
            'icon': '🔥',
            'condition_type': 'streak',
            'condition_value': 7
        },
        {
            'name': '완벽한 주',
            'description': '한 주 동안 모든 목표 달성',
            'icon': '⭐',
            'condition_type': 'perfect_week',
            'condition_value': 1
        },
        {
            'name': '챌린지 마스터',
            'description': '총 30일 성공',
            'icon': '👑',
            'condition_type': 'total_success',
            'condition_value': 30
        }
    ]
    
    for badge_data in challenge_badges:
        badge = ChallengeBadge.objects.create(**badge_data)
        print(f"   ✅ 챌린지 배지 생성: {badge.name}")
    
    # 캘린더 배지
    calendar_badges = [
        {
            'name': '첫 기록',
            'description': '첫 번째 식단 기록',
            'icon': '📝',
            'condition_type': 'first_meal'
        },
        {
            'name': '일주일 연속',
            'description': '7일 연속 기록',
            'icon': '📅',
            'condition_type': 'streak_7'
        },
        {
            'name': '단백질 마스터',
            'description': '단백질 목표 달성',
            'icon': '💪',
            'condition_type': 'protein_goal'
        },
        {
            'name': '완벽한 주',
            'description': '한 주 동안 모든 목표 달성',
            'icon': '⭐',
            'condition_type': 'perfect_week'
        },
        {
            'name': '야채 파워',
            'description': '야채 섭취 목표 달성',
            'icon': '🥬',
            'condition_type': 'veggie_power'
        },
        {
            'name': '수분 섭취',
            'description': '수분 섭취 목표 달성',
            'icon': '💧',
            'condition_type': 'hydration'
        }
    ]
    
    for badge_data in calendar_badges:
        badge = Badge.objects.create(**badge_data)
        print(f"   ✅ 캘린더 배지 생성: {badge.name}")
    
    # 사용자들에게 배지 부여
    users = User.objects.all()
    for user in users:
        # 랜덤하게 배지 부여
        for badge in ChallengeBadge.objects.all():
            if random.random() < 0.3:  # 30% 확률
                UserChallengeBadge.objects.get_or_create(
                    user=user,
                    badge=badge,
                    defaults={'earned_at': date.today() - timedelta(days=random.randint(1, 30))}
                )
        
        for badge in Badge.objects.all():
            if random.random() < 0.4:  # 40% 확률
                UserBadge.objects.get_or_create(
                    user=user,
                    badge=badge,
                    defaults={'earned_at': date.today() - timedelta(days=random.randint(1, 30))}
                )
    
    print("✅ 배지 데이터 생성 완료")

def create_calendar_data():
    """캘린더 데이터 생성"""
    print("📅 캘린더 데이터 생성 중...")
    
    users = User.objects.all()
    start_date = date.today() - timedelta(days=30)
    
    for user in users:
        # 사용자의 챌린지 정보 가져오기
        user_challenge = UserChallenge.objects.filter(user=user).first()
        
        # 챌린지 목표 칼로리를 캘린더 목표로 사용
        if user_challenge:
            target_calorie = user_challenge.room.target_calorie
        else:
            target_calorie = random.randint(1400, 2200)
        
        # 캘린더 프로필 생성
        calendar_profile, created = CalendarUserProfile.objects.get_or_create(
            user=user,
            defaults={
                'calorie_goal': target_calorie,
                'protein_goal': int(target_calorie * 0.2 / 4),  # 칼로리의 20%를 단백질로
                'carbs_goal': int(target_calorie * 0.5 / 4),    # 칼로리의 50%를 탄수화물로
                'fat_goal': int(target_calorie * 0.3 / 9)       # 칼로리의 30%를 지방으로
            }
        )
        
        # 일일 목표 생성
        for day in range(30):
            current_date = start_date + timedelta(days=day)
            
            goal_texts = [
                f"{current_date.strftime('%m월 %d일')} 칼로리 목표 달성하기",
                f"{current_date.strftime('%m월 %d일')} 단백질 섭취 목표 달성하기",
                f"{current_date.strftime('%m월 %d일')} 규칙적인 식사하기",
                f"{current_date.strftime('%m월 %d일')} 채소 섭취 늘리기"
            ]
            
            daily_goal, created = DailyGoal.objects.get_or_create(
                user=user,
                date=current_date,
                defaults={
                    'goal_text': random.choice(goal_texts),
                    'is_completed': random.random() > 0.3  # 70% 달성률
                }
            )
        
        # 주간 분석 생성 (챌린지와 연관)
        for week in range(4):
            week_start = start_date + timedelta(weeks=week)
            
            # 사용자의 챌린지 성공률 기반으로 주간 데이터 생성
            if user_challenge:
                # 챌린지 성공률에 따라 칼로리 달성률 조정
                success_rate = user_challenge.total_success_days / max(1, (date.today() - user_challenge.challenge_start_date).days + 1)
                calorie_achievement_rate = min(0.95, max(0.5, success_rate + random.uniform(-0.1, 0.1)))
                
                # 목표 칼로리 기준으로 실제 섭취 칼로리 계산
                avg_calories = int(target_calorie * calorie_achievement_rate)
            else:
                avg_calories = random.randint(1400, 2200)
                calorie_achievement_rate = random.uniform(0.6, 0.9)
            
            weekly_analysis, created = WeeklyAnalysis.objects.get_or_create(
                user=user,
                week_start=week_start,
                defaults={
                    'avg_calories': avg_calories,
                    'avg_protein': int(avg_calories * 0.2 / 4),
                    'avg_carbs': int(avg_calories * 0.5 / 4),
                    'avg_fat': int(avg_calories * 0.3 / 9),
                    'calorie_achievement_rate': calorie_achievement_rate,
                    'protein_achievement_rate': random.uniform(0.7, 0.95),
                    'carbs_achievement_rate': random.uniform(0.6, 0.9),
                    'fat_achievement_rate': random.uniform(0.6, 0.9),
                    'ai_advice': random.choice([
                        f'이번 주 {target_calorie}kcal 목표 대비 {calorie_achievement_rate*100:.0f}% 달성했습니다!',
                        '단백질 섭취가 부족합니다. 닭가슴살이나 생선을 더 많이 섭취해보세요.',
                        '탄수화물 섭취가 과다합니다. 현미밥으로 대체하는 것을 권장합니다.',
                        '지방 섭취가 적절합니다. 건강한 지방 섭취를 계속 유지해보세요.',
                        '전반적으로 균형잡힌 식단을 유지하고 있습니다. 훌륭합니다!'
                    ])
                }
            )
    
    print("✅ 캘린더 데이터 생성 완료")

def create_ai_coach_tips():
    """AI 코치 팁 생성"""
    print("🤖 AI 코치 팁 생성 중...")
    
    tips_data = [
        {
            'message': '오늘 칼로리 섭취가 목표보다 높습니다. 저녁 식사에서 채소를 더 많이 섭취해보세요!',
            'type': 'warning',
            'priority': 'medium'
        },
        {
            'message': '단백질 섭취가 부족합니다. 닭가슴살이나 생선을 추가로 섭취하는 것을 권장합니다.',
            'type': 'suggestion',
            'priority': 'high'
        },
        {
            'message': '체중이 안정적으로 감소하고 있습니다. 꾸준한 노력이 좋은 결과를 만들어내고 있어요!',
            'type': 'encouragement',
            'priority': 'low'
        },
        {
            'message': '탄수화물 섭취가 과다합니다. 현미밥이나 잡곡밥으로 대체해보세요.',
            'type': 'warning',
            'priority': 'medium'
        },
        {
            'message': '규칙적인 식사 시간을 잘 지키고 계시네요. 이는 건강한 신진대사에 도움이 됩니다.',
            'type': 'encouragement',
            'priority': 'low'
        },
        {
            'message': '오늘 운동을 하셨나요? 적절한 운동은 칼로리 소모에 큰 도움이 됩니다.',
            'type': 'suggestion',
            'priority': 'medium'
        },
        {
            'message': '수분 섭취가 부족합니다. 하루 2L 이상의 물을 마시는 것을 권장합니다.',
            'type': 'warning',
            'priority': 'low'
        }
    ]
    
    ai_tips = []
    for tip_data in tips_data:
        tip = AICoachTip(**tip_data)
        ai_tips.append(tip)
    
    AICoachTip.objects.bulk_create(ai_tips)
    print(f"✅ {len(ai_tips)}개의 AI 코치 팁 생성 완료")

def main():
    """메인 실행 함수"""
    print("🚀 완전한 시연용 데이터 생성 시작")
    print("=" * 60)
    
    # 1. 기존 데이터 정리
    clear_existing_data()
    
    # 2. 사용자 계정 생성
    users = create_demo_users()
    
    # 3. 한달치 데이터 생성 (오늘부터 30일 전까지)
    start_date = date.today() - timedelta(days=30)
    
    # 식단 데이터 생성
    create_meal_data()
    
    # 체중 기록 생성
    for user in users:
        if user.username == 'demo_user':
            create_weight_records_for_user(user, start_date, 60)  # 김시연은 2달치
        else:
            create_weight_records_for_user(user, start_date, 30)  # 다른 사용자는 1달치
    
    # 4. 챌린지 데이터 생성
    create_challenge_data()
    
    # 5. 배지 데이터 생성
    create_badges()
    
    # 6. 캘린더 데이터 생성
    create_calendar_data()
    
    # 7. AI 코치 팁 생성
    create_ai_coach_tips()
    
    print("=" * 60)
    print("🎉 완전한 시연용 데이터 생성 완료!")
    print("\n📊 생성된 데이터 요약:")
    print(f"   - 사용자: {len(users)}명")
    print(f"   - 식단 기록: {MealLog.objects.count()}개")
    print(f"   - 체중 기록: {WeightRecord.objects.count()}개")
    print(f"   - 챌린지 룸: {ChallengeRoom.objects.count()}개")
    print(f"   - 챌린지 참여: {UserChallenge.objects.count()}개")
    print(f"   - 일일 챌린지 기록: {DailyChallengeRecord.objects.count()}개")
    print(f"   - 챌린지 배지: {ChallengeBadge.objects.count()}개")
    print(f"   - 캘린더 배지: {Badge.objects.count()}개")
    print(f"   - 사용자 배지: {UserChallengeBadge.objects.count() + UserBadge.objects.count()}개")
    print(f"   - 일일 목표: {DailyGoal.objects.count()}개")
    print(f"   - 주간 분석: {WeeklyAnalysis.objects.count()}개")
    print(f"   - AI 코치 팁: {AICoachTip.objects.count()}개")
    
    print("\n🔑 로그인 정보:")
    for user in users:
        print(f"   - 사용자명: {user.username}")
        print(f"   - 비밀번호: {user.username}123!")
        print(f"   - 이메일: {user.email}")
        print(f"   - 닉네임: {user.profile.nickname}")
        print()

if __name__ == '__main__':
    main()
