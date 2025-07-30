"""
추천 시스템 테스트 명령어
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api_integrated.recommendation_engine import FoodRecommendationEngine

class Command(BaseCommand):
    help = '추천 시스템을 테스트합니다'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            default='testuser',
            help='테스트할 사용자명'
        )
        parser.add_argument(
            '--type',
            type=str,
            default='personalized',
            choices=['personalized', 'alternatives', 'nutrition', 'meal_plan'],
            help='추천 타입'
        )
    
    def handle(self, *args, **options):
        username = options['user']
        recommendation_type = options['type']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'사용자 {username}을 찾을 수 없습니다.')
            )
            return
        
        recommendation_engine = FoodRecommendationEngine()
        
        self.stdout.write(f'사용자 {username}에 대한 {recommendation_type} 추천 테스트 시작...')
        self.stdout.write('=' * 50)
        
        try:
            if recommendation_type == 'personalized':
                # 개인화된 추천
                for meal_type in ['breakfast', 'lunch', 'dinner', 'snack']:
                    recommendations = recommendation_engine.get_personalized_recommendations(
                        user, meal_type, count=3
                    )
                    
                    self.stdout.write(f'\n{meal_type.upper()} 추천:')
                    for i, rec in enumerate(recommendations, 1):
                        self.stdout.write(
                            f'  {i}. {rec["name"]} ({rec["calories"]}kcal, {rec["grade"]}등급)'
                        )
            
            elif recommendation_type == 'alternatives':
                # 건강한 대안 추천
                test_foods = ['라면', '치킨', '피자', '햄버거']
                
                for food in test_foods:
                    alternatives = recommendation_engine.get_healthy_alternatives(food, count=3)
                    
                    self.stdout.write(f'\n{food}의 건강한 대안:')
                    for i, alt in enumerate(alternatives, 1):
                        self.stdout.write(
                            f'  {i}. {alt["name"]} ({alt["calories"]}kcal) - {alt["reason"]}'
                        )
            
            elif recommendation_type == 'nutrition':
                # 영양소 중심 추천
                nutrients = ['protein', 'carbs', 'fat']
                
                for nutrient in nutrients:
                    recommendations = recommendation_engine.get_nutrition_focused_recommendations(
                        user, nutrient
                    )
                    
                    self.stdout.write(f'\n{nutrient.upper()} 중심 추천:')
                    for i, rec in enumerate(recommendations[:3], 1):
                        self.stdout.write(
                            f'  {i}. {rec["name"]} ({rec["calories"]}kcal) - {rec["reason"]}'
                        )
            
            elif recommendation_type == 'meal_plan':
                # 균형 잡힌 식단 계획
                meal_plan = recommendation_engine.get_balanced_meal_plan(user, target_calories=2000)
                
                self.stdout.write('\n균형 잡힌 식단 계획 (2000kcal 기준):')
                for meal_type, plan in meal_plan.items():
                    self.stdout.write(f'\n{meal_type.upper()}:')
                    self.stdout.write(f'  목표 칼로리: {plan["target_calories"]}kcal')
                    self.stdout.write(f'  실제 칼로리: {plan["total_calories"]}kcal')
                    self.stdout.write('  추천 음식:')
                    for food in plan['recommended_foods']:
                        self.stdout.write(f'    - {food["name"]} ({food["calories"]}kcal)')
            
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write(
                self.style.SUCCESS(f'{recommendation_type} 추천 테스트 완료')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'추천 테스트 실패: {str(e)}')
            )