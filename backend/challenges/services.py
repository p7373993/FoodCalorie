from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Q
from api_integrated.models import MealLog
from .models import (
    UserChallenge, DailyChallengeRecord, CheatDayRequest, 
    ChallengeBadge, UserChallengeBadge, MEAL_TIME_RANGES
)
import logging
from datetime import date, timedelta, time

logger = logging.getLogger('challenges')

# 캐시 관련 기능들을 간단하게 구현 (실제 캐시 시스템이 없는 경우)
class DummyCache:
    @staticmethod
    def get(key, **kwargs):
        return None
    
    @staticmethod
    def set(key, value, **kwargs):
        pass
    
    @staticmethod
    def invalidate_user_cache(user_id):
        pass
    
    @staticmethod
    def invalidate_room_cache(room_id):
        pass

# 캐시가 없는 경우 더미 캐시 사용
try:
    from .cache import ChallengeCache, invalidate_cache_on_change
except ImportError:
    ChallengeCache = DummyCache()
    def invalidate_cache_on_change(cache_types):
        def decorator(func):
            return func
        return decorator

# 성능 모니터링이 없는 경우 더미 데코레이터 사용
try:
    from .optimizations import PerformanceMonitor
except ImportError:
    class PerformanceMonitor:
        @staticmethod
        def measure_query_time(func):
            return func


class ChallengeJudgmentService:
    """챌린지 판정 서비스"""
    
    @PerformanceMonitor.measure_query_time
    @invalidate_cache_on_change(['user_cache', 'leaderboard'])
    def judge_daily_challenge(self, user_challenge: UserChallenge, target_date: date):
        """
        특정 날짜의 일일 챌린지 판정 (캐시 최적화 적용)
        """
        with transaction.atomic():
            # 캐시에서 일일 기록 확인
            cache_key_params = {'user_id': user_challenge.user.id, 'date': target_date.isoformat()}
            cached_record = ChallengeCache.get('daily_record', **cache_key_params)
            
            # 해당 날짜의 총 칼로리 계산
            total_calories = self._calculate_daily_calories(user_challenge.user, target_date)
            target_calories = user_challenge.room.target_calorie
            tolerance = user_challenge.room.tolerance
            
            # 치팅 사용 여부 확인
            is_cheat_day = CheatDayRequest.objects.filter(
                user_challenge=user_challenge,
                date=target_date,
                is_approved=True
            ).exists()
            
            # 성공/실패 판정 (새로운 식사 규칙 포함)
            is_success = self._judge_success(user_challenge, target_date, total_calories, target_calories, tolerance, is_cheat_day)
            
            # 일일 기록 생성/업데이트
            daily_record, created = DailyChallengeRecord.objects.update_or_create(
                user_challenge=user_challenge,
                date=target_date,
                defaults={
                    'total_calories': total_calories,
                    'target_calories': target_calories,
                    'is_success': is_success,
                    'is_cheat_day': is_cheat_day,
                    'meal_count': self._count_meals(user_challenge.user, target_date)
                }
            )
            
            # 일일 기록 캐시 저장
            record_data = {
                'total_calories': total_calories,
                'target_calories': target_calories,
                'is_success': is_success,
                'is_cheat_day': is_cheat_day,
                'meal_count': daily_record.meal_count
            }
            ChallengeCache.set('daily_record', record_data, **cache_key_params)
            
            # 연속 성공 일수 업데이트
            self._update_streak(user_challenge, target_date, is_success, is_cheat_day)
            
            # 통계 업데이트
            self._update_statistics(user_challenge)
            
            # 배지 확인
            self._check_and_award_badges(user_challenge)
            
            # 관련 캐시 무효화
            ChallengeCache.invalidate_user_cache(user_challenge.user.id)
            ChallengeCache.invalidate_room_cache(user_challenge.room.id)
            
            logger.info(f"Daily judgment completed: User {user_challenge.user.id}, Date {target_date}, Success: {is_success}")
            
            return daily_record
    
    def _calculate_daily_calories(self, user, target_date: date) -> float:
        """해당 날짜의 총 칼로리 계산"""
        total_calories = MealLog.objects.filter(
            user=user,
            date=target_date
        ).aggregate(total=Sum('calories'))['total'] or 0.0
        
        return total_calories
    
    def _count_meals(self, user, target_date: date) -> int:
        """해당 날짜의 식사 횟수 계산 (모든 식사)"""
        return MealLog.objects.filter(user=user, date=target_date).count()
    
    def _count_valid_meals(self, user_challenge: UserChallenge, target_date: date) -> int:
        """유효한 시간대의 식사 횟수 계산 (새로운 규칙)"""
        user = user_challenge.user
        cutoff_time = user_challenge.challenge_cutoff_time
        
        valid_meal_count = 0
        meal_logs = MealLog.objects.filter(user=user, date=target_date)
        
        for meal_log in meal_logs:
            # 1. 마감 시간 이후는 무효
            if meal_log.time and meal_log.time > cutoff_time:
                continue
                
            # 2. 식사 타입별 유효 시간대 체크
            if self._is_valid_meal_time(meal_log.mealType, meal_log.time):
                valid_meal_count += 1
                
        return valid_meal_count
    
    def _is_valid_meal_time(self, meal_type: str, meal_time) -> bool:
        """식사 타입과 시간이 유효한지 체크"""
        if not meal_time or meal_type not in MEAL_TIME_RANGES:
            return False
            
        start_hour, end_hour = MEAL_TIME_RANGES[meal_type]
        meal_hour = meal_time.hour
        
        return start_hour <= meal_hour < end_hour
    
    def _judge_success(self, user_challenge: UserChallenge, target_date: date, total_calories: float, target_calories: float, tolerance: int, is_cheat_day: bool) -> bool:
        """새로운 식사 규칙이 적용된 성공/실패 판정"""
        if is_cheat_day:
            return True  # 치팅 데이는 무조건 성공 처리
        
        # 1. 목표 칼로리 ±tolerance 범위 내인지 확인
        calorie_success = abs(total_calories - target_calories) <= tolerance
        
        # 2. 유효한 식사 횟수 체크 (새로운 규칙)
        valid_meal_count = self._count_valid_meals(user_challenge, target_date)
        meal_count_success = valid_meal_count >= user_challenge.min_daily_meals
        
        # 둘 다 만족해야 성공
        return calorie_success and meal_count_success
    
    def _update_streak(self, user_challenge: UserChallenge, target_date: date, is_success: bool, is_cheat_day: bool):
        """연속 성공 일수 업데이트"""
        if is_success:
            if not is_cheat_day:
                # 치팅이 아닌 실제 성공인 경우에만 연속 일수 증가
                user_challenge.current_streak_days += 1
                
                # 최대 연속 성공 일수 업데이트
                if user_challenge.current_streak_days > user_challenge.max_streak_days:
                    user_challenge.max_streak_days = user_challenge.current_streak_days
            # 치팅인 경우 연속 일수 유지 (증가하지 않음)
        else:
            # 실패 시 연속 일수 초기화
            user_challenge.current_streak_days = 0
        
        user_challenge.last_activity_date = target_date
        user_challenge.save()
    
    def _update_statistics(self, user_challenge: UserChallenge):
        """통계 업데이트"""
        # 총 성공/실패 일수 재계산
        records = DailyChallengeRecord.objects.filter(user_challenge=user_challenge)
        
        user_challenge.total_success_days = records.filter(is_success=True).count()
        user_challenge.total_failure_days = records.filter(is_success=False).count()
        user_challenge.save()
    
    def _check_and_award_badges(self, user_challenge: UserChallenge):
        """배지 획득 조건 확인 및 부여"""
        user = user_challenge.user
        
        # 연속 성공 배지 확인
        streak_badges = ChallengeBadge.objects.filter(
            condition_type='streak',
            condition_value__lte=user_challenge.current_streak_days,
            is_active=True
        )
        
        for badge in streak_badges:
            UserChallengeBadge.objects.get_or_create(
                user=user,
                badge=badge,
                defaults={'user_challenge': user_challenge}
            )
        
        # 총 성공 일수 배지 확인
        total_success_badges = ChallengeBadge.objects.filter(
            condition_type='total_success',
            condition_value__lte=user_challenge.total_success_days,
            is_active=True
        )
        
        for badge in total_success_badges:
            UserChallengeBadge.objects.get_or_create(
                user=user,
                badge=badge,
                defaults={'user_challenge': user_challenge}
            )


class CheatDayService:
    """치팅 데이 관리 서비스"""
    
    def request_cheat_day(self, user_challenge: UserChallenge, target_date: date) -> dict:
        """치팅 요청 처리"""
        # 현재 시간 확인 (23:59:59 KST 이전인지)
        current_time = timezone.now()
        from datetime import datetime
        target_datetime = timezone.make_aware(
            datetime.combine(target_date, time(23, 59, 59))
        )
        
        if current_time > target_datetime:
            return {
                'success': False,
                'error': 'INVALID_CHEAT_TIME',
                'message': '치팅 요청은 해당 날짜 23:59:59 이전에만 가능합니다.'
            }
        
        # 주간 치팅 사용 횟수 확인
        if user_challenge.current_weekly_cheat_count >= user_challenge.user_weekly_cheat_limit:
            return {
                'success': False,
                'error': 'CHEAT_LIMIT_EXCEEDED',
                'message': '주간 치팅 한도를 초과했습니다.'
            }
        
        # 이미 해당 날짜에 치팅 요청이 있는지 확인
        existing_request = CheatDayRequest.objects.filter(
            user_challenge=user_challenge,
            date=target_date
        ).first()
        
        if existing_request:
            if existing_request.is_approved:
                return {
                    'success': False,
                    'error': 'ALREADY_USED_CHEAT',
                    'message': '해당 날짜에 이미 치팅을 사용했습니다.'
                }
        
        with transaction.atomic():
            # 치팅 요청 생성/승인
            cheat_request, created = CheatDayRequest.objects.update_or_create(
                user_challenge=user_challenge,
                date=target_date,
                defaults={'is_approved': True}
            )
            
            # 주간 치팅 사용 횟수 증가
            user_challenge.current_weekly_cheat_count += 1
            user_challenge.save()
            
            # 해당 날짜의 챌린지 판정 재실행
            judgment_service = ChallengeJudgmentService()
            judgment_service.judge_daily_challenge(user_challenge, target_date)
        
        return {
            'success': True,
            'message': '치팅이 승인되었습니다.',
            'remaining_cheats': user_challenge.user_weekly_cheat_limit - user_challenge.current_weekly_cheat_count
        }
    
    def get_weekly_cheat_status(self, user_challenge: UserChallenge) -> dict:
        """주간 치팅 사용 현황 조회"""
        return {
            'used_count': user_challenge.current_weekly_cheat_count,
            'limit': user_challenge.user_weekly_cheat_limit,
            'remaining': user_challenge.user_weekly_cheat_limit - user_challenge.current_weekly_cheat_count
        }


class ChallengeStatisticsService:
    """챌린지 통계 서비스"""
    
    def get_user_statistics(self, user_challenge: UserChallenge) -> dict:
        """사용자 챌린지 통계 조회"""
        records = DailyChallengeRecord.objects.filter(user_challenge=user_challenge)
        
        total_days = records.count()
        success_days = records.filter(is_success=True).count()
        cheat_days = records.filter(is_cheat_day=True).count()
        
        success_rate = (success_days / total_days * 100) if total_days > 0 else 0
        
        # 최근 7일 성과
        recent_date = timezone.now().date() - timedelta(days=7)
        recent_records = records.filter(date__gte=recent_date)
        recent_success_rate = (recent_records.filter(is_success=True).count() / recent_records.count() * 100) if recent_records.count() > 0 else 0
        
        # 평균 칼로리 계산
        from django.db.models import Avg
        avg_calories = records.aggregate(avg_cal=Avg('total_calories'))['avg_cal'] or 0
        
        # 참여 일수 계산
        days_since_start = (timezone.now().date() - user_challenge.challenge_start_date).days
        
        # 주간 데이터 생성 (최근 4주)
        weekly_data = self._get_weekly_data(user_challenge)
        
        # 일일 칼로리 데이터 (최근 7일)
        daily_calories = self._get_daily_calories_data(user_challenge)
        
        return {
            'current_streak': user_challenge.current_streak_days,
            'max_streak': user_challenge.max_streak_days,
            'total_success_days': user_challenge.total_success_days,
            'total_failure_days': user_challenge.total_failure_days,
            'success_rate': round(success_rate, 1),
            'recent_success_rate': round(recent_success_rate, 1),
            'cheat_days_used': cheat_days,
            'remaining_days': user_challenge.remaining_duration_days,
            'challenge_progress': round((total_days / user_challenge.user_challenge_duration_days * 100), 1),
            'average_calories': round(avg_calories, 0),
            'days_since_start': days_since_start,
            'weekly_data': weekly_data,
            'daily_calories': daily_calories
        }
    
    def _get_weekly_data(self, user_challenge):
        """주간 성과 데이터 생성"""
        weekly_data = []
        today = timezone.now().date()
        
        for week in range(4):  # 최근 4주
            week_start = today - timedelta(days=(week + 1) * 7)
            week_end = week_start + timedelta(days=6)
            
            week_records = DailyChallengeRecord.objects.filter(
                user_challenge=user_challenge,
                date__range=[week_start, week_end]
            )
            
            success_count = week_records.filter(is_success=True).count()
            failure_count = week_records.filter(is_success=False).count()
            
            weekly_data.append({
                'week': 4 - week,  # 1주차, 2주차, 3주차, 4주차
                'success': success_count,
                'failure': failure_count,
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat()
            })
        
        return list(reversed(weekly_data))  # 시간순으로 정렬
    
    def _get_daily_calories_data(self, user_challenge):
        """일일 칼로리 데이터 (최근 7일)"""
        daily_data = []
        today = timezone.now().date()
        days_korean = ['월', '화', '수', '목', '금', '토', '일']
        
        for i in range(7):
            target_date = today - timedelta(days=6-i)
            day_name = days_korean[target_date.weekday()]
            
            daily_record = DailyChallengeRecord.objects.filter(
                user_challenge=user_challenge,
                date=target_date
            ).first()
            
            if daily_record:
                calories = daily_record.total_calories
                target = daily_record.target_calories
            else:
                # 기록이 없는 경우 0으로 설정
                calories = 0
                target = user_challenge.room.target_calorie
            
            daily_data.append({
                'day': day_name,
                'date': target_date.isoformat(),
                'calories': int(calories),
                'target': int(target),
                'has_record': daily_record is not None,
                'is_success': daily_record.is_success if daily_record else False,
                'is_cheat_day': daily_record.is_cheat_day if daily_record else False
            })
        
        return daily_data
    
    def get_leaderboard(self, room_id: int, limit: int = 50) -> list:
        """리더보드 조회"""
        try:
            # 해당 방의 활성 챌린지 참여자들 조회
            user_challenges = UserChallenge.objects.filter(
                room_id=room_id,
                status='active'
            ).select_related('user', 'room').order_by(
                '-current_streak_days',  # 연속 성공 일수 내림차순
                '-total_success_days',   # 총 성공 일수 내림차순
                'challenge_start_date'   # 시작일 오름차순
            )[:limit]
            
            leaderboard = []
            for rank, challenge in enumerate(user_challenges, 1):
                leaderboard.append({
                    'rank': rank,
                    'user_id': challenge.user.id,
                    'username': challenge.user.username,
                    'current_streak': challenge.current_streak_days,
                    'total_success': challenge.total_success_days,
                    'start_date': challenge.challenge_start_date.isoformat(),
                    'is_me': False  # 프론트엔드에서 설정
                })
            
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error getting leaderboard for room {room_id}: {e}")
            return []


    def _check_and_award_badges(self, user_challenge: UserChallenge):
        """배지 획득 조건 확인 및 부여"""
        user = user_challenge.user
        
        # 연속 성공 배지 확인
        streak_badges = ChallengeBadge.objects.filter(
            condition_type='streak',
            condition_value__lte=user_challenge.current_streak_days,
            is_active=True
        )
        
        for badge in streak_badges:
            UserChallengeBadge.objects.get_or_create(
                user=user,
                badge=badge,
                defaults={'user_challenge': user_challenge}
            )
        
        # 총 성공 일수 배지 확인
        total_success_badges = ChallengeBadge.objects.filter(
            condition_type='total_success',
            condition_value__lte=user_challenge.total_success_days,
            is_active=True
        )
        
        for badge in total_success_badges:
            UserChallengeBadge.objects.get_or_create(
                user=user,
                badge=badge,
                defaults={'user_challenge': user_challenge}
            )


class WeeklyResetService:
    """주간 초기화 서비스"""
    
    def reset_weekly_cheat_counts(self):
        """모든 사용자의 주간 치팅 사용 횟수 초기화"""
        with transaction.atomic():
            updated_count = UserChallenge.objects.filter(
                status='active'
            ).update(current_weekly_cheat_count=0)
            
            logger.info(f"Weekly cheat counts reset for {updated_count} active challenges")
            
            return updated_count