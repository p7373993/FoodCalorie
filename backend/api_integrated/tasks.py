"""
백그라운드 작업 (Celery Tasks)
"""
from celery import shared_task
from django.contrib.auth.models import User
from datetime import date, timedelta
from .ai_coach import AICoachingService
from .models import AICoachTip, MealLog
import logging

logger = logging.getLogger(__name__)

@shared_task
def generate_daily_coaching_for_all_users():
    """모든 사용자에 대해 일일 코칭 메시지 생성"""
    try:
        coaching_service = AICoachingService()
        users_with_recent_meals = User.objects.filter(
            meallog__date__gte=date.today() - timedelta(days=1)
        ).distinct()
        
        generated_count = 0
        for user in users_with_recent_meals:
            try:
                coaching_message = coaching_service.generate_daily_coaching(user)
                if coaching_message:
                    generated_count += 1
                    logger.info(f"사용자 {user.username}에 대한 코칭 메시지 생성 완료")
            except Exception as e:
                logger.error(f"사용자 {user.username} 코칭 생성 실패: {e}")
        
        logger.info(f"일일 코칭 메시지 생성 완료: {generated_count}명")
        return f"Generated coaching for {generated_count} users"
        
    except Exception as e:
        logger.error(f"일일 코칭 생성 작업 실패: {e}")
        raise

@shared_task
def generate_weekly_reports():
    """주간 리포트 생성"""
    try:
        coaching_service = AICoachingService()
        
        # 최근 7일간 활동이 있는 사용자들
        active_users = User.objects.filter(
            meallog__date__gte=date.today() - timedelta(days=7)
        ).distinct()
        
        reports_generated = 0
        for user in active_users:
            try:
                weekly_report = coaching_service.generate_weekly_report(user)
                
                # 주간 리포트를 코칭 팁으로 저장
                AICoachTip.objects.create(
                    message=f"주간 리포트: {weekly_report.get('ai_analysis', '분석 완료')}",
                    type='suggestion',
                    priority='medium'
                )
                
                reports_generated += 1
                logger.info(f"사용자 {user.username} 주간 리포트 생성 완료")
                
            except Exception as e:
                logger.error(f"사용자 {user.username} 주간 리포트 생성 실패: {e}")
        
        logger.info(f"주간 리포트 생성 완료: {reports_generated}명")
        return f"Generated weekly reports for {reports_generated} users"
        
    except Exception as e:
        logger.error(f"주간 리포트 생성 작업 실패: {e}")
        raise

@shared_task
def cleanup_old_coaching_tips():
    """오래된 코칭 팁 정리"""
    try:
        # 30일 이상 된 코칭 팁 삭제
        cutoff_date = date.today() - timedelta(days=30)
        old_tips = AICoachTip.objects.filter(createdAt__lt=cutoff_date)
        
        deleted_count = old_tips.count()
        old_tips.delete()
        
        logger.info(f"오래된 코칭 팁 {deleted_count}개 삭제 완료")
        return f"Deleted {deleted_count} old coaching tips"
        
    except Exception as e:
        logger.error(f"코칭 팁 정리 작업 실패: {e}")
        raise

@shared_task
def analyze_user_nutrition_patterns():
    """사용자 영양 패턴 분석"""
    try:
        # 최근 활동이 있는 사용자들
        active_users = User.objects.filter(
            meallog__date__gte=date.today() - timedelta(days=14)
        ).distinct()
        
        analysis_results = []
        
        for user in active_users:
            try:
                # 사용자의 최근 식사 패턴 분석
                recent_meals = MealLog.objects.filter(
                    user=user,
                    date__gte=date.today() - timedelta(days=14)
                )
                
                if recent_meals.count() < 5:  # 최소 데이터 요구사항
                    continue
                
                # 영양소 평균 계산
                from django.db.models import Avg
                nutrition_avg = recent_meals.aggregate(
                    avg_calories=Avg('calories'),
                    avg_carbs=Avg('carbs'),
                    avg_protein=Avg('protein'),
                    avg_fat=Avg('fat')
                )
                
                # 패턴 분석 결과 저장
                analysis_results.append({
                    'user_id': user.id,
                    'username': user.username,
                    'avg_calories': nutrition_avg['avg_calories'],
                    'meal_count': recent_meals.count(),
                    'analysis_date': date.today().isoformat()
                })
                
                # 특이 패턴 감지 시 코칭 팁 생성
                if nutrition_avg['avg_calories'] and nutrition_avg['avg_calories'] > 2500:
                    AICoachTip.objects.create(
                        message=f"최근 칼로리 섭취가 높습니다. 균형 잡힌 식단을 권장합니다.",
                        type='warning',
                        priority='high'
                    )
                elif nutrition_avg['avg_calories'] and nutrition_avg['avg_calories'] < 1200:
                    AICoachTip.objects.create(
                        message=f"칼로리 섭취가 부족할 수 있습니다. 충분한 영양 섭취를 권장합니다.",
                        type='suggestion',
                        priority='medium'
                    )
                
            except Exception as e:
                logger.error(f"사용자 {user.username} 영양 패턴 분석 실패: {e}")
        
        logger.info(f"영양 패턴 분석 완료: {len(analysis_results)}명")
        return f"Analyzed nutrition patterns for {len(analysis_results)} users"
        
    except Exception as e:
        logger.error(f"영양 패턴 분석 작업 실패: {e}")
        raise

@shared_task
def send_meal_reminders():
    """식사 알림 전송 (향후 확장용)"""
    try:
        # 현재는 로그만 남김 (실제 알림 기능은 향후 구현)
        logger.info("식사 알림 작업 실행됨 (실제 알림 기능은 향후 구현 예정)")
        return "Meal reminder task executed"
        
    except Exception as e:
        logger.error(f"식사 알림 작업 실패: {e}")
        raise