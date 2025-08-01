import os
import sys
import django
from datetime import datetime, timedelta, date
import random

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api_integrated.models import MealLog, WeightRecord
from challenges.models import ChallengeRoom, UserChallenge

def main():
    try:
        # xoxoda@naver.com 사용자 찾기
        user = User.objects.get(email='xoxoda@naver.com')
        print(f"✅ 사용자 찾음: {user.username} ({user.email})")
        
        # 30일치 식사 데이터 추가
        today = date.today()
        korean_foods = [
            ("김치찌개", 350), ("된장찌개", 280), ("불고기", 420), ("비빔밥", 480),
            ("냉면", 380), ("삼겹살", 520), ("갈비탕", 450), ("김밥", 320),
            ("라면", 400), ("치킨", 580), ("피자", 650), ("햄버거", 550),
            ("짜장면", 480), ("짬뽕", 520), ("탕수육", 600), ("볶음밥", 420)
        ]
        
        # 기존 데이터 삭제
        deleted_meals = MealLog.objects.filter(user=user).delete()[0]
        deleted_weights = WeightRecord.objects.filter(user=user).delete()[0]
        print(f"🗑️ 기존 데이터 삭제: 식사 {deleted_meals}개, 체중 {deleted_weights}개")
        
        created_meals = 0
        for i in range(30):
            meal_date = today - timedelta(days=29-i)
            meals_per_day = random.randint(2, 4)
            meal_types = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
            selected_meals = random.sample(meal_types, meals_per_day)
            
            for meal_type in selected_meals:
                food_name, base_calories = random.choice(korean_foods)
                calories = int(base_calories * random.uniform(0.8, 1.2))
                
                if meal_type == 'Breakfast':
                    time_hour = random.randint(7, 9)
                    prefix = "아침"
                elif meal_type == 'Lunch':
                    time_hour = random.randint(12, 14)
                    prefix = "점심"
                elif meal_type == 'Dinner':
                    time_hour = random.randint(18, 20)
                    prefix = "저녁"
                else:
                    time_hour = random.randint(15, 17)
                    prefix = "간식"
                
                MealLog.objects.create(
                    user=user,
                    date=meal_date,
                    mealType=meal_type,
                    foodName=f"{prefix} {food_name}",
                    calories=calories,
                    carbs=int(calories * 0.6 / 4),
                    protein=int(calories * 0.2 / 4),
                    fat=int(calories * 0.2 / 9),
                    nutriScore=random.choice(['A', 'B', 'C', 'D', 'E']),
                    time=datetime.strptime(f"{time_hour}:{random.randint(0,59):02d}", '%H:%M').time()
                )
                created_meals += 1
        
        print(f"✅ {created_meals}개의 식사 기록 생성 완료")
        
        # 14일치 체중 데이터 추가
        base_weight = 70
        created_weights = 0
        for i in range(14):
            weight_date = today - timedelta(days=13-i)
            weight_change = random.uniform(-0.5, 0.5)
            weight = round(base_weight + weight_change, 1)
            base_weight = weight
            
            WeightRecord.objects.create(
                user=user,
                weight=weight,
                date=weight_date
            )
            created_weights += 1
        
        print(f"✅ {created_weights}개의 체중 기록 생성 완료")
        
        # 챌린지 참여 데이터 추가
        challenges = ChallengeRoom.objects.all()[:2]
        created_challenges = 0
        for challenge in challenges:
            if not UserChallenge.objects.filter(user=user, room=challenge, status='active').exists():
                UserChallenge.objects.create(
                    user=user,
                    room=challenge,
                    status='active',
                    user_height=170.0,  # 기본 키 170cm
                    user_weight=70.0,   # 기본 체중 70kg
                    user_target_weight=65.0,  # 목표 체중 65kg
                    user_challenge_duration_days=30,  # 30일 챌린지
                    remaining_duration_days=30,
                    user_weekly_cheat_limit=1
                )
                created_challenges += 1
                print(f"🏆 챌린지 참여: {challenge.name}")
        
        print(f"✅ {created_challenges}개의 챌린지 참여 완료")
        print(f"\n🎉 {user.email} 계정에 테스트 데이터 추가 완료!")
        
    except User.DoesNotExist:
        print("❌ xoxoda@naver.com 사용자를 찾을 수 없습니다.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()