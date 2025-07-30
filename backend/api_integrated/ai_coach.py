"""
AI 코칭 시스템
"""
import requests
import json
from datetime import datetime, timedelta, date
from django.conf import settings
from django.db.models import Sum, Avg, Count
from .models import MealLog, AICoachTip
from .utils import get_nutrition_from_csv

class AICoachingService:
    """AI 코칭 서비스"""
    
    def __init__(self):
        self.gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None)
        self.api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}'
    
    def generate_daily_coaching(self, user):
        """일일 코칭 메시지 생성"""
        today = date.today()
        
        # 오늘의 식사 데이터 분석
        today_meals = MealLog.objects.filter(user=user, date=today)
        total_calories = today_meals.aggregate(total=Sum('calories'))['total'] or 0
        meal_count = today_meals.count()
        
        # 최근 7일 평균과 비교
        week_ago = today - timedelta(days=7)
        recent_meals = MealLog.objects.filter(user=user, date__gte=week_ago)
        avg_daily_calories = recent_meals.aggregate(avg=Avg('calories'))['avg'] or 0
        
        # 영양소 분석
        nutrition_analysis = self._analyze_nutrition(today_meals)
        
        # 식습관 패턴 분석
        eating_pattern = self._analyze_eating_pattern(user)
        
        # AI 코칭 메시지 생성
        coaching_message = self._generate_coaching_message(
            user, total_calories, meal_count, avg_daily_calories, 
            nutrition_analysis, eating_pattern
        )
        
        # 코칭 팁 저장
        if coaching_message:
            tip_type = self._determine_tip_type(total_calories, avg_daily_calories)
            priority = self._determine_priority(nutrition_analysis, eating_pattern)
            
            AICoachTip.objects.create(
                message=coaching_message,
                type=tip_type,
                priority=priority
            )
        
        return coaching_message
    
    def generate_meal_recommendation(self, user, meal_type='lunch'):
        """식사 추천 생성"""
        # 사용자의 최근 식사 패턴 분석
        recent_meals = MealLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=14)
        ).order_by('-date')
        
        # 오늘 이미 먹은 음식들
        today_meals = MealLog.objects.filter(user=user, date=date.today())
        today_calories = today_meals.aggregate(total=Sum('calories'))['total'] or 0
        today_foods = list(today_meals.values_list('foodName', flat=True))
        
        # 자주 먹는 음식 분석
        frequent_foods = recent_meals.values('foodName').annotate(
            count=Count('foodName')
        ).order_by('-count')[:10]
        
        # 영양소 부족 분석
        nutrition_needs = self._analyze_nutrition_needs(user)
        
        # AI 추천 생성
        recommendation = self._generate_meal_recommendation_ai(
            meal_type, today_calories, today_foods, 
            frequent_foods, nutrition_needs
        )
        
        return recommendation
    
    def generate_weekly_report(self, user):
        """주간 리포트 생성"""
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        # 주간 데이터 수집
        weekly_meals = MealLog.objects.filter(
            user=user,
            date__gte=week_ago,
            date__lte=today
        )
        
        # 통계 계산
        total_calories = weekly_meals.aggregate(total=Sum('calories'))['total'] or 0
        avg_daily_calories = total_calories / 7
        total_meals = weekly_meals.count()
        
        # 영양소 분석
        nutrition_summary = {
            'carbs': weekly_meals.aggregate(total=Sum('carbs'))['total'] or 0,
            'protein': weekly_meals.aggregate(total=Sum('protein'))['total'] or 0,
            'fat': weekly_meals.aggregate(total=Sum('fat'))['total'] or 0
        }
        
        # 등급별 분석
        grade_distribution = {}
        for grade in ['A', 'B', 'C', 'D', 'E']:
            count = weekly_meals.filter(nutriScore=grade).count()
            grade_distribution[grade] = count
        
        # AI 주간 분석 생성
        weekly_analysis = self._generate_weekly_analysis_ai(
            avg_daily_calories, total_meals, nutrition_summary, grade_distribution
        )
        
        return {
            'period': f"{week_ago.strftime('%Y-%m-%d')} ~ {today.strftime('%Y-%m-%d')}",
            'total_calories': total_calories,
            'avg_daily_calories': round(avg_daily_calories, 1),
            'total_meals': total_meals,
            'nutrition_summary': nutrition_summary,
            'grade_distribution': grade_distribution,
            'ai_analysis': weekly_analysis
        }
    
    def _analyze_nutrition(self, meals):
        """영양소 분석"""
        total_carbs = meals.aggregate(total=Sum('carbs'))['total'] or 0
        total_protein = meals.aggregate(total=Sum('protein'))['total'] or 0
        total_fat = meals.aggregate(total=Sum('fat'))['total'] or 0
        
        return {
            'carbs': total_carbs,
            'protein': total_protein,
            'fat': total_fat,
            'carbs_ratio': round((total_carbs * 4) / max(1, total_carbs * 4 + total_protein * 4 + total_fat * 9) * 100, 1),
            'protein_ratio': round((total_protein * 4) / max(1, total_carbs * 4 + total_protein * 4 + total_fat * 9) * 100, 1),
            'fat_ratio': round((total_fat * 9) / max(1, total_carbs * 4 + total_protein * 4 + total_fat * 9) * 100, 1)
        }
    
    def _analyze_eating_pattern(self, user):
        """식습관 패턴 분석"""
        recent_meals = MealLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=14)
        )
        
        # 식사 시간대 분석
        meal_times = {}
        for meal_type in ['breakfast', 'lunch', 'dinner', 'snack']:
            count = recent_meals.filter(mealType=meal_type).count()
            meal_times[meal_type] = count
        
        # 자주 먹는 음식 TOP 5
        frequent_foods = recent_meals.values('foodName').annotate(
            count=Count('foodName')
        ).order_by('-count')[:5]
        
        return {
            'meal_frequency': meal_times,
            'frequent_foods': list(frequent_foods),
            'avg_meals_per_day': recent_meals.count() / 14
        }
    
    def _analyze_nutrition_needs(self, user):
        """영양소 필요량 분석"""
        recent_meals = MealLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=7)
        )
        
        avg_carbs = recent_meals.aggregate(avg=Avg('carbs'))['avg'] or 0
        avg_protein = recent_meals.aggregate(avg=Avg('protein'))['avg'] or 0
        avg_fat = recent_meals.aggregate(avg=Avg('fat'))['avg'] or 0
        
        # 권장량과 비교 (일반적인 성인 기준)
        recommended = {
            'carbs': 300,  # g/day
            'protein': 60,  # g/day
            'fat': 65      # g/day
        }
        
        needs = {}
        for nutrient in ['carbs', 'protein', 'fat']:
            current = locals()[f'avg_{nutrient}']
            target = recommended[nutrient]
            if current < target * 0.8:
                needs[nutrient] = 'low'
            elif current > target * 1.2:
                needs[nutrient] = 'high'
            else:
                needs[nutrient] = 'adequate'
        
        return needs
    
    def _generate_coaching_message(self, user, total_calories, meal_count, avg_calories, nutrition, pattern):
        """실제 Gemini 2.5 Flash로 AI 코칭 메시지 생성"""
        if not self.gemini_api_key:
            print("⚠️ Gemini API 키가 설정되지 않았습니다.")
            return self._get_default_coaching_message(total_calories, meal_count)
        
        try:
            # 오늘 먹은 음식 목록 가져오기
            today_meals = MealLog.objects.filter(user=user, date=date.today())
            today_foods = [f"{meal.foodName}({meal.calories}kcal)" for meal in today_meals]
            
            # 최근 일주일 식습관 패턴
            week_meals = MealLog.objects.filter(
                user=user, 
                date__gte=date.today() - timedelta(days=7)
            )
            
            # 등급별 분포
            grade_counts = {}
            for grade in ['A', 'B', 'C', 'D', 'E']:
                count = week_meals.filter(nutriScore=grade).count()
                if count > 0:
                    grade_counts[grade] = count
            
            prompt = f"""
당신은 전문 영양사이자 건강 코치입니다. 사용자의 식습관 데이터를 분석하여 개인화된 조언을 제공해주세요.

📊 오늘의 식사 현황:
- 총 칼로리: {total_calories}kcal
- 식사 횟수: {meal_count}회
- 오늘 먹은 음식: {', '.join(today_foods) if today_foods else '아직 기록 없음'}

📈 최근 7일 평균:
- 평균 일일 칼로리: {avg_calories:.0f}kcal
- 평균 식사 횟수: {pattern['avg_meals_per_day']:.1f}회

🥗 영양소 비율 (오늘):
- 탄수화물: {nutrition['carbs_ratio']}%
- 단백질: {nutrition['protein_ratio']}%  
- 지방: {nutrition['fat_ratio']}%

🏆 최근 음식 등급 분포:
{', '.join([f'{grade}등급 {count}개' for grade, count in grade_counts.items()]) if grade_counts else '데이터 부족'}

🎯 자주 먹는 음식:
{', '.join([f['foodName'] for f in pattern['frequent_foods'][:3]]) if pattern['frequent_foods'] else '데이터 부족'}

위 정보를 바탕으로 다음 조건에 맞는 코칭 메시지를 생성해주세요:

✅ 조건:
1. 친근하고 격려하는 톤 (반말 사용)
2. 구체적이고 실행 가능한 조언
3. 80-120자 내외의 적절한 길이
4. 이모지 1-2개 사용으로 친근함 표현
5. 현재 상황에 맞는 맞춤형 조언

❌ 피해야 할 것:
- 너무 일반적인 조언
- 부정적이거나 비판적인 표현
- 의학적 진단이나 치료 조언

예시 스타일:
"오늘 단백질이 좀 부족해 보이네! 🥚 내일 아침엔 계란이나 요거트 추가해보는 건 어때?"
"칼로리 관리 잘하고 있어! 👍 다만 채소를 조금 더 늘리면 영양 균형이 더 좋아질 거야."

지금 바로 코칭 메시지만 생성해주세요:
"""
            
            response = requests.post(self.api_url, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 200
                }
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    message = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    # 불필요한 따옴표나 설명 제거
                    message = message.replace('"', '').replace("'", "")
                    if message.startswith('코칭 메시지:'):
                        message = message.replace('코칭 메시지:', '').strip()
                    
                    print(f"✅ Gemini AI 코칭 생성 성공: {message[:50]}...")
                    return message[:250]  # 길이 제한
                else:
                    print("❌ Gemini 응답에 candidates가 없습니다.")
            else:
                print(f"❌ Gemini API 호출 실패: {response.status_code}")
                print(f"응답: {response.text}")
            
        except Exception as e:
            print(f"❌ AI 코칭 메시지 생성 실패: {e}")
        
        return self._get_default_coaching_message(total_calories, meal_count)
    
    def _generate_meal_recommendation_ai(self, meal_type, today_calories, today_foods, frequent_foods, nutrition_needs):
        """실제 Gemini 2.5 Flash로 AI 식사 추천 생성"""
        if not self.gemini_api_key:
            return self._get_default_meal_recommendation(meal_type)
        
        try:
            meal_type_korean = {
                'breakfast': '아침',
                'lunch': '점심', 
                'dinner': '저녁',
                'snack': '간식'
            }.get(meal_type, '식사')
            
            # 권장 칼로리 계산
            recommended_calories = {
                'breakfast': 400,
                'lunch': 600,
                'dinner': 500,
                'snack': 200
            }.get(meal_type, 400)
            
            prompt = f"""
당신은 전문 영양사입니다. 사용자에게 {meal_type_korean} 메뉴를 추천해주세요.

📊 현재 상황:
- 오늘 섭취한 총 칼로리: {today_calories}kcal
- 오늘 먹은 음식: {', '.join(today_foods) if today_foods else '아직 없음'}
- 자주 먹는 음식: {', '.join([f['foodName'] for f in frequent_foods[:5]]) if frequent_foods else '데이터 부족'}

🎯 {meal_type_korean} 권장 칼로리: 약 {recommended_calories}kcal

🥗 영양소 상태:
- 탄수화물: {nutrition_needs.get('carbs', 'adequate')} (low=부족, high=과다, adequate=적정)
- 단백질: {nutrition_needs.get('protein', 'adequate')}
- 지방: {nutrition_needs.get('fat', 'adequate')}

다음 조건에 맞는 추천을 해주세요:
1. 한국 음식 위주로 추천 (김치찌개, 비빔밥, 불고기, 계란후라이 등)
2. 영양 균형을 고려한 메뉴
3. 정확히 3개의 메뉴 추천
4. 각 메뉴별 추천 이유 포함
5. 칼로리는 실제적인 수치로

반드시 아래 JSON 형태로만 응답해주세요:
{{
  "recommendations": [
    {{"name": "음식명", "reason": "추천 이유", "calories": 칼로리숫자}},
    {{"name": "음식명", "reason": "추천 이유", "calories": 칼로리숫자}},
    {{"name": "음식명", "reason": "추천 이유", "calories": 칼로리숫자}}
  ]
}}

다른 설명 없이 JSON만 응답해주세요.
"""
            
            response = requests.post(self.api_url, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.8,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 500
                }
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    
                    # JSON 추출 시도
                    import re
                    json_match = re.search(r'\{.*\}', text, re.DOTALL)
                    if json_match:
                        try:
                            parsed_json = json.loads(json_match.group(0))
                            print(f"✅ Gemini AI 추천 생성 성공: {len(parsed_json.get('recommendations', []))}개")
                            return parsed_json
                        except json.JSONDecodeError as e:
                            print(f"❌ JSON 파싱 실패: {e}")
                            print(f"원본 텍스트: {text}")
                    else:
                        print(f"❌ JSON 형태를 찾을 수 없음: {text}")
                else:
                    print("❌ Gemini 응답에 candidates가 없습니다.")
            else:
                print(f"❌ Gemini API 호출 실패: {response.status_code}")
            
        except Exception as e:
            print(f"❌ AI 식사 추천 생성 실패: {e}")
        
        return self._get_default_meal_recommendation(meal_type)
    
    def _generate_weekly_analysis_ai(self, avg_calories, total_meals, nutrition, grade_dist):
        """실제 Gemini 2.5 Flash로 AI 주간 분석 생성"""
        if not self.gemini_api_key:
            return "이번 주 식습관을 분석한 결과, 전반적으로 양호한 패턴을 보이고 있습니다."
        
        try:
            # 등급별 비율 계산
            total_graded_meals = sum(grade_dist.values())
            grade_percentages = {}
            if total_graded_meals > 0:
                for grade, count in grade_dist.items():
                    grade_percentages[grade] = round((count / total_graded_meals) * 100, 1)
            
            prompt = f"""
당신은 전문 영양사입니다. 사용자의 주간 식습관을 종합 분석하여 친근한 리포트를 작성해주세요.

📊 이번 주 식습관 데이터:
- 일평균 칼로리: {avg_calories:.0f}kcal
- 총 식사 횟수: {total_meals}회 (하루 평균 {total_meals/7:.1f}회)
- 주간 총 영양소: 탄수화물 {nutrition['carbs']:.0f}g, 단백질 {nutrition['protein']:.0f}g, 지방 {nutrition['fat']:.0f}g

🏆 음식 등급 분포:
{', '.join([f'{grade}등급 {count}개({grade_percentages.get(grade, 0)}%)' for grade, count in grade_dist.items() if count > 0]) if grade_dist else '데이터 부족'}

다음 조건에 맞는 주간 분석 리포트를 작성해주세요:

✅ 포함할 내용:
1. 전반적인 식습관 평가 (긍정적 시작)
2. 잘한 점 1-2개 (구체적으로)
3. 개선할 점 1-2개 (건설적으로)
4. 다음 주 실천 가능한 목표 1개

✅ 작성 조건:
- 친근한 반말 톤
- 150-200자 내외
- 이모지 2-3개 사용
- 격려와 동기부여 중심
- 구체적이고 실행 가능한 조언

예시 스타일:
"이번 주 식습관 정말 괜찮았어! 🎉 특히 A등급 음식을 많이 선택한 게 인상적이야. 다만 식사 횟수가 조금 불규칙했으니, 다음 주엔 하루 3끼를 좀 더 챙겨보는 건 어때? 💪 지금처럼만 하면 건강한 식습관 완성이야!"

지금 바로 주간 분석 리포트만 작성해주세요:
"""
            
            response = requests.post(self.api_url, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 300
                }
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    message = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"✅ Gemini AI 주간 분석 생성 성공: {message[:50]}...")
                    return message[:400]  # 길이 제한
                else:
                    print("❌ Gemini 응답에 candidates가 없습니다.")
            else:
                print(f"❌ Gemini API 호출 실패: {response.status_code}")
            
        except Exception as e:
            print(f"❌ AI 주간 분석 생성 실패: {e}")
        
        return "이번 주 식습관을 분석한 결과, 전반적으로 양호한 패턴을 보이고 있어! 💪 계속 이런 식으로 관리하면 건강한 식습관을 유지할 수 있을 거야. 다음 주도 화이팅! 🎉"
    
    def _get_default_coaching_message(self, calories, meal_count):
        """기본 코칭 메시지"""
        if calories < 1200:
            return "오늘 칼로리 섭취가 부족해요. 영양가 있는 식사를 더 드세요!"
        elif calories > 2500:
            return "오늘 칼로리가 높네요. 내일은 가벼운 식사로 조절해보세요."
        elif meal_count < 2:
            return "규칙적인 식사가 중요해요. 하루 3끼를 챙겨드세요!"
        else:
            return "오늘도 건강한 식습관을 유지하고 계시네요. 계속 화이팅!"
    
    def _get_default_meal_recommendation(self, meal_type):
        """기본 식사 추천"""
        recommendations = {
            'breakfast': [
                {"name": "계란후라이", "reason": "단백질이 풍부한 아침 식사", "calories": 180},
                {"name": "요거트", "reason": "가벼우면서 영양가 있는 선택", "calories": 120},
                {"name": "토스트", "reason": "간편하고 든든한 아침 메뉴", "calories": 250}
            ],
            'lunch': [
                {"name": "비빔밥", "reason": "균형 잡힌 영양소 구성", "calories": 380},
                {"name": "김치찌개", "reason": "한국인이 좋아하는 든든한 식사", "calories": 320},
                {"name": "치킨샐러드", "reason": "단백질과 채소가 풍부", "calories": 280}
            ],
            'dinner': [
                {"name": "불고기", "reason": "단백질이 풍부한 저녁 메뉴", "calories": 450},
                {"name": "생선구이", "reason": "건강한 단백질 공급원", "calories": 200},
                {"name": "된장찌개", "reason": "가벼우면서 영양가 있는 선택", "calories": 150}
            ],
            'snack': [
                {"name": "사과", "reason": "비타민과 식이섬유가 풍부", "calories": 80},
                {"name": "견과류", "reason": "건강한 지방과 단백질 공급", "calories": 160},
                {"name": "요거트", "reason": "프로바이오틱스가 풍부", "calories": 120}
            ]
        }
        
        return {"recommendations": recommendations.get(meal_type, recommendations['lunch'])}
    
    def _determine_tip_type(self, today_calories, avg_calories):
        """팁 타입 결정"""
        if today_calories > avg_calories * 1.3:
            return 'warning'
        elif today_calories < avg_calories * 0.7:
            return 'suggestion'
        else:
            return 'encouragement'
    
    def _determine_priority(self, nutrition, pattern):
        """우선순위 결정"""
        if pattern['avg_meals_per_day'] < 2:
            return 'high'
        elif nutrition['protein_ratio'] < 15 or nutrition['carbs_ratio'] > 70:
            return 'medium'
        else:
            return 'low'