"""
AI 코칭 시스템
사용자의 식사 기록과 체중 변화를 분석하여 개인화된 코칭 메시지를 제공합니다.
"""
from django.conf import settings
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, Count
from .models import MealLog, WeightRecord
from django.contrib.auth.models import User
import json

# OpenAI 모듈 선택적 임포트
try:
    import openai
    OPENAI_AVAILABLE = True
    # OpenAI API 키 설정
    openai.api_key = getattr(settings, 'OPENAI_API_KEY', None)
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

class AICoach:
    """AI 코칭 시스템 클래스"""
    
    def __init__(self, user):
        self.user = user
        
    def get_weekly_data(self):
        """최근 7일간의 사용자 데이터를 수집합니다."""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=7)
        
        # 식사 기록 데이터
        meals = MealLog.objects.filter(
            user=self.user,
            created_at__date__range=[start_date, end_date]
        ).order_by('created_at')
        
        # 체중 기록 데이터
        weights = WeightRecord.objects.filter(
            user=self.user,
            created_at__date__range=[start_date, end_date]
        ).order_by('created_at')
        
        # 일별 칼로리 통계
        daily_calories = {}
        daily_meals = {}
        
        for meal in meals:
            date_str = meal.created_at.date().strftime('%Y-%m-%d')
            if date_str not in daily_calories:
                daily_calories[date_str] = 0
                daily_meals[date_str] = []
            
            daily_calories[date_str] += meal.calories
            daily_meals[date_str].append({
                'name': meal.food_name,
                'calories': meal.calories,
                'meal_type': meal.meal_type,
                'nutri_score': meal.nutri_score
            })
        
        # 체중 변화
        weight_data = []
        for weight in weights:
            weight_data.append({
                'date': weight.created_at.date().strftime('%Y-%m-%d'),
                'weight': float(weight.weight)
            })
        
        return {
            'daily_calories': daily_calories,
            'daily_meals': daily_meals,
            'weight_data': weight_data,
            'total_days': 7,
            'period': f"{start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}"
        }
    
    def generate_weekly_report(self):
        """주간 리포트를 생성합니다."""
        data = self.get_weekly_data()
        
        # 통계 계산
        total_calories = sum(data['daily_calories'].values())
        avg_daily_calories = total_calories / 7 if total_calories > 0 else 0
        total_meals = sum(len(meals) for meals in data['daily_meals'].values())
        
        # 체중 변화 계산
        weight_change = 0
        if len(data['weight_data']) >= 2:
            weight_change = data['weight_data'][-1]['weight'] - data['weight_data'][0]['weight']
        
        # 영양 점수 분석
        nutri_scores = []
        for meals in data['daily_meals'].values():
            for meal in meals:
                if meal['nutri_score']:
                    nutri_scores.append(meal['nutri_score'])
        
        # OpenAI가 사용 가능하고 API 키가 설정된 경우에만 AI 리포트 생성
        if OPENAI_AVAILABLE and openai and getattr(openai, 'api_key', None):
            try:
                return self._generate_ai_report(data, avg_daily_calories, weight_change, nutri_scores)
            except Exception as e:
                print(f"AI 리포트 생성 실패: {e}")
                return self._generate_basic_report(data, avg_daily_calories, weight_change, nutri_scores)
        else:
            # OpenAI가 없거나 API 키가 없는 경우 기본 리포트 반환
            return self._generate_basic_report(data, avg_daily_calories, weight_change, nutri_scores)
    
    def _generate_basic_report(self, data, avg_daily_calories, weight_change, nutri_scores):
        """기본 주간 리포트를 생성합니다."""
        report = f"""
# 📊 주간 건강 리포트

## 📅 분석 기간
{data['period']}

## 🔥 칼로리 분석
- **일평균 칼로리**: {avg_daily_calories:.0f}kcal
- **주간 총 칼로리**: {sum(data['daily_calories'].values()):.0f}kcal
- **식사 횟수**: {sum(len(meals) for meals in data['daily_meals'].values())}회

## ⚖️ 체중 변화
"""
        
        if weight_change > 0:
            report += f"- **체중 증가**: +{weight_change:.1f}kg 📈\n"
        elif weight_change < 0:
            report += f"- **체중 감소**: {weight_change:.1f}kg 📉\n"
        else:
            report += "- **체중 유지**: 변화 없음 ➡️\n"
        
        report += "\n## 🥗 영양 점수 분석\n"
        
        if nutri_scores:
            a_count = nutri_scores.count('A')
            b_count = nutri_scores.count('B')
            c_count = nutri_scores.count('C')
            d_count = nutri_scores.count('D')
            
            report += f"- A등급: {a_count}회 🟢\n"
            report += f"- B등급: {b_count}회 🟡\n"
            report += f"- C등급: {c_count}회 🟠\n"
            report += f"- D등급: {d_count}회 🔴\n"
        else:
            report += "- 영양 점수 데이터가 없습니다.\n"
        
        report += "\n## 💡 개선 제안\n"
        
        if avg_daily_calories < 1200:
            report += "- 칼로리 섭취가 부족합니다. 균형 잡힌 식사를 늘려보세요.\n"
        elif avg_daily_calories > 2500:
            report += "- 칼로리 섭취가 많습니다. 식사량을 조절해보세요.\n"
        else:
            report += "- 적절한 칼로리 섭취를 유지하고 있습니다.\n"
        
        if len(nutri_scores) > 0:
            good_ratio = (nutri_scores.count('A') + nutri_scores.count('B')) / len(nutri_scores)
            if good_ratio < 0.5:
                report += "- 영양 점수가 낮은 음식이 많습니다. 건강한 식품을 선택해보세요.\n"
            else:
                report += "- 좋은 영양 점수를 유지하고 있습니다. 계속 유지하세요!\n"
        
        return report
    
    def _generate_ai_report(self, data, avg_daily_calories, weight_change, nutri_scores):
        """OpenAI를 사용한 개인화된 리포트를 생성합니다."""
        
        # 프롬프트 구성
        prompt = f"""
당신은 전문 영양사이자 건강 코치입니다. 사용자의 주간 식사 기록을 분석하여 개인화된 건강 리포트를 작성해주세요.

## 사용자 데이터 ({data['period']})
- 일평균 칼로리: {avg_daily_calories:.0f}kcal
- 주간 총 칼로리: {sum(data['daily_calories'].values()):.0f}kcal
- 총 식사 횟수: {sum(len(meals) for meals in data['daily_meals'].values())}회
- 체중 변화: {weight_change:+.1f}kg

## 일별 식사 기록:
"""
        
        for date, meals in data['daily_meals'].items():
            prompt += f"\n**{date}** ({data['daily_calories'].get(date, 0):.0f}kcal):\n"
            for meal in meals:
                prompt += f"- {meal['meal_type']}: {meal['name']} ({meal['calories']}kcal, {meal['nutri_score']}등급)\n"
        
        prompt += """

다음 형식으로 친근하고 격려적인 톤으로 리포트를 작성해주세요:

# 📊 주간 건강 리포트

## 📅 분석 기간
[기간]

## 🔥 칼로리 분석
[칼로리 섭취 패턴 분석]

## ⚖️ 체중 변화
[체중 변화에 대한 분석과 조언]

## 🥗 영양 분석
[영양 점수와 식품 선택에 대한 분석]

## 💡 맞춤 조언
[개인화된 개선 제안 3-4가지]

## 🎯 다음 주 목표
[구체적이고 실현 가능한 목표 제시]

한국어로 작성하고, 이모지를 적절히 사용하여 친근하게 작성해주세요.
"""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 전문 영양사이자 건강 코치입니다. 사용자의 건강 데이터를 분석하여 친근하고 격려적인 조언을 제공합니다."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"OpenAI API 오류: {e}")
            return self._generate_basic_report(data, avg_daily_calories, weight_change, nutri_scores)

def generate_weekly_report(user):
    """사용자의 주간 리포트를 생성하는 헬퍼 함수"""
    coach = AICoach(user)
    return coach.generate_weekly_report()