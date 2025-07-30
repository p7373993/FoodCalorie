"""
추천 엔진 시스템
"""
import pandas as pd
from datetime import datetime, timedelta, date
from django.db.models import Count, Avg, Sum, Q
from django.conf import settings
from .models import MealLog
from .utils import load_food_data
import random

class FoodRecommendationEngine:
    """음식 추천 엔진"""
    
    def __init__(self):
        self.food_df = load_food_data()
    
    def get_personalized_recommendations(self, user, meal_type='lunch', count=5):
        """개인화된 음식 추천"""
        # 사용자 선호도 분석
        user_preferences = self._analyze_user_preferences(user)
        
        # 영양 요구사항 분석
        nutrition_needs = self._analyze_nutrition_needs(user)
        
        # 시간대별 추천
        time_based_foods = self._get_time_based_foods(meal_type)
        
        # 계절별 추천
        seasonal_foods = self._get_seasonal_foods()
        
        # 추천 점수 계산
        recommendations = self._calculate_recommendation_scores(
            user_preferences, nutrition_needs, time_based_foods, seasonal_foods
        )
        
        # 상위 추천 음식 반환
        return recommendations[:count]
    
    def get_healthy_alternatives(self, food_name, count=3):
        """건강한 대안 음식 추천"""
        if not self.food_df is not None:
            return self._get_default_alternatives(food_name)
        
        try:
            # 현재 음식 정보 찾기
            current_food = self.food_df[self.food_df['식품명'].str.contains(food_name, na=False)]
            
            if current_food.empty:
                return self._get_default_alternatives(food_name)
            
            current_calories = current_food.iloc[0]['에너지(kcal)']
            current_category = current_food.iloc[0]['식품대분류명']
            
            # 같은 카테고리에서 더 건강한 음식 찾기
            alternatives = self.food_df[
                (self.food_df['식품대분류명'] == current_category) &
                (self.food_df['에너지(kcal)'] < current_calories * 0.8) &
                (self.food_df['kfni_grade'].isin(['A', 'B']))
            ].head(count)
            
            if alternatives.empty:
                # 카테고리 상관없이 건강한 음식 추천
                alternatives = self.food_df[
                    (self.food_df['에너지(kcal)'] < current_calories) &
                    (self.food_df['kfni_grade'].isin(['A', 'B']))
                ].head(count)
            
            recommendations = []
            for _, food in alternatives.iterrows():
                recommendations.append({
                    'name': food['식품명'],
                    'calories': food['에너지(kcal)'],
                    'grade': food['kfni_grade'],
                    'reason': f"칼로리가 {current_calories - food['에너지(kcal)']}kcal 낮아요",
                    'category': food['식품대분류명']
                })
            
            return recommendations
            
        except Exception as e:
            print(f"건강한 대안 추천 실패: {e}")
            return self._get_default_alternatives(food_name)
    
    def get_balanced_meal_plan(self, user, target_calories=2000):
        """균형 잡힌 식단 계획 추천"""
        # 칼로리 배분 (아침 25%, 점심 35%, 저녁 30%, 간식 10%)
        calorie_distribution = {
            'breakfast': target_calories * 0.25,
            'lunch': target_calories * 0.35,
            'dinner': target_calories * 0.30,
            'snack': target_calories * 0.10
        }
        
        meal_plan = {}
        
        for meal_type, target_cal in calorie_distribution.items():
            recommendations = self.get_personalized_recommendations(
                user, meal_type, count=3
            )
            
            # 목표 칼로리에 맞는 음식 조합 찾기
            best_combination = self._find_best_calorie_combination(
                recommendations, target_cal
            )
            
            meal_plan[meal_type] = {
                'target_calories': target_cal,
                'recommended_foods': best_combination,
                'total_calories': sum(food['calories'] for food in best_combination)
            }
        
        return meal_plan
    
    def get_nutrition_focused_recommendations(self, user, focus_nutrient='protein'):
        """특정 영양소 중심 추천"""
        if not self.food_df is not None:
            return self._get_default_nutrition_foods(focus_nutrient)
        
        try:
            nutrient_columns = {
                'protein': '단백질(g)',
                'carbs': '당류(g)',
                'fat': '포화지방산(g)',
                'fiber': '식이섬유(g)',
                'calcium': '칼슘(mg)',
                'iron': '철(mg)'
            }
            
            column = nutrient_columns.get(focus_nutrient, '단백질(g)')
            
            # 해당 영양소가 풍부한 음식 찾기
            high_nutrient_foods = self.food_df[
                (self.food_df[column] > self.food_df[column].quantile(0.8)) &
                (self.food_df['kfni_grade'].isin(['A', 'B', 'C']))
            ].sort_values(column, ascending=False).head(10)
            
            recommendations = []
            for _, food in high_nutrient_foods.iterrows():
                recommendations.append({
                    'name': food['식품명'],
                    'calories': food['에너지(kcal)'],
                    'nutrient_value': food[column],
                    'grade': food['kfni_grade'],
                    'reason': f"{focus_nutrient} 함량이 높아요 ({food[column]})",
                    'category': food['식품대분류명']
                })
            
            return recommendations
            
        except Exception as e:
            print(f"영양소 중심 추천 실패: {e}")
            return self._get_default_nutrition_foods(focus_nutrient)
    
    def _analyze_user_preferences(self, user):
        """사용자 선호도 분석"""
        # 최근 30일간의 식사 기록 분석
        recent_meals = MealLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=30)
        )
        
        # 자주 먹는 음식 TOP 10
        frequent_foods = recent_meals.values('foodName').annotate(
            count=Count('foodName')
        ).order_by('-count')[:10]
        
        # 선호하는 칼로리 범위
        avg_calories = recent_meals.aggregate(avg=Avg('calories'))['avg'] or 300
        
        # 선호하는 식사 시간대
        meal_type_preference = recent_meals.values('mealType').annotate(
            count=Count('mealType')
        ).order_by('-count')
        
        return {
            'frequent_foods': list(frequent_foods),
            'preferred_calorie_range': (avg_calories * 0.8, avg_calories * 1.2),
            'meal_type_preference': list(meal_type_preference),
            'total_meals': recent_meals.count()
        }
    
    def _analyze_nutrition_needs(self, user):
        """영양 요구사항 분석"""
        recent_meals = MealLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=7)
        )
        
        # 평균 영양소 섭취량
        avg_nutrition = recent_meals.aggregate(
            avg_carbs=Avg('carbs'),
            avg_protein=Avg('protein'),
            avg_fat=Avg('fat')
        )
        
        # 권장량과 비교
        recommended = {'carbs': 300, 'protein': 60, 'fat': 65}  # 일반 성인 기준
        
        needs = {}
        for nutrient in ['carbs', 'protein', 'fat']:
            current = avg_nutrition[f'avg_{nutrient}'] or 0
            target = recommended[nutrient]
            
            if current < target * 0.7:
                needs[nutrient] = 'increase'
            elif current > target * 1.3:
                needs[nutrient] = 'decrease'
            else:
                needs[nutrient] = 'maintain'
        
        return needs
    
    def _get_time_based_foods(self, meal_type):
        """시간대별 적합한 음식"""
        time_foods = {
            'breakfast': ['계란', '토스트', '시리얼', '요거트', '과일', '우유'],
            'lunch': ['밥', '국', '찌개', '볶음', '구이', '샐러드'],
            'dinner': ['고기', '생선', '채소', '국물', '찜', '조림'],
            'snack': ['과일', '견과류', '요거트', '빵', '과자']
        }
        
        return time_foods.get(meal_type, time_foods['lunch'])
    
    def _get_seasonal_foods(self):
        """계절별 추천 음식"""
        current_month = datetime.now().month
        
        seasonal_foods = {
            'spring': ['나물', '죽순', '딸기', '봄나물'],  # 3-5월
            'summer': ['냉면', '수박', '참외', '오이'],    # 6-8월
            'autumn': ['감', '배', '고구마', '밤'],        # 9-11월
            'winter': ['김치', '국물', '찜', '전골']       # 12-2월
        }
        
        if current_month in [3, 4, 5]:
            season = 'spring'
        elif current_month in [6, 7, 8]:
            season = 'summer'
        elif current_month in [9, 10, 11]:
            season = 'autumn'
        else:
            season = 'winter'
        
        return seasonal_foods[season]
    
    def _calculate_recommendation_scores(self, preferences, needs, time_foods, seasonal_foods):
        """추천 점수 계산"""
        if not self.food_df is not None:
            return self._get_default_recommendations()
        
        try:
            recommendations = []
            
            # 각 음식에 대해 점수 계산
            for _, food in self.food_df.iterrows():
                score = 0
                food_name = food['식품명']
                
                # 사용자 선호도 점수 (40%)
                if any(pref['foodName'] in food_name for pref in preferences['frequent_foods']):
                    score += 40
                
                # 칼로리 적합성 점수 (20%)
                cal_min, cal_max = preferences['preferred_calorie_range']
                if cal_min <= food['에너지(kcal)'] <= cal_max:
                    score += 20
                
                # 영양 등급 점수 (20%)
                grade_scores = {'A': 20, 'B': 15, 'C': 10, 'D': 5, 'E': 0}
                score += grade_scores.get(food.get('kfni_grade', 'C'), 10)
                
                # 시간대 적합성 점수 (10%)
                if any(time_food in food_name for time_food in time_foods):
                    score += 10
                
                # 계절 적합성 점수 (10%)
                if any(seasonal_food in food_name for seasonal_food in seasonal_foods):
                    score += 10
                
                if score > 30:  # 최소 점수 기준
                    recommendations.append({
                        'name': food_name,
                        'calories': food['에너지(kcal)'],
                        'grade': food.get('kfni_grade', 'C'),
                        'score': score,
                        'category': food.get('식품대분류명', '기타'),
                        'protein': food.get('단백질(g)', 0),
                        'carbs': food.get('당류(g)', 0),
                        'fat': food.get('포화지방산(g)', 0)
                    })
            
            # 점수순으로 정렬
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations
            
        except Exception as e:
            print(f"추천 점수 계산 실패: {e}")
            return self._get_default_recommendations()
    
    def _find_best_calorie_combination(self, foods, target_calories):
        """목표 칼로리에 맞는 최적 조합 찾기"""
        if not foods:
            return []
        
        # 단일 음식으로 목표에 가까운 것 찾기
        best_single = min(foods, key=lambda x: abs(x['calories'] - target_calories))
        
        # 조합으로 더 나은 결과가 있는지 확인
        best_combination = [best_single]
        best_diff = abs(best_single['calories'] - target_calories)
        
        # 2개 조합 시도
        for i, food1 in enumerate(foods):
            for j, food2 in enumerate(foods[i+1:], i+1):
                combo_calories = food1['calories'] + food2['calories']
                diff = abs(combo_calories - target_calories)
                
                if diff < best_diff and combo_calories <= target_calories * 1.2:
                    best_combination = [food1, food2]
                    best_diff = diff
        
        return best_combination
    
    def _get_default_recommendations(self):
        """기본 추천 음식"""
        return [
            {'name': '비빔밥', 'calories': 380, 'grade': 'B', 'score': 80, 'category': '밥류'},
            {'name': '김치찌개', 'calories': 320, 'grade': 'B', 'score': 75, 'category': '찌개류'},
            {'name': '불고기', 'calories': 450, 'grade': 'C', 'score': 70, 'category': '고기류'},
            {'name': '계란후라이', 'calories': 180, 'grade': 'B', 'score': 65, 'category': '계란류'},
            {'name': '사과', 'calories': 80, 'grade': 'A', 'score': 60, 'category': '과일류'}
        ]
    
    def _get_default_alternatives(self, food_name):
        """기본 대안 음식"""
        alternatives = {
            '라면': [
                {'name': '메밀국수', 'calories': 200, 'grade': 'B', 'reason': '칼로리가 낮아요'},
                {'name': '우동', 'calories': 250, 'grade': 'B', 'reason': '나트륨이 적어요'}
            ],
            '치킨': [
                {'name': '닭가슴살', 'calories': 165, 'grade': 'A', 'reason': '단백질이 풍부해요'},
                {'name': '생선구이', 'calories': 200, 'grade': 'A', 'reason': '건강한 단백질이에요'}
            ]
        }
        
        for key in alternatives:
            if key in food_name:
                return alternatives[key]
        
        return [
            {'name': '샐러드', 'calories': 150, 'grade': 'A', 'reason': '칼로리가 낮아요'},
            {'name': '과일', 'calories': 80, 'grade': 'A', 'reason': '비타민이 풍부해요'}
        ]
    
    def _get_default_nutrition_foods(self, nutrient):
        """기본 영양소별 음식"""
        nutrition_foods = {
            'protein': [
                {'name': '닭가슴살', 'calories': 165, 'nutrient_value': 31, 'grade': 'A'},
                {'name': '계란', 'calories': 155, 'nutrient_value': 13, 'grade': 'A'},
                {'name': '두부', 'calories': 76, 'nutrient_value': 8, 'grade': 'A'}
            ],
            'carbs': [
                {'name': '현미밥', 'calories': 112, 'nutrient_value': 23, 'grade': 'B'},
                {'name': '고구마', 'calories': 86, 'nutrient_value': 20, 'grade': 'A'},
                {'name': '바나나', 'calories': 89, 'nutrient_value': 23, 'grade': 'A'}
            ],
            'fat': [
                {'name': '아보카도', 'calories': 160, 'nutrient_value': 15, 'grade': 'A'},
                {'name': '견과류', 'calories': 600, 'nutrient_value': 50, 'grade': 'B'},
                {'name': '올리브오일', 'calories': 884, 'nutrient_value': 100, 'grade': 'B'}
            ]
        }
        
        return nutrition_foods.get(nutrient, nutrition_foods['protein'])