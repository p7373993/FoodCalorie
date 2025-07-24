from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from api_integrated.models import MealLog
from .models import UserChallenge, DailyChallengeRecord
from .services import ChallengeJudgmentService
import logging

logger = logging.getLogger('challenges')


@receiver(post_save, sender=MealLog)
def trigger_daily_challenge_judgment(sender, instance, created, **kwargs):
    """
    식단 기록이 생성/수정될 때 챌린지 판정을 트리거
    """
    if not instance.user:
        return
    
    try:
        # 해당 사용자의 활성 챌린지 조회
        active_challenges = UserChallenge.objects.filter(
            user=instance.user,
            status='active',
            remaining_duration_days__gt=0
        )
        
        for user_challenge in active_challenges:
            # 일일 챌린지 판정 실행
            judgment_service = ChallengeJudgmentService()
            judgment_service.judge_daily_challenge(user_challenge, instance.date)
            
            logger.info(f"Daily challenge judgment triggered for user {instance.user.id} on {instance.date}")
            
    except Exception as e:
        logger.error(f"Error in daily challenge judgment: {str(e)}")


@receiver(post_delete, sender=MealLog)
def handle_meal_deletion(sender, instance, **kwargs):
    """
    식단 기록이 삭제될 때 챌린지 판정 재계산
    """
    if not instance.user:
        return
    
    try:
        # 해당 사용자의 활성 챌린지 조회
        active_challenges = UserChallenge.objects.filter(
            user=instance.user,
            status='active',
            remaining_duration_days__gt=0
        )
        
        for user_challenge in active_challenges:
            # 해당 날짜의 챌린지 기록이 있다면 재계산
            try:
                daily_record = DailyChallengeRecord.objects.get(
                    user_challenge=user_challenge,
                    date=instance.date
                )
                
                # 일일 챌린지 판정 재실행
                judgment_service = ChallengeJudgmentService()
                judgment_service.judge_daily_challenge(user_challenge, instance.date)
                
                logger.info(f"Daily challenge re-judgment triggered for user {instance.user.id} on {instance.date}")
                
            except DailyChallengeRecord.DoesNotExist:
                # 해당 날짜의 챌린지 기록이 없으면 무시
                pass
                
    except Exception as e:
        logger.error(f"Error in meal deletion handling: {str(e)}")


@receiver(post_save, sender=User)
def handle_user_creation(sender, instance, created, **kwargs):
    """
    새 사용자가 생성될 때 필요한 초기화 작업
    """
    if created:
        logger.info(f"New user created: {instance.username} (ID: {instance.id})")
        # 필요시 초기 설정 작업 수행