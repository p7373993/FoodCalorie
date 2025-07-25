from django.db import models
from django.contrib.auth.models import User
from api_integrated.models import MealLog


class UserProfile(models.Model):
    """사용자 프로필 및 목표 설정"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, default='사용자')
    avatar_url = models.URLField(blank=True, null=True)
    calorie_goal = models.IntegerField(default=2000)
    protein_goal = models.IntegerField(default=120)
    carbs_goal = models.IntegerField(default=250)
    fat_goal = models.IntegerField(default=65)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}의 프로필"


class DailyGoal(models.Model):
    """일별 목표 설정"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    goal_text = models.CharField(max_length=200)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'date']

    def __str__(self):
        return f"{self.date} - {self.goal_text}"


class Badge(models.Model):
    """배지 시스템"""
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)  # 이모지
    description = models.TextField()
    condition_type = models.CharField(max_length=50, choices=[
        ('first_meal', '첫 식사'),
        ('streak_7', '7일 연속'),
        ('protein_goal', '단백질 목표'),
        ('perfect_week', '완벽한 주'),
        ('veggie_power', '야채 파워'),
        ('hydration', '수분 섭취'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    """사용자가 획득한 배지"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']

    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"


class WeeklyAnalysis(models.Model):
    """주간 분석 데이터"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    week_start = models.DateField()  # 주의 시작일 (월요일)
    avg_calories = models.FloatField()
    avg_protein = models.FloatField()
    avg_carbs = models.FloatField()
    avg_fat = models.FloatField()
    calorie_achievement_rate = models.FloatField()  # 칼로리 달성률
    protein_achievement_rate = models.FloatField()
    carbs_achievement_rate = models.FloatField()
    fat_achievement_rate = models.FloatField()
    ai_advice = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'week_start']

    def __str__(self):
        return f"{self.user.username} - {self.week_start} 주간 분석"