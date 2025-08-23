"""
LLM 기반 챌린지 분석 서비스
사용자의 칼로리 데이터를 분석하여 개인화된 조언 제공
"""
import json
from typing import Dict, List, Any
from datetime import date, timedelta
from django.db.models import Avg, Sum
from api_integrated.models import MealLog
from .models import UserChallenge, DailyChallengeRecord


class ChallengeAnalysisService:
    """LLM 기반 챌린지 분석 서비스"""
    
    def analyze_user_challenge(self, user_challenge: UserChallenge) -> Dict[str, Any]:
        """사용자 챌린지 데이터를 분석하여 LLM 조언 생성"""
        
        # 1. 사용자 데이터 수집
        user_data = self._collect_user_data(user_challenge)
        
        # 2. LLM 프롬프트 생성
        prompt = self._generate_analysis_prompt(user_data)
        
        # 3. LLM 분석 (현재는 규칙 기반으로 구현, 추후 실제 LLM 연동 가능)
        analysis = self._analyze_with_rules(user_data)
        
        return {
            'analysis': analysis,
            'user_data_summary': user_data,
            'recommendations': self._generate_recommendations(user_data, analysis)
        }
    
    def _collect_user_data(self, user_challenge: UserChallenge) -> Dict[str, Any]:
        """사용자 챌린지 관련 데이터 수집"""
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        # 기본 챌린지 정보
        challenge_info = {
            'target_calorie': user_challenge.room.target_calorie,
            'tolerance': user_challenge.room.tolerance,
            'challenge_type': 'diet' if user_challenge.room.target_calorie <= 2000 else 'bulk',
            'start_date': user_challenge.challenge_start_date,
            'duration_days': (today - user_challenge.challenge_start_date).days + 1,
            'current_streak': user_challenge.current_streak_days,
            'max_streak': user_challenge.max_streak_days,
            'total_success': user_challenge.total_success_days,
            'total_failure': user_challenge.total_failure_days
        }
        
        # 최근 7일 식사 데이터
        recent_meals = []
        daily_calories = []
        
        for i in range(7):
            target_date = today - timedelta(days=6-i)
            
            # 해당 날짜의 식사 기록
            day_meals = MealLog.objects.filter(
                user=user_challenge.user,
                date=target_date
            ).values('mealType', 'calories', 'protein', 'carbs', 'fat')
            
            # 일일 총 칼로리
            day_total = MealLog.objects.filter(
                user=user_challenge.user,
                date=target_date
            ).aggregate(
                total_calories=Sum('calories'),
                total_protein=Sum('protein'),
                total_carbs=Sum('carbs'),
                total_fat=Sum('fat')
            )
            
            # 챌린지 성공 여부
            daily_record = DailyChallengeRecord.objects.filter(
                user_challenge=user_challenge,
                date=target_date
            ).first()
            
            daily_data = {
                'date': target_date.isoformat(),
                'day_name': ['월', '화', '수', '목', '금', '토', '일'][target_date.weekday()],
                'meals': list(day_meals),
                'total_calories': day_total['total_calories'] or 0,
                'total_protein': day_total['total_protein'] or 0,
                'total_carbs': day_total['total_carbs'] or 0,
                'total_fat': day_total['total_fat'] or 0,
                'is_success': daily_record.is_success if daily_record else False,
                'is_cheat_day': daily_record.is_cheat_day if daily_record else False
            }
            
            recent_meals.append(daily_data)
            daily_calories.append(day_total['total_calories'] or 0)
        
        # 통계 계산
        avg_calories = sum(daily_calories) / len(daily_calories) if daily_calories else 0
        success_rate = challenge_info['total_success'] / max(1, challenge_info['duration_days']) * 100
        recent_success_rate = sum(1 for day in recent_meals if day['is_success']) / 7 * 100
        
        return {
            'challenge_info': challenge_info,
            'recent_meals': recent_meals,
            'statistics': {
                'avg_daily_calories': round(avg_calories, 1),
                'success_rate': round(success_rate, 1),
                'recent_success_rate': round(recent_success_rate, 1),
                'calorie_variance': self._calculate_variance(daily_calories),
                'consistency_score': self._calculate_consistency_score(daily_calories, challenge_info['target_calorie'])
            }
        }
    
    def _calculate_variance(self, calories_list: List[float]) -> float:
        """칼로리 변동성 계산"""
        if len(calories_list) < 2:
            return 0
        
        avg = sum(calories_list) / len(calories_list)
        variance = sum((x - avg) ** 2 for x in calories_list) / len(calories_list)
        return round(variance ** 0.5, 1)  # 표준편차
    
    def _calculate_consistency_score(self, calories_list: List[float], target: int) -> float:
        """일관성 점수 계산 (0-100)"""
        if not calories_list:
            return 0
        
        # 목표 칼로리 대비 편차의 평균
        deviations = [abs(cal - target) for cal in calories_list if cal > 0]
        if not deviations:
            return 0
        
        avg_deviation = sum(deviations) / len(deviations)
        # 편차가 적을수록 높은 점수 (최대 100점)
        consistency = max(0, 100 - (avg_deviation / target * 100))
        return round(consistency, 1)
    
    def _analyze_performance(self, stats: Dict, challenge_info: Dict) -> Dict[str, Any]:
        """전반적인 성과 분석"""
        success_rate = stats['success_rate']
        current_streak = challenge_info['current_streak']
        
        if success_rate >= 80 and current_streak >= 7:
            level = 'excellent'
            message = f"최고의 성과입니다! 성공률 {success_rate:.1f}%에 현재 {current_streak}일 연속 성공 중이시네요."
        elif success_rate >= 60:
            level = 'good'
            message = f"좋은 성과를 내고 있어요. 성공률 {success_rate:.1f}%로 꾸준히 목표를 향해 나아가고 있습니다."
        elif success_rate >= 40:
            level = 'average'
            message = f"평균적인 성과입니다. 성공률 {success_rate:.1f}%입니다. 조금 더 노력하면 더 좋은 결과를 얻을 수 있어요."
        else:
            level = 'needs_improvement'
            message = f"개선이 필요해 보여요. 성공률이 {success_rate:.1f}%입니다. 다시 한번 목표를 점검해봅시다."
            
        return {
            'level': level,
            'message': message,
            'success_rate': success_rate,
            'current_streak': current_streak
        }

    def _analyze_with_rules(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """규칙 기반 분석 (LLM 형식으로 변환)"""
        challenge_info = user_data['challenge_info']
        stats = user_data['statistics']
        recent_meals = user_data['recent_meals']
        
        # 기존 분석 결과
        performance = self._analyze_performance(stats, challenge_info)
        calorie_pattern = self._analyze_calorie_pattern(recent_meals, challenge_info)
        consistency = self._analyze_consistency(stats)
        recent_trend = self._analyze_recent_trend(recent_meals)
        feasibility = self._analyze_feasibility(stats, challenge_info)
        
        # LLM 형식으로 변환
        analysis = {
            'llm_generated': False,
            'overall_assessment': performance['message'],
            'key_findings': [
                calorie_pattern.get('message', '칼로리 패턴을 분석 중입니다.'),
                consistency.get('message', '식단 일관성을 확인 중입니다.'),
                recent_trend.get('message', '최근 트렌드를 분석 중입니다.')
            ],
            'feasibility_analysis': feasibility['message'],
            'improvement_suggestions': self._generate_rule_based_suggestions(stats, challenge_info, calorie_pattern, consistency),
            'motivation_message': self._generate_motivation_message(stats, challenge_info)
        }
        
        return analysis
    
    def _generate_rule_based_suggestions(self, stats: Dict, challenge_info: Dict, calorie_pattern: Dict, consistency: Dict) -> List[str]:
        """규칙 기반 개선 제안 생성"""
        suggestions = []
        
        # 칼로리 패턴 기반 제안
        pattern = calorie_pattern.get('pattern', '')
        if pattern == 'over_eating':
            suggestions.append("간식을 줄이고 식사량을 조절해보세요")
        elif pattern == 'under_eating':
            if challenge_info['challenge_type'] == 'diet':
                suggestions.append("너무 무리하지 마시고 건강한 범위에서 칼로리를 섭취하세요")
            else:
                suggestions.append("목표 달성을 위해 건강한 고칼로리 음식을 추가해보세요")
        
        # 일관성 기반 제안
        if consistency.get('level') in ['inconsistent', 'somewhat_inconsistent']:
            suggestions.append("매일 비슷한 시간에 식사하며 규칙적인 패턴을 만들어보세요")
        
        # 성공률 기반 제안
        if stats['success_rate'] < 60:
            suggestions.append("현재 목표가 어렵다면 조금 더 달성 가능한 목표로 조정해보세요")
        elif stats['success_rate'] >= 80:
            suggestions.append("훌륭한 성과입니다! 현재 패턴을 계속 유지해보세요")
        
        # 기본 제안 (최소 3개 보장)
        if len(suggestions) < 3:
            default_suggestions = [
                "식단 계획을 미리 세워 체계적으로 관리해보세요",
                "꾸준한 기록과 모니터링으로 패턴을 파악해보세요",
                "작은 목표부터 차근차근 달성해나가세요"
            ]
            for suggestion in default_suggestions:
                if suggestion not in suggestions and len(suggestions) < 3:
                    suggestions.append(suggestion)
        
        return suggestions[:3]  # 최대 3개
    
    def _generate_motivation_message(self, stats: Dict, challenge_info: Dict) -> str:
        """동기부여 메시지 생성"""
        success_rate = stats['success_rate']
        current_streak = challenge_info['current_streak']
        
        if success_rate >= 80:
            return f"정말 훌륭해요! {success_rate:.1f}%의 높은 성공률을 보이고 있어요. 이 흐름을 계속 유지하세요! 🎉"
        elif success_rate >= 60:
            return f"잘하고 있어요! {success_rate:.1f}%의 성공률로 꾸준히 발전하고 있어요. 조금만 더 화이팅! 💪"
        elif current_streak >= 3:
            return f"현재 {current_streak}일 연속 성공 중이에요! 이 좋은 흐름을 놓치지 마세요. 🔥"
        elif success_rate >= 30:
            return "포기하지 마세요! 작은 변화가 큰 결과를 만들어요. 오늘부터 다시 시작해봐요! ✨"
        else:
            return "새로운 시작이에요! 완벽하지 않아도 괜찮아요. 하루하루 조금씩 나아가면 됩니다. 화이팅! 🌟"
    

    
    def _analyze_calorie_pattern(self, recent_meals: List[Dict], challenge_info: Dict) -> Dict[str, Any]:
        """칼로리 패턴 분석"""
        target = challenge_info['target_calorie']
        challenge_type = challenge_info['challenge_type']
        
        daily_calories = [day['total_calories'] for day in recent_meals if day['total_calories'] > 0]
        if not daily_calories:
            return {'message': '최근 식사 기록이 부족해요.'}
        
        avg_calories = sum(daily_calories) / len(daily_calories)
        
        if challenge_type == 'diet':
            if avg_calories <= target - 100:
                pattern = 'under_eating'
                message = f"평균 {avg_calories:.0f}kcal로 목표보다 많이 적게 드시고 있어요. 너무 무리하지 마세요."
            elif avg_calories <= target + challenge_info['tolerance']:
                pattern = 'on_track'
                message = f"평균 {avg_calories:.0f}kcal로 목표 범위 내에서 잘 관리하고 있어요!"
            else:
                pattern = 'over_eating'
                message = f"평균 {avg_calories:.0f}kcal로 목표보다 많이 드시고 있어요. 조금 줄여보세요."
        else:  # bulk
            if avg_calories >= target + 100:
                pattern = 'good_bulk'
                message = f"평균 {avg_calories:.0f}kcal로 벌크업 목표를 잘 달성하고 있어요!"
            elif avg_calories >= target - challenge_info['tolerance']:
                pattern = 'on_track'
                message = f"평균 {avg_calories:.0f}kcal로 목표 범위에서 관리하고 있어요."
            else:
                pattern = 'under_eating'
                message = f"평균 {avg_calories:.0f}kcal로 벌크업 목표에 부족해요. 더 드셔야 해요."
        
        return {
            'pattern': pattern,
            'message': message,
            'avg_calories': round(avg_calories, 0),
            'target_calories': target
        }
    
    def _analyze_consistency(self, stats: Dict) -> Dict[str, Any]:
        """일관성 분석"""
        consistency_score = stats['consistency_score']
        variance = stats['calorie_variance']
        
        if consistency_score >= 80:
            level = 'very_consistent'
            message = f"매우 일관된 식단을 유지하고 있어요! (일관성: {consistency_score:.1f}점)"
        elif consistency_score >= 60:
            level = 'consistent'
            message = f"비교적 일관된 식단이에요. (일관성: {consistency_score:.1f}점)"
        elif consistency_score >= 40:
            level = 'somewhat_inconsistent'
            message = f"식단이 조금 불규칙해요. (일관성: {consistency_score:.1f}점) 더 규칙적으로 드셔보세요."
        else:
            level = 'inconsistent'
            message = f"식단이 많이 불규칙해요. (일관성: {consistency_score:.1f}점) 계획적인 식단 관리가 필요해요."
        
        return {
            'level': level,
            'message': message,
            'score': consistency_score,
            'variance': variance
        }
    
    def _analyze_recent_trend(self, recent_meals: List[Dict]) -> Dict[str, Any]:
        """최근 트렌드 분석"""
        if len(recent_meals) < 4:
            return {'message': '트렌드 분석을 위한 데이터가 부족해요.'}
        
        # 최근 3일 vs 이전 4일 비교
        recent_3days = recent_meals[-3:]
        previous_4days = recent_meals[:4]
        
        recent_success = sum(1 for day in recent_3days if day['is_success'])
        previous_success = sum(1 for day in previous_4days if day['is_success'])
        
        recent_avg_cal = sum(day['total_calories'] for day in recent_3days if day['total_calories'] > 0) / len([d for d in recent_3days if d['total_calories'] > 0]) if any(d['total_calories'] > 0 for d in recent_3days) else 0
        previous_avg_cal = sum(day['total_calories'] for day in previous_4days if day['total_calories'] > 0) / len([d for d in previous_4days if d['total_calories'] > 0]) if any(d['total_calories'] > 0 for d in previous_4days) else 0
        
        if recent_success > previous_success / 4 * 3:
            trend = 'improving'
            message = "최근 성과가 개선되고 있어요! 이 추세를 계속 유지해보세요."
        elif recent_success < previous_success / 4 * 3:
            trend = 'declining'
            message = "최근 성과가 조금 아쉬워요. 다시 집중해서 목표를 달성해보세요."
        else:
            trend = 'stable'
            message = "꾸준한 성과를 보이고 있어요. 현재 패턴을 유지하세요."
        
        return {
            'trend': trend,
            'message': message,
            'recent_success_rate': round(recent_success / 3 * 100, 1),
            'calorie_change': round(recent_avg_cal - previous_avg_cal, 0) if recent_avg_cal > 0 and previous_avg_cal > 0 else 0
        }
    
    def _analyze_feasibility(self, stats: Dict, challenge_info: Dict) -> Dict[str, Any]:
        """챌린지 달성 가능성 분석"""
        success_rate = stats['success_rate']
        current_streak = challenge_info['current_streak']
        remaining_days = max(0, 30 - challenge_info['duration_days'])  # 30일 챌린지 가정
        
        if success_rate >= 80 and current_streak >= 7:
            feasibility = 'very_high'
            message = "현재 페이스라면 챌린지 완주가 매우 유력해요! 계속 화이팅!"
            probability = 90
        elif success_rate >= 60 and current_streak >= 3:
            feasibility = 'high'
            message = "좋은 흐름이에요! 조금만 더 집중하면 목표 달성 가능해요."
            probability = 75
        elif success_rate >= 40:
            feasibility = 'moderate'
            message = "아직 기회가 있어요! 더 꾸준히 노력하면 목표에 도달할 수 있어요."
            probability = 60
        else:
            feasibility = 'challenging'
            message = "목표 달성이 쉽지 않아 보여요. 전략을 다시 세워보는 것이 좋겠어요."
            probability = 40
        
        return {
            'level': feasibility,
            'message': message,
            'probability': probability,
            'remaining_days': remaining_days
        }
    
    def _generate_recommendations(self, user_data: Dict, analysis: Dict) -> List[str]:
        """개인화된 추천사항 생성 (간소화)"""
        if analysis.get('llm_generated'):
            return analysis.get('improvement_suggestions', [])
        else:
            return analysis.get('improvement_suggestions', [])
    
    def _generate_analysis_prompt(self, user_data: Dict[str, Any]) -> str:
        """LLM 분석을 위한 프롬프트 생성 (추후 실제 LLM 연동 시 사용)"""
        challenge_info = user_data['challenge_info']
        stats = user_data['statistics']
        
        prompt = f"""
사용자의 챌린지 데이터를 분석해주세요:

챌린지 정보:
- 목표 칼로리: {challenge_info['target_calorie']}kcal
- 챌린지 타입: {'다이어트' if challenge_info['challenge_type'] == 'diet' else '벌크업'}
- 진행 기간: {challenge_info['duration_days']}일
- 현재 연속 성공: {challenge_info['current_streak']}일
- 전체 성공률: {stats['success_rate']}%

최근 성과:
- 평균 일일 칼로리: {stats['avg_daily_calories']}kcal
- 최근 7일 성공률: {stats['recent_success_rate']}%
- 칼로리 일관성: {stats['consistency_score']}점

분석 요청사항:
1. 현재 성과에 대한 평가
2. 목표 달성 가능성
3. 개선이 필요한 부분
4. 구체적인 실행 방안 3가지

한국어로 친근하고 격려하는 톤으로 답변해주세요.
"""
        return prompt