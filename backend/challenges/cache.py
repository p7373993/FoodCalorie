"""
챌린지 시스템 Redis 캐싱 전략 구현
"""

import json
import logging
from typing import Any, Optional, Dict, List
from datetime import timedelta
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('challenges')

# 캐시 키 상수
CACHE_KEYS = {
    'leaderboard': 'challenge:leaderboard:{room_id}',
    'user_stats': 'challenge:user:{user_id}:stats',
    'room_info': 'challenge:room:{room_id}:info',
    'room_list': 'challenge:rooms:active',
    'user_challenge': 'challenge:user:{user_id}:active',
    'cheat_status': 'challenge:user:{user_id}:cheat_status',
    'daily_record': 'challenge:user:{user_id}:daily:{date}',
    'badge_list': 'challenge:badges:active',
    'user_badges': 'challenge:user:{user_id}:badges',
}

# 캐시 TTL 설정 (초)
CACHE_TTL = {
    'leaderboard': 300,      # 5분
    'user_stats': 600,       # 10분
    'room_info': 3600,       # 1시간
    'room_list': 1800,       # 30분
    'user_challenge': 300,   # 5분
    'cheat_status': 60,      # 1분
    'daily_record': 86400,   # 24시간
    'badge_list': 7200,      # 2시간
    'user_badges': 1800,     # 30분
}


class ChallengeCache:
    """챌린지 시스템 캐시 관리 클래스"""
    
    @staticmethod
    def get_cache_key(key_type: str, **kwargs) -> str:
        """캐시 키 생성"""
        try:
            return CACHE_KEYS[key_type].format(**kwargs)
        except KeyError:
            raise ValueError(f"Unknown cache key type: {key_type}")
    
    @staticmethod
    def get(key_type: str, default=None, **kwargs) -> Any:
        """캐시에서 데이터 조회"""
        cache_key = ChallengeCache.get_cache_key(key_type, **kwargs)
        try:
            data = cache.get(cache_key, default)
            if data is not None:
                logger.debug(f"Cache hit: {cache_key}")
            else:
                logger.debug(f"Cache miss: {cache_key}")
            return data
        except Exception as e:
            logger.error(f"Cache get error for key {cache_key}: {str(e)}")
            return default
    
    @staticmethod
    def set(key_type: str, value: Any, timeout: Optional[int] = None, **kwargs) -> bool:
        """캐시에 데이터 저장"""
        cache_key = ChallengeCache.get_cache_key(key_type, **kwargs)
        if timeout is None:
            timeout = CACHE_TTL.get(key_type, 300)  # 기본 5분
        
        try:
            cache.set(cache_key, value, timeout)
            logger.debug(f"Cache set: {cache_key} (TTL: {timeout}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {cache_key}: {str(e)}")
            return False
    
    @staticmethod
    def delete(key_type: str, **kwargs) -> bool:
        """캐시에서 데이터 삭제"""
        cache_key = ChallengeCache.get_cache_key(key_type, **kwargs)
        try:
            cache.delete(cache_key)
            logger.debug(f"Cache deleted: {cache_key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {cache_key}: {str(e)}")
            return False
    
    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """패턴에 맞는 캐시 키들 삭제"""
        try:
            # Redis 백엔드를 사용하는 경우
            if hasattr(cache, '_cache') and hasattr(cache._cache, 'delete_pattern'):
                deleted_count = cache._cache.delete_pattern(pattern)
                logger.debug(f"Cache pattern deleted: {pattern} ({deleted_count} keys)")
                return deleted_count
            else:
                # 다른 캐시 백엔드의 경우 개별 삭제
                logger.warning(f"Pattern deletion not supported for current cache backend")
                return 0
        except Exception as e:
            logger.error(f"Cache pattern delete error for pattern {pattern}: {str(e)}")
            return 0
    
    @staticmethod
    def invalidate_user_cache(user_id: int):
        """사용자 관련 캐시 무효화"""
        patterns = [
            f"challenge:user:{user_id}:*",
        ]
        
        for pattern in patterns:
            ChallengeCache.delete_pattern(pattern)
        
        logger.info(f"Invalidated user cache for user {user_id}")
    
    @staticmethod
    def invalidate_room_cache(room_id: int):
        """챌린지 방 관련 캐시 무효화"""
        # 리더보드 캐시 삭제
        ChallengeCache.delete('leaderboard', room_id=room_id)
        
        # 방 정보 캐시 삭제
        ChallengeCache.delete('room_info', room_id=room_id)
        
        # 방 목록 캐시 삭제
        ChallengeCache.delete('room_list')
        
        logger.info(f"Invalidated room cache for room {room_id}")
    
    @staticmethod
    def warm_up_cache():
        """캐시 워밍업 - 자주 사용되는 데이터 미리 로드"""
        from .models import ChallengeRoom, ChallengeBadge
        from .services import ChallengeStatisticsService
        
        try:
            # 활성 챌린지 방 목록 캐시
            active_rooms = list(ChallengeRoom.objects.filter(is_active=True).values())
            ChallengeCache.set('room_list', active_rooms)
            
            # 활성 배지 목록 캐시
            active_badges = list(ChallengeBadge.objects.filter(is_active=True).values())
            ChallengeCache.set('badge_list', active_badges)
            
            # 각 방의 리더보드 캐시 (상위 50명)
            stats_service = ChallengeStatisticsService()
            for room in ChallengeRoom.objects.filter(is_active=True):
                leaderboard = stats_service.get_leaderboard(room.id, limit=50)
                ChallengeCache.set('leaderboard', leaderboard, room_id=room.id)
            
            logger.info("Cache warm-up completed")
            
        except Exception as e:
            logger.error(f"Cache warm-up error: {str(e)}")


class CachedLeaderboardService:
    """캐시를 활용한 리더보드 서비스"""
    
    @staticmethod
    def get_leaderboard(room_id: int, limit: int = 50, force_refresh: bool = False) -> List[Dict]:
        """캐시된 리더보드 조회"""
        cache_key_params = {'room_id': room_id}
        
        if not force_refresh:
            cached_data = ChallengeCache.get('leaderboard', **cache_key_params)
            if cached_data:
                # 요청된 limit에 맞게 자르기
                return cached_data[:limit]
        
        # 캐시 미스 또는 강제 새로고침
        from .services import ChallengeStatisticsService
        stats_service = ChallengeStatisticsService()
        leaderboard = stats_service.get_leaderboard(room_id, limit=100)  # 더 많이 캐시
        
        # 캐시에 저장
        ChallengeCache.set('leaderboard', leaderboard, **cache_key_params)
        
        return leaderboard[:limit]
    
    @staticmethod
    def update_leaderboard_cache(room_id: int):
        """리더보드 캐시 업데이트"""
        CachedLeaderboardService.get_leaderboard(room_id, force_refresh=True)


class CachedUserStatsService:
    """캐시를 활용한 사용자 통계 서비스"""
    
    @staticmethod
    def get_user_statistics(user_challenge, force_refresh: bool = False) -> Dict:
        """캐시된 사용자 통계 조회"""
        cache_key_params = {'user_id': user_challenge.user.id}
        
        if not force_refresh:
            cached_data = ChallengeCache.get('user_stats', **cache_key_params)
            if cached_data:
                return cached_data
        
        # 캐시 미스 또는 강제 새로고침
        from .services import ChallengeStatisticsService
        stats_service = ChallengeStatisticsService()
        statistics = stats_service.get_user_statistics(user_challenge)
        
        # 캐시에 저장
        ChallengeCache.set('user_stats', statistics, **cache_key_params)
        
        return statistics
    
    @staticmethod
    def invalidate_user_stats(user_id: int):
        """사용자 통계 캐시 무효화"""
        ChallengeCache.delete('user_stats', user_id=user_id)


class CachedRoomService:
    """캐시를 활용한 챌린지 방 서비스"""
    
    @staticmethod
    def get_active_rooms(force_refresh: bool = False) -> List[Dict]:
        """캐시된 활성 챌린지 방 목록 조회"""
        if not force_refresh:
            cached_data = ChallengeCache.get('room_list')
            if cached_data:
                return cached_data
        
        # 캐시 미스 또는 강제 새로고침
        from .models import ChallengeRoom
        rooms = list(ChallengeRoom.objects.filter(is_active=True).values())
        
        # 캐시에 저장
        ChallengeCache.set('room_list', rooms)
        
        return rooms
    
    @staticmethod
    def get_room_info(room_id: int, force_refresh: bool = False) -> Optional[Dict]:
        """캐시된 챌린지 방 정보 조회"""
        cache_key_params = {'room_id': room_id}
        
        if not force_refresh:
            cached_data = ChallengeCache.get('room_info', **cache_key_params)
            if cached_data:
                return cached_data
        
        # 캐시 미스 또는 강제 새로고침
        from .models import ChallengeRoom
        try:
            room = ChallengeRoom.objects.get(id=room_id, is_active=True)
            room_data = {
                'id': room.id,
                'name': room.name,
                'target_calorie': room.target_calorie,
                'tolerance': room.tolerance,
                'description': room.description,
                'dummy_users_count': room.dummy_users_count,
            }
            
            # 캐시에 저장
            ChallengeCache.set('room_info', room_data, **cache_key_params)
            
            return room_data
        except ChallengeRoom.DoesNotExist:
            return None


# 캐시 무효화 데코레이터
def invalidate_cache_on_change(cache_types: List[str]):
    """모델 변경 시 캐시 무효화 데코레이터"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # 캐시 무효화 로직
            for cache_type in cache_types:
                if cache_type == 'user_cache':
                    user_id = kwargs.get('user_id') or (args[0].user.id if hasattr(args[0], 'user') else None)
                    if user_id:
                        ChallengeCache.invalidate_user_cache(user_id)
                
                elif cache_type == 'room_cache':
                    room_id = kwargs.get('room_id') or (args[0].room.id if hasattr(args[0], 'room') else None)
                    if room_id:
                        ChallengeCache.invalidate_room_cache(room_id)
                
                elif cache_type == 'leaderboard':
                    room_id = kwargs.get('room_id') or (args[0].room.id if hasattr(args[0], 'room') else None)
                    if room_id:
                        ChallengeCache.delete('leaderboard', room_id=room_id)
            
            return result
        return wrapper
    return decorator