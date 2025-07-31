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
            today_foods = [f"{meal.foodName}({meal.calories}kcal, {meal.nutriScore}등급)" for meal in today_meals]
            
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
            
            # 영양소 목표 대비 분석
            protein_status = "부족" if nutrition['protein_ratio'] < 15 else "적정" if nutrition['protein_ratio'] < 25 else "과다"
            carbs_status = "부족" if nutrition['carbs_ratio'] < 45 else "적정" if nutrition['carbs_ratio'] < 65 else "과다"
            fat_status = "부족" if nutrition['fat_ratio'] < 20 else "적정" if nutrition['fat_ratio'] < 35 else "과다"
            
            # 칼로리 상태 분석
            calorie_status = "부족" if total_calories < 1200 else "적정" if total_calories < 2200 else "과다"
            
            prompt = f"""
당신은 한국의 전문 영양사이자 친근한 건강 코치입니다. 사용자의 식습관을 분석하여 개인화된 조언을 제공해주세요.

📊 사용자 식습관 분석:
- 오늘 총 칼로리: {total_calories}kcal ({calorie_status})
- 식사 횟수: {meal_count}회
- 오늘 먹은 음식: {', '.join(today_foods) if today_foods else '아직 기록 없음'}

📈 최근 7일 패턴:
- 평균 일일 칼로리: {avg_calories:.0f}kcal
- 평균 식사 횟수: {pattern['avg_meals_per_day']:.1f}회
- 자주 먹는 음식: {', '.join([f['foodName'] for f in pattern['frequent_foods'][:3]]) if pattern['frequent_foods'] else '데이터 부족'}

🥗 오늘 영양소 분석:
- 탄수화물: {nutrition['carbs']:.1f}g ({nutrition['carbs_ratio']:.1f}%) - {carbs_status}
- 단백질: {nutrition['protein']:.1f}g ({nutrition['protein_ratio']:.1f}%) - {protein_status}
- 지방: {nutrition['fat']:.1f}g ({nutrition['fat_ratio']:.1f}%) - {fat_status}

🏆 최근 음식 등급 분포:
{', '.join([f'{grade}등급 {count}개' for grade, count in grade_counts.items()]) if grade_counts else '데이터 부족'}

🎯 코칭 요청사항:
다음 조건에 맞는 개인화된 코칭 메시지를 생성해주세요:

✅ 필수 조건:
1. 친근하고 격려하는 톤 (반말 사용, 친구처럼)
2. 현재 상황에 맞는 구체적이고 실행 가능한 조언
3. 100-150자 내외의 적절한 길이
4. 이모지 2-3개 사용으로 친근함 표현
5. 부족한 영양소나 문제점을 우선적으로 언급
6. 한국 음식 위주의 구체적인 추천

🎨 톤 & 스타일:
- "~해봐", "~는 어때?", "~하면 좋을 것 같아" 같은 친근한 표현
- 긍정적이고 동기부여하는 메시지
- 비판보다는 건설적인 제안

📝 예시 스타일:
"오늘 단백질이 좀 부족해 보이네! 🥚 내일 아침엔 계란후라이나 두부조림 추가해보는 건 어때? 근육 건강에 도움될 거야 💪"
"A등급 음식 많이 선택했네, 잘하고 있어! 🎉 다만 칼로리가 조금 높으니 내일은 생선구이나 샐러드로 가볍게 해보자 🥗"

지금 바로 위 조건에 맞는 코칭 메시지만 생성해주세요:
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
            
            # 영양소 부족 상태 분석
            nutrition_advice = []
            if nutrition_needs.get('protein') == 'low':
                nutrition_advice.append("단백질이 부족하므로 고단백 음식 우선")
            if nutrition_needs.get('carbs') == 'low':
                nutrition_advice.append("탄수화물이 부족하므로 에너지 공급 음식 필요")
            if nutrition_needs.get('fat') == 'high':
                nutrition_advice.append("지방 섭취가 많으므로 저지방 음식 권장")
            
            prompt = f"""
당신은 한국의 전문 영양사입니다. 사용자의 개인 데이터를 분석하여 최적의 {meal_type_korean} 메뉴를 추천해주세요.

📊 사용자 현재 상황:
- 오늘 총 섭취 칼로리: {today_calories}kcal
- 오늘 먹은 음식: {', '.join(today_foods) if today_foods else '아직 기록 없음'}
- 자주 먹는 음식 패턴: {', '.join([f['foodName'] for f in frequent_foods[:5]]) if frequent_foods else '데이터 부족'}

🎯 {meal_type_korean} 목표:
- 권장 칼로리: {recommended_calories}kcal 내외
- 영양소 상태: 탄수화물 {nutrition_needs.get('carbs', 'adequate')}, 단백질 {nutrition_needs.get('protein', 'adequate')}, 지방 {nutrition_needs.get('fat', 'adequate')}
- 영양 조언: {', '.join(nutrition_advice) if nutrition_advice else '균형잡힌 영양소 섭취'}

🥘 추천 조건:
1. 한국 전통 음식 위주 (김치찌개, 비빔밥, 불고기, 생선구이, 된장찌개, 닭가슴살, 두부조림 등)
2. 사용자의 영양소 부족/과다 상태 고려
3. 오늘 먹은 음식과 중복 피하기
4. 실제 칼로리와 영양소 정보 기반
5. 정확히 5개 메뉴 추천

📝 각 추천에 포함할 정보:
- name: 구체적인 한국 음식명
- reason: 사용자 상황에 맞는 구체적 추천 이유 (영양소, 칼로리, 건강 효과 등)
- calories: 실제적인 칼로리 수치
- protein: 단백질 함량(g)
- carbs: 탄수화물 함량(g)  
- fat: 지방 함량(g)
- grade: 영양 등급 (A, B, C, D, E)

반드시 아래 JSON 형태로만 응답해주세요:
{{
  "recommendations": [
    {{
      "name": "음식명",
      "reason": "사용자 맞춤 추천 이유 (영양소 분석 포함)",
      "calories": 칼로리숫자,
      "protein": 단백질g,
      "carbs": 탄수화물g,
      "fat": 지방g,
      "grade": "영양등급"
    }},
    // ... 5개 메뉴
  ]
}}

다른 설명이나 텍스트 없이 오직 JSON만 응답해주세요.
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
                    print(f"🔍 Gemini 원본 응답: {text[:200]}...")
                    
                    # JSON 추출 시도 - 여러 패턴으로 시도
                    import re
                    
                    # 패턴 1: 기본 JSON 패턴
                    json_match = re.search(r'\{.*\}', text, re.DOTALL)
                    
                    # 패턴 2: 코드 블록 내 JSON
                    if not json_match:
                        json_match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
                        if json_match:
                            json_match = type('obj', (object,), {'group': lambda x: json_match.group(1)})()
                    
                    # 패턴 3: 백틱 없는 코드 블록
                    if not json_match:
                        json_match = re.search(r'```\s*(\{.*?\})\s*```', text, re.DOTALL)
                        if json_match:
                            json_match = type('obj', (object,), {'group': lambda x: json_match.group(1)})()
                    
                    if json_match:
                        try:
                            json_text = json_match.group(0)
                            # JSON 텍스트 정리
                            json_text = json_text.strip()
                            if json_text.startswith('```'):
                                json_text = re.sub(r'^```[a-z]*\s*', '', json_text)
                                json_text = re.sub(r'\s*```$', '', json_text)
                            
                            parsed_json = json.loads(json_text)
                            print(f"✅ Gemini AI 추천 생성 성공: {len(parsed_json.get('recommendations', []))}개")
                            return parsed_json
                        except json.JSONDecodeError as e:
                            print(f"❌ JSON 파싱 실패: {e}")
                            print(f"정리된 JSON 텍스트: {json_text[:300]}...")
                    else:
                        print(f"❌ JSON 형태를 찾을 수 없음:")
                        print(f"전체 응답: {text}")
                else:
                    print("❌ Gemini 응답에 candidates가 없습니다.")
                    print(f"전체 응답: {result}")
            else:
                print(f"❌ Gemini API 호출 실패: {response.status_code}")
            
        except Exception as e:
            print(f"❌ AI 식사 추천 생성 실패: {e}")
        
        return self._get_default_meal_recommendation(meal_type)
    
    def _generate_weekly_analysis_ai(self, avg_calories, total_meals, nutrition, grade_dist):
        """실제 Gemini 2.5 Flash로 AI 주간 분석 생성"""
        if not self.gemini_api_key:
            return "이번 주 식습관을 분석한 결과, 전반적으로 양호한 패턴을 보이고 있어! 💪 계속 이런 식으로 관리하면 건강한 식습관을 유지할 수 있을 거야. 다음 주도 화이팅! 🎉"
        
        try:
            # 등급별 비율 계산
            total_graded_meals = sum(grade_dist.values())
            grade_percentages = {}
            if total_graded_meals > 0:
                for grade, count in grade_dist.items():
                    grade_percentages[grade] = round((count / total_graded_meals) * 100, 1)
            
            # 영양소 분석
            daily_avg_carbs = nutrition['carbs'] / 7
            daily_avg_protein = nutrition['protein'] / 7
            daily_avg_fat = nutrition['fat'] / 7
            
            # 권장량 대비 분석
            protein_ratio = (daily_avg_protein / 60) * 100  # 권장 60g 기준
            carbs_ratio = (daily_avg_carbs / 300) * 100     # 권장 300g 기준
            fat_ratio = (daily_avg_fat / 65) * 100          # 권장 65g 기준
            
            # 칼로리 상태
            calorie_status = "부족" if avg_calories < 1500 else "적정" if avg_calories < 2200 else "과다"
            
            # 우수한 점과 개선점 분석
            good_points = []
            improvement_points = []
            
            if grade_percentages.get('A', 0) >= 40:
                good_points.append("A등급 음식을 많이 선택")
            if total_meals >= 18:  # 주 3회 이상
                good_points.append("꾸준한 식사 기록")
            if 1800 <= avg_calories <= 2000:
                good_points.append("적절한 칼로리 관리")
            
            if protein_ratio < 80:
                improvement_points.append("단백질 섭취 부족")
            if grade_percentages.get('D', 0) + grade_percentages.get('E', 0) > 20:
                improvement_points.append("저등급 음식 비율이 높음")
            if total_meals < 14:  # 하루 2회 미만
                improvement_points.append("식사 횟수 부족")
            
            prompt = f"""
당신은 한국의 친근한 영양사 코치입니다. 사용자의 주간 식습관을 종합 분석하여 격려와 동기부여 중심의 리포트를 작성해주세요.

📊 이번 주 상세 분석:
- 일평균 칼로리: {avg_calories:.0f}kcal ({calorie_status})
- 총 식사 횟수: {total_meals}회 (하루 평균 {total_meals/7:.1f}회)
- 일평균 영양소: 탄수화물 {daily_avg_carbs:.0f}g, 단백질 {daily_avg_protein:.0f}g, 지방 {daily_avg_fat:.0f}g

🏆 음식 등급 분포:
{', '.join([f'{grade}등급 {count}개({grade_percentages.get(grade, 0):.1f}%)' for grade, count in grade_dist.items() if count > 0]) if grade_dist else '데이터 부족'}

📈 영양소 권장량 대비:
- 단백질: {protein_ratio:.0f}% (권장 60g 기준)
- 탄수화물: {carbs_ratio:.0f}% (권장 300g 기준)  
- 지방: {fat_ratio:.0f}% (권장 65g 기준)

🎯 분석된 강점: {', '.join(good_points) if good_points else '꾸준한 기��� 유지'}
⚠️ 개선 포인트: {', '.join(improvement_points) if improvement_points else '전반적으로 양호'}

다음 조건에 맞는 주간 분석 리포트를 작성해주세요:

✅ 필수 포함 내용:
1. 긍정적인 시작 인사와 전반적 평가
2. 구체적인 잘한 점 1-2개 (데이터 기반)
3. 건설적인 개선점 1-2개 (실행 가능한 조언)
4. 다음 주 구체적인 목표 제시
5. 격려 메시지로 마무리

✅ 작성 스타일:
- 친근한 반말 톤 ("~했어", "~해봐", "~는 어때?")
- 200-300자 내외
- 이모지 3-4개 적절히 사용
- 격려와 동기부여 중심
- 한국 음식 위주의 구체적 제안

📝 예시 톤:
"이번 주 정말 수고했어! 🎉 특히 [구체적 잘한 점]이 인상적이야. 다만 [개선점]을 조금 더 신경쓰면 완벽할 것 같아. 다음 주엔 [구체적 목표]를 목표로 해보는 건 어때? 💪 지금처럼만 하면 건강한 식습관 마스터야! ✨"

지금 바로 위 조건에 맞는 주간 분석 리포트만 작성해주세요:
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
    
    def generate_nutrition_coaching(self, user, focus_nutrient='protein'):
        """영양소 중심 코칭 생성"""
        try:
            # 최근 7일간 영양소 데이터 분석
            week_ago = date.today() - timedelta(days=7)
            recent_meals = MealLog.objects.filter(user=user, date__gte=week_ago)
            
            if not recent_meals.exists():
                return "최근 식사 기록이 없어서 영양소 분석이 어려워요. 식사를 기록해보세요! 📝"
            
            # 영양소별 평균 섭취량 계산
            avg_carbs = recent_meals.aggregate(avg=Avg('carbs'))['avg'] or 0
            avg_protein = recent_meals.aggregate(avg=Avg('protein'))['avg'] or 0
            avg_fat = recent_meals.aggregate(avg=Avg('fat'))['avg'] or 0
            
            # 권장량 대비 비율 계산
            recommended = {'carbs': 300, 'protein': 60, 'fat': 65}  # 일반 성인 기준
            current_values = {'carbs': avg_carbs, 'protein': avg_protein, 'fat': avg_fat}
            
            focus_value = current_values.get(focus_nutrient, 0)
            focus_recommended = recommended.get(focus_nutrient, 60)
            ratio = (focus_value / focus_recommended) * 100 if focus_recommended > 0 else 0
            
            # 영양소별 맞춤 조언 생성
            if focus_nutrient == 'protein':
                if ratio < 80:
                    return f"단백질 섭취가 부족해요! 🥩 현재 하루 평균 {focus_value:.1f}g인데, {focus_recommended}g 정도가 좋아요. 계란, 닭가슴살, 두부를 더 드셔보세요."
                elif ratio > 120:
                    return f"단백질 섭취가 충분해요! 💪 현재 하루 평균 {focus_value:.1f}g로 잘 관리하고 계시네요. 이 수준을 유지하세요."
                else:
                    return f"단백질 섭취가 적절해요! ✅ 하루 평균 {focus_value:.1f}g로 균형 잡힌 식단을 유지하고 계시네요."
            
            elif focus_nutrient == 'carbs':
                if ratio < 70:
                    return f"탄수화물이 부족할 수 있어요. 🍚 현재 하루 평균 {focus_value:.1f}g인데, 적절한 에너지 공급을 위해 현미, 고구마 등을 추가해보세요."
                elif ratio > 130:
                    return f"탄수화물 섭취가 많아요. 🥖 현재 하루 평균 {focus_value:.1f}g인데, 조금 줄이고 단백질과 채소를 늘려보는 건 어때요?"
                else:
                    return f"탄수화물 섭취가 적절해요! 🌾 하루 평균 {focus_value:.1f}g로 균형 잡힌 에너지 공급을 하고 계시네요."
            
            elif focus_nutrient == 'fat':
                if ratio < 70:
                    return f"건강한 지방 섭취를 늘려보세요! 🥑 현재 하루 평균 {focus_value:.1f}g인데, 견과류, 올리브오일, 아보카도를 추가해보세요."
                elif ratio > 130:
                    return f"지방 섭취가 많아요. 🧈 현재 하루 평균 {focus_value:.1f}g인데, 튀김보다는 구이나 찜 요리를 선택해보세요."
                else:
                    return f"지방 섭취가 적절해요! 🌰 하루 평균 {focus_value:.1f}g로 건강한 지방을 잘 섭취하고 계시네요."
            
            else:
                return "지원하지 않는 영양소입니다. protein, carbs, fat 중에서 선택해주세요."
                
        except Exception as e:
            print(f"❌ 영양소 코칭 생성 실패: {e}")
            return f"{focus_nutrient} 중심의 영양 관리를 위해 균형 잡힌 식단을 유지해보세요! 💪"
    
    def generate_meal_analysis_coaching(self, user, meal_data):
        """음식 업로드 결과에 대한 상세 AI 분석 코칭"""
        try:
            food_name = meal_data.get('food_name', '분석된 음식')
            calories = meal_data.get('calories', 0)
            protein = meal_data.get('protein', 0)
            carbs = meal_data.get('carbs', 0)
            fat = meal_data.get('fat', 0)
            mass = meal_data.get('mass', 0)
            grade = meal_data.get('grade', 'B')
            confidence = meal_data.get('confidence', 0.5)
            needs_manual_input = meal_data.get('needs_manual_input', False)
            
            # 사용자의 최근 식습관 패턴 분석
            recent_meals = MealLog.objects.filter(
                user=user,
                date__gte=date.today() - timedelta(days=7)
            )
            
            avg_daily_calories = recent_meals.aggregate(avg=Avg('calories'))['avg'] or 0
            total_meals_week = recent_meals.count()
            
            # 영양소 비율 계산
            total_macros = protein * 4 + carbs * 4 + fat * 9
            protein_ratio = (protein * 4 / max(1, total_macros)) * 100 if total_macros > 0 else 0
            carbs_ratio = (carbs * 4 / max(1, total_macros)) * 100 if total_macros > 0 else 0
            fat_ratio = (fat * 9 / max(1, total_macros)) * 100 if total_macros > 0 else 0
            
            # 칼로리 밀도 계산
            calorie_density = calories / max(1, mass) if mass > 0 else 0
            
            if not self.gemini_api_key:
                return self._get_default_meal_analysis(food_name, calories, grade)
            
            prompt = f"""
당신은 한국의 전문 영양사이자 친근한 AI 코치입니다. 사용자가 방금 분석한 음식에 대해 개인화된 조언을 제공해주세요.

📊 분석된 음식 정보:
- 음식명: {food_name}
- 총 칼로리: {calories}kcal
- 질량: {mass:.1f}g
- 영양 등급: {grade}등급
- AI 신뢰도: {confidence*100:.0f}%

🥗 영양소 구성:
- 단백질: {protein:.1f}g ({protein_ratio:.1f}%)
- 탄수화물: {carbs:.1f}g ({carbs_ratio:.1f}%)
- 지방: {fat:.1f}g ({fat_ratio:.1f}%)
- 칼로리 밀도: {calorie_density:.1f}kcal/g

👤 사용자 식습관 패턴:
- 최근 7일 평균 일일 칼로리: {avg_daily_calories:.0f}kcal
- 주간 총 식사 기록: {total_meals_week}회
- 수동 입력 필요: {'예' if needs_manual_input else '아니오'}

🎯 코칭 요청사항:
다음 조건에 맞는 개인화된 식사 분석 코칭을 제공해주세요:

✅ 필수 포함 내용:
1. 이 음식에 대한 전반적인 평가 (긍정적 시작)
2. 영양소 구성의 장단점 분석
3. 사용자 식습관 패턴과의 연관성
4. 구체적이고 실행 가능한 개선 제안
5. 다음 식사에 대한 조언

✅ 작성 스타일:
- 친근한 반말 톤 ("~했네", "~해봐", "~는 어때?")
- 200-300자 내외
- 이모지 3-4개 사용
- 격려와 동기부여 중심
- 구체적인 한국 음식 추천 포함

📝 예시 스타일:
"이 {food_name} 선택 좋았어! 🎉 특히 단백질이 풍부해서 근육 건강에 도움될 거야. 다만 칼로리가 조금 높으니 다음 식사엔 채소 위주로 가볍게 해보는 건 어때? 🥗 전체적으로 균형 잡힌 식단 유지하고 있으니 이 페이스 계속 유지해! 💪"

지금 바로 위 조건에 맞는 식사 분석 코칭만 생성해주세요:
"""
            
            response = requests.post(self.api_url, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 400
                }
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    message = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"✅ Gemini AI 식사 분석 코칭 생성 성공: {message[:50]}...")
                    return message[:500]  # 길이 제한
                else:
                    print("❌ Gemini 응답에 candidates가 없습니다.")
            else:
                print(f"❌ Gemini API 호출 실패: {response.status_code}")
            
        except Exception as e:
            print(f"❌ AI 식사 분석 코칭 생성 실패: {e}")
        
        return self._get_default_meal_analysis(food_name, calories, grade)
    
    def _get_default_meal_analysis(self, food_name, calories, grade):
        """기본 식사 분석 메시지"""
        if grade in ['A', 'B']:
            return f"{food_name} 좋은 선택이야! 🎉 영양가 있는 음식으로 건강한 식습관을 유지하고 있네. 이런 식으로 계속 관리하면 목표 달성할 수 있을 거야! 💪"
        elif grade == 'C':
            return f"{food_name} 나쁘지 않은 선택이야! 😊 다만 다음 식사엔 채소나 단백질을 조금 더 추가해보는 건 어때? 균형 잡힌 식단이 중요해! 🥗"
        else:
            return f"{food_name} 가끔은 이런 음식도 괜찮아! 😄 다만 다음 식사엔 더 건강한 선택을 해보자. 샐러드나 생선 요리는 어때? 건강한 변화는 작은 선택부터 시작돼! ✨"
    
    def _determine_priority(self, nutrition, pattern):
        """우선순위 결정"""
        if pattern['avg_meals_per_day'] < 2:
            return 'high'
        elif nutrition['protein_ratio'] < 15 or nutrition['carbs_ratio'] > 70:
            return 'medium'
        else:
            return 'low'