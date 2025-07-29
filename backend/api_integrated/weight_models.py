from django.db import models
from django.contrib.auth.models import User


class WeightRecord(models.Model):
    """체중 기록 모델"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_records')
    weight = models.FloatField(help_text="체중 (kg)")
    date = models.DateField(help_text="기록 날짜")
    time = models.TimeField(auto_now_add=True, help_text="기록 시간")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-time']
        unique_together = ['user', 'date']  # 하루에 하나의 체중 기록만 허용
    
    def __str__(self):
        return f"{self.user.username} - {self.date}: {self.weight}kg"


class WeeklyStats(models.Model):
    """주간 통계 모델"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_stats')
    week_start = models.DateField(help_text="주의 시작일 (월요일)")
    
    # 칼로리 통계
    total_calories = models.FloatField(default=0)
    avg_calories = models.FloatField(default=0)
    max_calories = models.FloatField(default=0)
    min_calories = models.FloatField(default=0)
    
    # 체중 통계
    start_weight = models.FloatField(null=True, blank=True)
    end_weight = models.FloatField(null=True, blank=True)
    weight_change = models.FloatField(null=True, blank=True)
    
    # 식사 통계
    total_meals = models.IntegerField(default=0)
    avg_meals_per_day = models.FloatField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-week_start']
        unique_together = ['user', 'week_start']
    
    def __str__(self):
        return f"{self.user.username} - {self.week_start} 주간 통계"