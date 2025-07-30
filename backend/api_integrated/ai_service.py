"""
AI 서비스 모듈 - Gemini API 및 MLServer 연동
"""
import base64
import requests
import json
import re
from django.conf import settings
from datetime import datetime
from .models import MealLog

class AIAnalysisService:
    """AI 분석 서비스 클래스"""
    
    def __init__(self):
        self.gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None)
        self.ml_server_url = getattr(settings, 'ML_SERVER_URL', 'http://localhost:8001')
    
    def analyze_image_with_mlserver(self, image_file):
        """MLServer를 사용한 이미지 분석"""
        try:
            image_file.seek(0)
            files = {'file': (image_file.name, image_file, image_file.content_type)}
            
            response = requests.post(
                f'{self.ml_server_url}/api/v1/estimate',
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"MLServer 오류: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"MLServer 호출 실패: {e}")
            return None
    
    def analyze_image_with_gemini(self, image_path):
        """Gemini API를 사용한 이미지 분석"""
        if not self.gemini_api_key:
            return None
            
        try:
            with open(image_path, 'rb') as img_file:
                img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            prompt = {
                "contents": [
                    {"role": "user", "parts": [
                        {"text": "이 이미지의 음식을 분석해주세요. JSON 형태로 답해주세요:\n{\"음식명\": \"음식이름\", \"질량\": 100, \"칼로리\": 200}\n\n질량이 추정하기 어려운 경우 0으로 표시해주세요."},
                        {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}
                    ]}
                ]
            }
            
            api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}'
            
            response = requests.post(api_url, json=prompt, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                text = response_data['candidates'][0]['content']['parts'][0]['text']
                
                # JSON 추출
                text = text.replace('```json', '').replace('```', '').strip()
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                
                if json_match:
                    try:
                        return json.loads(json_match.group(0))
                    except json.JSONDecodeError:
                        pass
            
            return None
            
        except Exception as e:
            print(f"Gemini API 호출 실패: {e}")
            return None
    
    def generate_ai_feedback(self, user, food_name, calories, mass, grade):
        """AI 피드백 생성"""
        if not self.gemini_api_key:
            return self._get_default_feedback(food_name, calories, grade)
        
        try:
            # 오늘 먹은 음식 정보 수집
            today = datetime.now().date()
            today_logs = MealLog.objects.filter(user=user, date=today)
            today_meal_list = ', '.join([log.foodName for log in today_logs])
            today_total_calories = sum([log.calories for log in today_logs])
            
            # 권장 칼로리 (사용자별 설정이 있다면 그것을 사용, 없으면 기본값)
            recommended_calories = getattr(user, 'recommended_calories', 2000)
            remaining_calories = recommended_calories - today_total_calories
            
            prompt = f"""
오늘 {food_name}을(를) 드셨습니다.
- 현재까지 섭취한 총 칼로리: {today_total_calories}kcal
- 남은 권장 칼로리: {remaining_calories}kcal
- 오늘 먹은 음식 목록: {today_meal_list}

이 정보를 바탕으로, 아래 형식으로 건강한 식습관을 위한 코멘트와 구체적인 조언을 주세요.

1. 한 줄 코멘트 (예: '오늘 점심은 단백질이 풍부해서 좋아요! 남은 칼로리도 잘 관리해보세요.')
2. 구체적인 조언 (2~3문장, 예: '나트륨 섭취가 많으니 저녁에는 싱겁게 드세요. 채소를 더 추가하면 영양 균형에 도움이 됩니다.')

※ 대체 음식 추천은 하지 마세요. 이미 먹은 음식에 대한 피드백만 주세요.
※ 친근하고 격려하는 톤으로 답변해 주세요.
"""
            
            api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}'
            
            response = requests.post(api_url, json={
                "contents": [
                    {"role": "user", "parts": [{"text": prompt}]}
                ]
            }, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                feedback = response_data['candidates'][0]['content']['parts'][0]['text']
                return feedback.strip()
            else:
                return self._get_default_feedback(food_name, calories, grade)
                
        except Exception as e:
            print(f"AI 피드백 생성 실패: {e}")
            return self._get_default_feedback(food_name, calories, grade)
    
    def _get_default_feedback(self, food_name, calories, grade):
        """기본 피드백 생성"""
        if grade in ['A', 'B']:
            return f"{food_name}은(는) 건강한 선택입니다! 칼로리는 {calories}kcal입니다."
        elif grade == 'C':
            return f"{food_name}의 칼로리는 {calories}kcal입니다. 적당한 칼로리네요."
        else:
            return f"{food_name}의 칼로리는 {calories}kcal로 높은 편입니다. 다음 식사는 가볍게 드세요."

class NutritionCalculator:
    """영양소 계산 클래스"""
    
    @staticmethod
    def estimate_mass_from_calories(food_name, calories):
        """칼로리로부터 질량 추정"""
        # 음식 종류별 칼로리 밀도 (kcal/100g)
        density_map = {
            '밥': 1.2, '쌀': 1.2,
            '고기': 2.5, '육류': 2.5, '돈까스': 2.5,
            '면': 1.1, '국수': 1.1, '라면': 1.1,
            '빵': 2.8, '과자': 2.8,
            '과일': 0.6, '사과': 0.6, '바나나': 0.6,
            '야채': 0.3, '채소': 0.3, '샐러드': 0.3
        }
        
        for keyword, density in density_map.items():
            if keyword in food_name:
                return round(calories / density, 1)
        
        return round(calories / 2.0, 1)  # 기본값
    
    @staticmethod
    def calculate_nutrition_score(food_name, calories, mass, grade):
        """영양 점수 계산"""
        grade_scores = {
            'A': 15, 'B': 10, 'C': 5, 'D': 3, 'E': 1
        }
        
        base_score = grade_scores.get(grade, 8)
        
        # 칼로리 기반 보너스/페널티
        if calories < 300:
            bonus = 3
        elif calories < 600:
            bonus = 1
        else:
            bonus = -2
        
        final_score = max(1, min(15, base_score + bonus))
        return final_score