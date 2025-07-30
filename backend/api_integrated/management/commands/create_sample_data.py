"""
샘플 데이터 생성 명령어
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api_integrated.models import MealLog, WeightRecord
from datetime import datetime, date, timedelta
import random

class Command(BaseCommand):
    help = '샘플 데이터를 생성합니다'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=1,
            help='생성할 사용자 수'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='생성할 데이터 일수'
        )
    
    def handle(self, *args, **options):
        users_count = options['users']
        days_count = options['days']
        
        self.stdout.write('샘플 데이터 생성 시작...')
        
        # 샘플 음식 데이터
        sample_foods = [
            {'name': '김치찌개', 'calories': 320, 'carbs': 15, 'protein': 18, 'fat': 22, 'grade': 'B'},
            {'name': '불고기', 'calories': 450, 'carbs': 8, 'protein': 35, 'fat': 28, 'grade': 'C'},
            {'name': '계란후라이', 'calories': 180, 'carbs': 2, 'protein': 12, 'fat': 14, 'grade': 'B'},
            {'name': '비빔밥', 'calories': 380, 'carbs': 55, 'protein': 15, 'fat': 12, 'grade': 'B'},
            {'name': '삼겹살', 'calories': 520, 'carbs': 3, 'protein': 25, 'fat': 45, 'grade': 'D'},
            {'name': '사과', 'calories': 80, 'carbs': 20, 'protein': 0, 'fat': 0, 'grade': 'A'},
            {'name': '요거트', 'calories': 120, 'carbs': 18, 'protein': 8, 'fat': 2, 'grade': 'A'},
            {'name': '치킨샐러드', 'calories': 280, 'carbs': 12, 'protein': 25, 'fat': 15, 'grade': 'B'},
        ]
        
        meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        
        # 사용자 생성
        for i in range(users_count):
            username = f'sampleuser{i+1}'
            email = f'sample{i+1}@example.com'
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': f'Sample{i+1}',
                    'last_name': 'User'
                }
            )
            
            if created:
                user.set_password('samplepass123')
                user.save()
                self.stdout.write(f'사용자 생성: {username}')
            
            # 식사 기록 생성
            for day in range(days_count):
                current_date = date.today() - timedelta(days=day)
                
                # 하루에 2-4개의 식사 기록 생성
                daily_meals = random.randint(2, 4)
                used_meal_types = []
                
                for _ in range(daily_meals):
                    # 중복되지 않는 식사 타입 선택
                    available_types = [mt for mt in meal_types if mt not in used_meal_types]
                    if not available_types:
                        break
                    
                    meal_type = random.choice(available_types)
                    used_meal_types.append(meal_type)
                    
                    food = random.choice(sample_foods)
                    
                    MealLog.objects.get_or_create(
                        user=user,
                        date=current_date,
                        mealType=meal_type,
                        foodName=food['name'],
                        defaults={
                            'calories': food['calories'],
                            'carbs': food['carbs'],
                            'protein': food['protein'],
                            'fat': food['fat'],
                            'nutriScore': food['grade'],
                            'time': datetime.now().time()
                        }
                    )
            
            # 체중 기록 생성
            base_weight = random.uniform(60, 80)
            for day in range(0, days_count, 2):  # 이틀에 한 번씩
                current_date = date.today() - timedelta(days=day)
                weight_variation = random.uniform(-1, 1)
                weight = round(base_weight + weight_variation, 1)
                
                WeightRecord.objects.get_or_create(
                    user=user,
                    date=current_date,
                    defaults={'weight': weight}
                )
            
            self.stdout.write(f'사용자 {username}의 데이터 생성 완료')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'샘플 데이터 생성 완료: {users_count}명의 사용자, {days_count}일간의 데이터'
            )
        )