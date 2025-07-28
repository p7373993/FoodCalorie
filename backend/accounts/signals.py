# accounts/signals.py
"""
사용자 인증 관련 시그널 처리

이 파일은 사용자 계정과 관련된 시그널들을 처리합니다.
- 사용자 생성 시 UserProfile 자동 생성
- 프로필 업데이트 시 챌린지 시스템 연동
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User


from .models import UserProfile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """사용자 생성 시 UserProfile 자동 생성"""
    if created:
        # 닉네임을 username으로 기본 설정 (중복 시 숫자 추가)
        base_nickname = instance.username
        nickname = base_nickname
        counter = 1
        
        # 닉네임 중복 확인 및 유니크한 닉네임 생성
        while UserProfile.objects.filter(nickname=nickname).exists():
            nickname = f"{base_nickname}_{counter}"
            counter += 1
        
        UserProfile.objects.create(user=instance, nickname=nickname)
        print(f"UserProfile 생성됨: {instance.username} -> {nickname}")


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """User 저장 시 UserProfile도 함께 저장"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


@receiver(post_save, sender=UserProfile)
def update_challenge_settings(sender, instance, **kwargs):
    """프로필 업데이트 시 챌린지 추천 칼로리 재계산"""
    # 신체 정보가 변경된 경우에만 실행
    if kwargs.get('update_fields') is None or any(
        field in kwargs.get('update_fields', []) 
        for field in ['height', 'weight', 'age', 'gender']
    ):
        try:
            # 챌린지 시스템과 연동하여 추천 칼로리 재계산
            recommended_calories = instance.get_recommended_calories()
            if recommended_calories:
                print(f"프로필 업데이트: {instance.nickname} -> 권장 칼로리: {recommended_calories}kcal")
                
                # TODO: 챌린지 시스템의 UserChallenge 모델과 연동
                # 기존 활성 챌린지의 추천 칼로리 업데이트
                # challenges.models.UserChallenge.objects.filter(
                #     user=instance.user, 
                #     status='active'
                # ).update(recommended_calorie=recommended_calories)
                
        except Exception as e:
            print(f"챌린지 설정 업데이트 오류: {e}")


print("accounts.signals 모듈이 로드되었습니다.") 