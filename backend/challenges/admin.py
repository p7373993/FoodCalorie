from django.contrib import admin
from .models import (
    ChallengeRoom, UserChallenge, DailyChallengeRecord, 
    CheatDayRequest, ChallengeBadge, UserChallengeBadge
)


@admin.register(ChallengeRoom)
class ChallengeRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'target_calorie', 'tolerance', 'is_active', 'dummy_users_count', 'created_at']
    list_filter = ['is_active', 'target_calorie']
    search_fields = ['name', 'description']
    ordering = ['target_calorie']


@admin.register(UserChallenge)
class UserChallengeAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'room', 'status', 'current_streak_days', 'max_streak_days',
        'remaining_duration_days', 'challenge_start_date'
    ]
    list_filter = ['status', 'room', 'challenge_start_date']
    search_fields = ['user__username', 'room__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-current_streak_days', '-challenge_start_date']


@admin.register(DailyChallengeRecord)
class DailyChallengeRecordAdmin(admin.ModelAdmin):
    list_display = [
        'user_challenge', 'date', 'total_calories', 'target_calories',
        'is_success', 'is_cheat_day', 'meal_count'
    ]
    list_filter = ['is_success', 'is_cheat_day', 'date']
    search_fields = ['user_challenge__user__username']
    ordering = ['-date']


@admin.register(CheatDayRequest)
class CheatDayRequestAdmin(admin.ModelAdmin):
    list_display = ['user_challenge', 'date', 'is_approved', 'requested_at']
    list_filter = ['is_approved', 'date']
    search_fields = ['user_challenge__user__username']
    ordering = ['-requested_at']


@admin.register(ChallengeBadge)
class ChallengeBadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'condition_type', 'condition_value', 'is_active', 'created_at']
    list_filter = ['condition_type', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['condition_type', 'condition_value']


@admin.register(UserChallengeBadge)
class UserChallengeBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at', 'user_challenge']
    list_filter = ['badge__condition_type', 'earned_at']
    search_fields = ['user__username', 'badge__name']
    ordering = ['-earned_at']
