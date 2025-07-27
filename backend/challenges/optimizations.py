"""
챌린지 시스템 데이터베이스 쿼리 최적화
"""

from django.db import models
from django.db.models import Prefetch, Q, Count, Max, Avg, F
from django.utils import timezone
from typing import List, Dict, Any
from django.db.models import QuerySet
import logging

logger = logging.getLogger('challenges')


class OptimizedChallengeQueries:
    """최적화된 챌린지 쿼리 클래스"""
    
    @staticmethod
    def get_active_challenges_with_room_info() -> QuerySet:
        """활성 챌린지와 방 정보를 함께 조회 (N+1 문제 해결)"""
        from .models import UserChallenge
        
        return UserChallenge.objects.select_related(
            'user',
            'room'
        ).filter(
            status='active',
            remaining_duration_days__gt=0
        ).order_by('-current_streak_days', '-challenge_start_date')
    
    @staticmethod
    def get_leaderboard_optimized(room_id: int, limit: int = 50) -> QuerySet:
        """최적화된 리더보드 쿼리"""
        from .models import UserChallenge
        
        return UserChallenge.objects.select_related('user').filter(
            room_id=room_id,
            status='active'
        ).order_by(
            '-current_streak_days',
            '-total_success_days',
            'challenge_start_date'
        )[:limit]
    
    @staticmethod
    def get_user_challenge_with_records(user_id: int) -> QuerySet:
        """사용자 챌린지와 일일 기록을 함께 조회"""
        from .models import UserChallenge, DailyChallengeRecord
        
        # 최근 30일 기록만 prefetch
        recent_records = DailyChallengeRecord.objects.filter(
            date__gte=timezone.now().date() - timezone.timedelta(days=30)
        ).order_by('-date')
        
        return UserChallenge.objects.select_related(
            'user',
            'room'
        ).prefetch_related(
            Prefetch('daily_records', queryset=recent_records)
        ).filter(
            user_id=user_id,
            status='active'
        )
    
    @staticmethod
    def get_user_badges_optimized(user_id: int) -> QuerySet:
        """최적화된 사용자 배지 조회"""
        from .models import UserChallengeBadge
        
        return UserChallengeBadge.objects.select_related(
            'badge',
            'user_challenge__room'
        ).filter(
            user_id=user_id
        ).order_by('-earned_at')
    
    @staticmethod
    def get_challenge_statistics_bulk(room_id: int) -> Dict[str, Any]:
        """벌크 통계 조회로 성능 최적화"""
        from .models import UserChallenge, DailyChallengeRecord
        
        # 기본 통계
        base_stats = UserChallenge.objects.filter(
            room_id=room_id,
            status='active'
        ).aggregate(
            total_participants=Count('id'),
            avg_streak=Avg('current_streak_days'),
            max_streak=Max('current_streak_days'),
            total_success_days=models.Sum('total_success_days'),
            total_failure_days=models.Sum('total_failure_days')
        )
        
        # 일일 기록 통계
        today = timezone.now().date()
        week_ago = today - timezone.timedelta(days=7)
        
        daily_stats = DailyChallengeRecord.objects.filter(
            user_challenge__room_id=room_id,
            date__gte=week_ago
        ).aggregate(
            weekly_success_count=Count('id', filter=Q(is_success=True)),
            weekly_total_count=Count('id'),
            weekly_cheat_count=Count('id', filter=Q(is_cheat_day=True))
        )
        
        return {**base_stats, **daily_stats}
    
    @staticmethod
    def get_trending_challenges() -> QuerySet:
        """인기 챌린지 조회 (참여자 수 기준)"""
        from .models import ChallengeRoom
        
        return ChallengeRoom.objects.annotate(
            active_participants=Count(
                'participants',
                filter=Q(participants__status='active')
            ),
            avg_success_rate=Avg(
                'participants__total_success_days',
                filter=Q(participants__status='active')
            )
        ).filter(
            is_active=True,
            active_participants__gt=0
        ).order_by('-active_participants', '-avg_success_rate')


class QueryOptimizer:
    """쿼리 최적화 도구"""
    
    @staticmethod
    def add_indexes():
        """필요한 인덱스 추가 (마이그레이션에서 사용)"""
        indexes = [
            # UserChallenge 인덱스
            "CREATE INDEX IF NOT EXISTS idx_user_challenge_status_remaining ON user_challenges(status, remaining_duration_days);",
            "CREATE INDEX IF NOT EXISTS idx_user_challenge_streak ON user_challenges(current_streak_days DESC);",
            "CREATE INDEX IF NOT EXISTS idx_user_challenge_room_status ON user_challenges(room_id, status);",
            "CREATE INDEX IF NOT EXISTS idx_user_challenge_user_status ON user_challenges(user_id, status);",
            
            # DailyChallengeRecord 인덱스
            "CREATE INDEX IF NOT EXISTS idx_daily_record_date ON daily_challenge_records(date DESC);",
            "CREATE INDEX IF NOT EXISTS idx_daily_record_user_date ON daily_challenge_records(user_challenge_id, date DESC);",
            "CREATE INDEX IF NOT EXISTS idx_daily_record_success ON daily_challenge_records(is_success, date);",
            
            # CheatDayRequest 인덱스
            "CREATE INDEX IF NOT EXISTS idx_cheat_request_date ON cheat_day_requests(user_challenge_id, date);",
            "CREATE INDEX IF NOT EXISTS idx_cheat_request_approved ON cheat_day_requests(is_approved, date);",
            
            # UserChallengeBadge 인덱스
            "CREATE INDEX IF NOT EXISTS idx_user_badge_earned ON user_challenge_badges(user_id, earned_at DESC);",
        ]
        
        return indexes
    
    @staticmethod
    def analyze_slow_queries():
        """느린 쿼리 분석 (개발/디버깅용)"""
        from django.db import connection
        
        slow_queries = []
        
        # Django의 쿼리 로그 확인
        if hasattr(connection, 'queries'):
            for query in connection.queries:
                if float(query['time']) > 0.1:  # 100ms 이상
                    slow_queries.append({
                        'sql': query['sql'],
                        'time': query['time'],
                    })
        
        return slow_queries
    
    @staticmethod
    def get_query_plan(sql: str) -> str:
        """쿼리 실행 계획 조회 (SQLite/PostgreSQL)"""
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute(f"EXPLAIN QUERY PLAN {sql}")
            return cursor.fetchall()


class BulkOperations:
    """벌크 연산을 통한 성능 최적화"""
    
    @staticmethod
    def bulk_update_streak_days(user_challenges: List, streak_updates: List[int]):
        """연속 성공 일수 벌크 업데이트"""
        from .models import UserChallenge
        
        for challenge, new_streak in zip(user_challenges, streak_updates):
            challenge.current_streak_days = new_streak
            if new_streak > challenge.max_streak_days:
                challenge.max_streak_days = new_streak
        
        UserChallenge.objects.bulk_update(
            user_challenges,
            ['current_streak_days', 'max_streak_days', 'last_activity_date']
        )
    
    @staticmethod
    def bulk_create_daily_records(records_data: List[Dict]):
        """일일 기록 벌크 생성"""
        from .models import DailyChallengeRecord
        
        records = [
            DailyChallengeRecord(**data) for data in records_data
        ]
        
        DailyChallengeRecord.objects.bulk_create(
            records,
            ignore_conflicts=True  # 중복 방지
        )
    
    @staticmethod
    def bulk_reset_weekly_cheat_counts():
        """주간 치팅 횟수 벌크 초기화"""
        from .models import UserChallenge
        
        return UserChallenge.objects.filter(
            status='active'
        ).update(current_weekly_cheat_count=0)
    
    @staticmethod
    def bulk_award_badges(user_badge_data: List[Dict]):
        """배지 벌크 부여"""
        from .models import UserChallengeBadge
        
        badges = [
            UserChallengeBadge(**data) for data in user_badge_data
        ]
        
        UserChallengeBadge.objects.bulk_create(
            badges,
            ignore_conflicts=True  # 중복 방지
        )


class PerformanceMonitor:
    """성능 모니터링 도구"""
    
    @staticmethod
    def measure_query_time(func):
        """쿼리 실행 시간 측정 데코레이터"""
        def wrapper(*args, **kwargs):
            from django.db import connection, reset_queries
            
            reset_queries()
            start_queries = len(connection.queries)
            
            import time
            start_time = time.time()
            
            result = func(*args, **kwargs)
            
            end_time = time.time()
            end_queries = len(connection.queries)
            
            execution_time = end_time - start_time
            query_count = end_queries - start_queries
            
            logger.info(f"{func.__name__} - Time: {execution_time:.3f}s, Queries: {query_count}")
            
            return result
        return wrapper
    
    @staticmethod
    def get_database_stats():
        """데이터베이스 통계 조회"""
        from .models import UserChallenge, DailyChallengeRecord, CheatDayRequest
        
        stats = {
            'active_challenges': UserChallenge.objects.filter(status='active').count(),
            'total_daily_records': DailyChallengeRecord.objects.count(),
            'total_cheat_requests': CheatDayRequest.objects.count(),
            'avg_streak_days': UserChallenge.objects.filter(
                status='active'
            ).aggregate(avg=Avg('current_streak_days'))['avg'] or 0,
        }
        
        return stats
    
    @staticmethod
    def identify_bottlenecks():
        """성능 병목 지점 식별"""
        bottlenecks = []
        
        # 활성 챌린지 수 확인
        from .models import UserChallenge
        active_count = UserChallenge.objects.filter(status='active').count()
        
        if active_count > 10000:
            bottlenecks.append({
                'type': 'high_active_challenges',
                'count': active_count,
                'recommendation': 'Consider partitioning or archiving old challenges'
            })
        
        # 일일 기록 수 확인
        from .models import DailyChallengeRecord
        record_count = DailyChallengeRecord.objects.count()
        
        if record_count > 100000:
            bottlenecks.append({
                'type': 'high_daily_records',
                'count': record_count,
                'recommendation': 'Consider data archiving or partitioning by date'
            })
        
        return bottlenecks


# 쿼리 최적화 미들웨어
class QueryOptimizationMiddleware:
    """쿼리 최적화 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from django.db import connection, reset_queries
        
        # 요청 시작 시 쿼리 초기화
        reset_queries()
        
        response = self.get_response(request)
        
        # 개발 환경에서만 쿼리 분석
        if hasattr(connection, 'queries') and len(connection.queries) > 20:
            logger.warning(f"High query count: {len(connection.queries)} queries for {request.path}")
            
            # 중복 쿼리 찾기
            query_counts = {}
            for query in connection.queries:
                sql = query['sql']
                query_counts[sql] = query_counts.get(sql, 0) + 1
            
            duplicates = {sql: count for sql, count in query_counts.items() if count > 1}
            if duplicates:
                logger.warning(f"Duplicate queries found: {duplicates}")
        
        return response