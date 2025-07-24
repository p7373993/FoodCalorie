from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    """사용자 프로필 확장"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.username} Profile"


class Meal(models.Model):
    """식단 기록 모델"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meals')
    image_url = models.URLField(max_length=500)
    calories = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    analysis_data = models.JSONField(null=True, blank=True)
    
    # MLServer 연동 정보
    ml_task_id = models.CharField(max_length=100, blank=True)
    estimated_mass = models.FloatField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    
    class Meta:
        db_table = 'meals'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} - {self.calories}kcal ({self.timestamp.date()})"


class WeightEntry(models.Model):
    """체중 기록 모델"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_entries')
    weight = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'weight_entries'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} - {self.weight}kg ({self.timestamp.date()})"


class Badge(models.Model):
    """배지 정의 모델"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='🏅')
    
    class Meta:
        db_table = 'badges'
    
    def __str__(self):
        return self.name


class GamificationProfile(models.Model):
    """게임화 프로필 모델"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='gamification')
    points = models.IntegerField(default=0)
    badges = models.ManyToManyField(Badge, blank=True)
    
    class Meta:
        db_table = 'gamification_profiles'
    
    def __str__(self):
        return f"{self.user.username} - {self.points} points"
    
    def add_points(self, points):
        """포인트 추가"""
        self.points += points
        self.save()
    
    def award_badge(self, badge_name):
        """배지 수여"""
        try:
            badge = Badge.objects.get(name=badge_name)
            if not self.badges.filter(name=badge_name).exists():
                self.badges.add(badge)
                return True
        except Badge.DoesNotExist:
            pass
        return False


class Challenge(models.Model):
    """챌린지 모델"""
    CHALLENGE_TYPES = [
        ('CALORIE_LIMIT', '칼로리 제한'),
        ('PROTEIN_MINIMUM', '최소 단백질'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=CHALLENGE_TYPES)
    goal = models.IntegerField()
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_challenges')
    participants = models.ManyToManyField(User, related_name='joined_challenges', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'challenges'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"
    
    @property
    def participant_count(self):
        return self.participants.count()


# 시그널을 사용하여 사용자 생성 시 프로필 자동 생성
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profiles(sender, instance, created, **kwargs):
    """사용자 생성 시 프로필 자동 생성"""
    if created:
        UserProfile.objects.create(user=instance)
        GamificationProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profiles(sender, instance, **kwargs):
    """사용자 저장 시 프로필 저장"""
    if hasattr(instance, 'userprofile'):
        instance.userprofile.save()
    if hasattr(instance, 'gamification'):
        instance.gamification.save()