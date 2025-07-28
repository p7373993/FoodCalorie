from django.contrib import admin
from .models import CalendarUserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis


@admin.register(CalendarUserProfile)
class CalendarUserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'calorie_goal', 'protein_goal', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username']


@admin.register(DailyGoal)
class DailyGoalAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'goal_text', 'is_completed']
    list_filter = ['date', 'is_completed']
    search_fields = ['user__username', 'goal_text']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'condition_type', 'created_at']
    list_filter = ['condition_type']
    search_fields = ['name', 'description']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    list_filter = ['earned_at', 'badge']
    search_fields = ['user__username', 'badge__name']


@admin.register(WeeklyAnalysis)
class WeeklyAnalysisAdmin(admin.ModelAdmin):
    list_display = ['user', 'week_start', 'avg_calories', 'calorie_achievement_rate', 'created_at']
    list_filter = ['week_start', 'created_at']
    search_fields = ['user__username']
    readonly_fields = ['created_at']