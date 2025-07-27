from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import time

# 식사 시간대 상수
MEAL_TIME_RANGES = {
    'breakfast': (6, 11),   # 06:00~11:00 아침
    'lunch': (11, 15),      # 11:00~15:00 점심
    'snack': (15, 18),      # 15:00~18:00 간식
    'dinner': (18, 23),     # 18:00~23:00 저녁
}


class ChallengeRoom(models.Model):
    """챌린지 방 모델"""
    name = models.CharField(max_length=100, unique=True)  # "1500kcal_challenge"
    target_calorie = models.IntegerField(validators=[MinValueValidator(1000), MaxValueValidator(5000)])
    tolerance = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(200)])  # ±50kcal
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # 더미 데이터 관리
    dummy_users_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    class Meta:
        db_table = 'challenge_rooms'
        ordering = ['target_calorie']
    
    def __str__(self):
        return f"{self.name} ({self.target_calorie}kcal)"


class UserChallenge(models.Model):
    """사용자 챌린지 참여 모델"""
    STATUS_CHOICES = [
        ('active', '진행중'),
        ('inactive', '비활성'),
        ('completed', '완료'),
        ('quit', '포기')
    ]
    
    CHEAT_LIMIT_CHOICES = [
        (0, '0회'),
        (1, '1회'),
        (2, '2회'),
        (3, '3회')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenges')
    room = models.ForeignKey(ChallengeRoom, on_delete=models.CASCADE, related_name='participants')
    
    # 사용자 설정
    user_height = models.FloatField(validators=[MinValueValidator(100), MaxValueValidator(250)])  # cm
    user_weight = models.FloatField(validators=[MinValueValidator(30), MaxValueValidator(300)])   # kg
    user_target_weight = models.FloatField(validators=[MinValueValidator(30), MaxValueValidator(300)])  # kg
    user_challenge_duration_days = models.IntegerField(validators=[MinValueValidator(7), MaxValueValidator(365)])
    user_weekly_cheat_limit = models.IntegerField(choices=CHEAT_LIMIT_CHOICES, default=1)
    
    # 식사 규칙 설정
    min_daily_meals = models.IntegerField(
        choices=[(1, '1회'), (2, '2회'), (3, '3회'), (4, '4회'), (5, '5회')],
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="하루 최소 식사 횟수"
    )
    challenge_cutoff_time = models.TimeField(
        default=time(23, 0),
        help_text="챌린지 인정 마감 시간 (이후 식사는 무효)"
    )
    
    # 챌린지 진행 상태
    current_streak_days = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    max_streak_days = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    remaining_duration_days = models.IntegerField(validators=[MinValueValidator(0)])
    current_weekly_cheat_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # 통계
    total_success_days = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    total_failure_days = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # 상태 관리
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    challenge_start_date = models.DateField(auto_now_add=True)
    last_activity_date = models.DateField(null=True, blank=True)
    
    # 추가 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_challenges'
        unique_together = ['user', 'room']  # 한 방에 한 번만 참여
        ordering = ['-current_streak_days', '-challenge_start_date']
    
    def __str__(self):
        return f"{self.user.username} - {self.room.name}"
    
    @property
    def is_active(self):
        """챌린지가 활성 상태인지 확인"""
        return self.status == 'active' and self.remaining_duration_days > 0
    
    @property
    def challenge_end_date(self):
        """챌린지 종료 예정일"""
        return self.challenge_start_date + timezone.timedelta(days=self.user_challenge_duration_days)


class DailyChallengeRecord(models.Model):
    """일일 챌린지 기록 모델"""
    user_challenge = models.ForeignKey(UserChallenge, on_delete=models.CASCADE, related_name='daily_records')
    date = models.DateField()
    
    # 일일 결과
    total_calories = models.FloatField(validators=[MinValueValidator(0)])
    target_calories = models.FloatField(validators=[MinValueValidator(0)])
    is_success = models.BooleanField()
    is_cheat_day = models.BooleanField(default=False)
    
    # 메타데이터
    meal_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'daily_challenge_records'
        unique_together = ['user_challenge', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user_challenge.user.username} - {self.date} ({'성공' if self.is_success else '실패'})"
    
    @property
    def calorie_difference(self):
        """목표 칼로리와의 차이"""
        return self.total_calories - self.target_calories


class CheatDayRequest(models.Model):
    """치팅 요청 모델"""
    user_challenge = models.ForeignKey(UserChallenge, on_delete=models.CASCADE, related_name='cheat_requests')
    date = models.DateField()
    requested_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)
    
    # 추가 메타데이터
    reason = models.TextField(blank=True, null=True)  # 치팅 사유 (선택사항)
    
    class Meta:
        db_table = 'cheat_day_requests'
        unique_together = ['user_challenge', 'date']
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.user_challenge.user.username} - {self.date} 치팅 요청"


class ChallengeBadge(models.Model):
    """챌린지 배지 모델"""
    CONDITION_TYPE_CHOICES = [
        ('streak', '연속 성공'),
        ('completion', '챌린지 완료'),
        ('total_success', '총 성공 일수'),
        ('perfect_week', '완벽한 주'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50)  # 아이콘 이름 또는 이모지
    condition_type = models.CharField(max_length=50, choices=CONDITION_TYPE_CHOICES)
    condition_value = models.IntegerField(validators=[MinValueValidator(1)])
    
    # 배지 메타데이터
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'challenge_badges'
        ordering = ['condition_value']
    
    def __str__(self):
        return f"{self.name} ({self.condition_type}: {self.condition_value})"


class UserChallengeBadge(models.Model):
    """사용자 획득 배지 모델"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_badges')
    badge = models.ForeignKey(ChallengeBadge, on_delete=models.CASCADE, related_name='earned_by_users')
    earned_at = models.DateTimeField(auto_now_add=True)
    
    # 배지 획득 시점의 챌린지 정보
    user_challenge = models.ForeignKey(UserChallenge, on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        db_table = 'user_challenge_badges'
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"