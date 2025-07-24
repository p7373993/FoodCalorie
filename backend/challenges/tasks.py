from celery import shared_task
from django.utils import timezone
from datetime import date, timedelta
from .models import UserChallenge, DailyChallengeRecord
from .services import ChallengeJudgmentService, WeeklyResetService
import logging

logger = logging.getLogger('challenges')


@shared_task
def daily_challenge_judgment_batch():
    """
    일일 챌린지 판정 배치 작업
    매일 자정에 실행되어 전날 기록이 없는 사용자들을 실패 처리
    """
    yesterday = timezone.now().date() - timedelta(days=1)
    judgment_service = ChallengeJudgmentService()
    
    # 활성 챌린지 조회
    active_challenges = UserChallenge.objects.filter(
        status='active',
        remaining_duration_days__gt=0
    )
    
    processed_count = 0
    failed_count = 0
    
    for user_challenge in active_challenges:
        try:
            # 해당 날짜의 기록이 이미 있는지 확인
            existing_record = DailyChallengeRecord.objects.filter(
                user_challenge=user_challenge,
                date=yesterday
            ).exists()
            
            if not existing_record:
                # 기록이 없으면 판정 실행 (자동으로 실패 처리됨)
                judgment_service.judge_daily_challenge(user_challenge, yesterday)
                processed_count += 1
                
        except Exception as e:
            logger.error(f"Error processing daily judgment for user {user_challenge.user.id}: {str(e)}")
            failed_count += 1
    
    logger.info(f"Daily judgment batch completed: {processed_count} processed, {failed_count} failed")
    return {
        'processed': processed_count,
        'failed': failed_count,
        'date': yesterday.isoformat()
    }


@shared_task
def weekly_cheat_reset_batch():
    """
    주간 치팅 초기화 배치 작업
    매주 월요일 00:00:00 KST에 실행
    """
    reset_service = WeeklyResetService()
    
    try:
        updated_count = reset_service.reset_weekly_cheat_counts()
        
        logger.info(f"Weekly cheat reset completed: {updated_count} challenges updated")
        return {
            'success': True,
            'updated_count': updated_count,
            'reset_date': timezone.now().date().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in weekly cheat reset: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def update_challenge_durations():
    """
    챌린지 기간 업데이트 배치 작업
    매일 실행되어 모든 활성 챌린지의 남은 기간을 1일씩 감소
    """
    updated_count = 0
    completed_count = 0
    
    try:
        # 활성 챌린지 조회
        active_challenges = UserChallenge.objects.filter(
            status='active',
            remaining_duration_days__gt=0
        )
        
        for challenge in active_challenges:
            challenge.remaining_duration_days -= 1
            
            # 기간이 만료된 경우 완료 상태로 변경
            if challenge.remaining_duration_days <= 0:
                challenge.status = 'completed'
                completed_count += 1
            
            challenge.save()
            updated_count += 1
        
        logger.info(f"Challenge durations updated: {updated_count} updated, {completed_count} completed")
        return {
            'success': True,
            'updated_count': updated_count,
            'completed_count': completed_count
        }
        
    except Exception as e:
        logger.error(f"Error updating challenge durations: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def cleanup_old_records():
    """
    오래된 기록 정리 배치 작업
    90일 이상 된 비활성 챌린지의 일일 기록을 정리
    """
    cutoff_date = timezone.now().date() - timedelta(days=90)
    
    try:
        # 90일 이상 된 비활성 챌린지 조회
        old_challenges = UserChallenge.objects.filter(
            status__in=['inactive', 'completed'],
            updated_at__date__lt=cutoff_date
        )
        
        deleted_records = 0
        for challenge in old_challenges:
            # 해당 챌린지의 일일 기록 삭제
            deleted_count = DailyChallengeRecord.objects.filter(
                user_challenge=challenge,
                date__lt=cutoff_date
            ).delete()[0]
            
            deleted_records += deleted_count
        
        logger.info(f"Old records cleanup completed: {deleted_records} records deleted")
        return {
            'success': True,
            'deleted_records': deleted_records,
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup old records: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def generate_daily_statistics():
    """
    일일 통계 생성 배치 작업
    매일 실행되어 챌린지 시스템의 전체 통계를 생성
    """
    try:
        from django.db.models import Count, Avg
        
        # 전체 통계 계산
        total_active_challenges = UserChallenge.objects.filter(status='active').count()
        total_completed_challenges = UserChallenge.objects.filter(status='completed').count()
        
        # 성공률 계산
        yesterday = timezone.now().date() - timedelta(days=1)
        yesterday_records = DailyChallengeRecord.objects.filter(date=yesterday)
        success_rate = (yesterday_records.filter(is_success=True).count() / 
                       yesterday_records.count() * 100) if yesterday_records.count() > 0 else 0
        
        # 평균 연속 성공 일수
        avg_streak = UserChallenge.objects.filter(
            status='active'
        ).aggregate(avg_streak=Avg('current_streak_days'))['avg_streak'] or 0
        
        stats = {
            'date': yesterday.isoformat(),
            'total_active_challenges': total_active_challenges,
            'total_completed_challenges': total_completed_challenges,
            'daily_success_rate': round(success_rate, 2),
            'average_streak_days': round(avg_streak, 2),
            'total_daily_records': yesterday_records.count()
        }
        
        logger.info(f"Daily statistics generated: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Error generating daily statistics: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }