import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Avg, Count
from datetime import datetime, timedelta
from .models import GamificationProfile, Badge, Meal, WeightEntry


class GamificationService:
    """게임화 시스템 서비스"""
    
    POINT_RULES = {
        'record_meal': 10,
        'record_weight': 5,
        'create_challenge': 20,
        'join_challenge': 5,
    }
    
    BADGE_RULES = {
        'record_meal': ['첫 식단 기록!'],
        'create_challenge': ['챌린지 개설자'],
    }
    
    @classmethod
    def award_points(cls, user, action):
        """포인트 및 배지 수여"""
        profile, created = GamificationProfile.objects.get_or_create(user=user)
        
        # 포인트 추가
        points = cls.POINT_RULES.get(action, 0)
        profile.add_points(points)
        
        # 배지 확인 및 수여
        badges_awarded = []
        if action in cls.BADGE_RULES:
            for badge_name in cls.BADGE_RULES[action]:
                # 배지가 없으면 생성
                badge, created = Badge.objects.get_or_create(
                    name=badge_name,
                    defaults={'description': f'{badge_name} 배지', 'icon': '🏅'}
                )
                
                if profile.award_badge(badge_name):
                    badges_awarded.append(badge_name)
        
        return points, badges_awarded


class AICoachingService:
    """AI 코칭 서비스 (Gemini API 연동)"""
    
    @classmethod
    def get_meal_coaching(cls, meal_data):
        """식단 코칭 생성"""
        calories = meal_data.get('calories', 580)
        food_name = meal_data.get('food_name', '치킨 샐러드')
        
        prompt = f"""저는 다이어트 중입니다. 방금 '{food_name}'를 먹었고, 영양 정보는 다음과 같습니다: 칼로리 {calories}kcal. 아래 형식에 맞춰 간단하고 격려가 되는 피드백을 한국어로 생성해주세요:

### 긍정적인 피드백
(한두 문장으로 긍정적인 점을 요약)

### 개선점
(개선할 점이나 주의할 점을 한두 문장으로 요약)

### 다음 식사 추천
- (추천 메뉴 1)
- (추천 메뉴 2)"""
        
        return cls._call_gemini_api(prompt)
    
    @classmethod
    def generate_weekly_report(cls, user_data):
        """주간 리포트 생성"""
        avg_calories = user_data.get('avg_calories', 2150)
        meal_count = user_data.get('meal_count', 5)
        weight_change = user_data.get('weight_change', -0.5)
        
        prompt = f"""저는 지난 주에 다이어트를 했습니다. 저의 주간 활동 데이터는 다음과 같습니다: 평균 섭취 칼로리 {avg_calories}kcal, 총 {meal_count}일 식단 기록, 체중 변화 {weight_change}kg. 이 데이터를 바탕으로 아래 형식에 맞춰 개인화된 주간 리포트를 한국어로 생성해주세요:

## 주간 요약
(전체적인 활동에 대한 긍정적인 총평)

### 잘한 점
- (구체적인 칭찬 1)
- (구체적인 칭찬 2)

### 다음 주 제안
- (실천 가능한 구체적인 제안 1)
- (실천 가능한 구체적인 제안 2)"""
        
        return cls._call_gemini_api(prompt)
    
    @classmethod
    def generate_insights(cls, user_data):
        """고급 인사이트 생성"""
        meal_pattern = user_data.get('meal_pattern', '[월: 샐러드 500kcal, 화: 닭가슴살 400kcal, 수: 기록 없음, 목: 피자 1200kcal, 금: 샐러드 550kcal, 토: 파스타 1100kcal, 일: 기록 없음]')
        weight_change = user_data.get('weight_change', -0.5)
        
        prompt = f"""저의 지난 일주일간 식단 및 체중 데이터를 분석해주세요. 데이터는 다음과 같습니다: {meal_pattern}, [주간 체중 변화: {weight_change}kg]. 이 데이터를 바탕으로 아래 형식에 맞춰 저의 식습관 패턴을 분석하고 인사이트를 한국어로 제공해주세요:

## 발견된 패턴
(데이터를 기반으로 한 구체적인 식습관 패턴 분석)

### 긍정적인 점
- (패턴에서 발견된 긍정적인 부분)

### 개선 제안
- (패턴을 개선하기 위한 구체적이고 실천 가능한 제안)"""
        
        return cls._call_gemini_api(prompt)
    
    @classmethod
    def get_user_weekly_data(cls, user):
        """사용자의 주간 데이터 수집"""
        week_ago = datetime.now() - timedelta(days=7)
        
        # 주간 식단 데이터
        meals = Meal.objects.filter(user=user, timestamp__gte=week_ago)
        avg_calories = meals.aggregate(Avg('calories'))['calories__avg'] or 0
        meal_count = meals.count()
        
        # 체중 변화
        weight_entries = WeightEntry.objects.filter(user=user, timestamp__gte=week_ago).order_by('timestamp')
        weight_change = 0
        if weight_entries.count() >= 2:
            weight_change = weight_entries.last().weight - weight_entries.first().weight
        
        # 식단 패턴 생성
        meal_pattern = []
        days = ['월', '화', '수', '목', '금', '토', '일']
        for i in range(7):
            day_date = week_ago + timedelta(days=i)
            day_meals = meals.filter(timestamp__date=day_date.date())
            if day_meals.exists():
                total_calories = sum(meal.calories for meal in day_meals)
                meal_pattern.append(f"{days[i]}: 총 {total_calories}kcal")
            else:
                meal_pattern.append(f"{days[i]}: 기록 없음")
        
        return {
            'avg_calories': round(avg_calories, 0),
            'meal_count': meal_count,
            'weight_change': round(weight_change, 1),
            'meal_pattern': '[' + ', '.join(meal_pattern) + ']'
        }
    
    @classmethod
    def _call_gemini_api(cls, prompt):
        """Gemini API 호출"""
        try:
            api_key = getattr(settings, 'GEMINI_API_KEY', '')
            if not api_key:
                return "AI 코칭 서비스가 설정되지 않았습니다."
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }]
            }
            
            response = requests.post(
                url,
                headers={'Content-Type': 'application/json'},
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('candidates') and result['candidates'][0].get('content'):
                    return result['candidates'][0]['content']['parts'][0]['text']
                else:
                    return "AI 응답을 처리할 수 없습니다."
            else:
                return f"AI 서비스 오류: {response.status_code}"
                
        except requests.exceptions.Timeout:
            return "AI 서비스 응답 시간이 초과되었습니다."
        except requests.exceptions.ConnectionError:
            return "AI 서비스에 연결할 수 없습니다."
        except Exception as e:
            return f"AI 코칭 생성 중 오류가 발생했습니다: {str(e)}"