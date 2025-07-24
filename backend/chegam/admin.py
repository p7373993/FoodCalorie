from django.contrib import admin
from .models import UserProfile, Meal, WeightEntry, Badge, GamificationProfile, Challenge


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'updated_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['user', 'calories', 'timestamp', 'ml_task_id']
    list_filter = ['timestamp', 'calories']
    search_fields = ['user__username', 'ml_task_id']
    readonly_fields = ['timestamp']


@admin.register(WeightEntry)
class WeightEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'weight', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['user__username']
    readonly_fields = ['timestamp']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'icon']
    search_fields = ['name', 'description']


@admin.register(GamificationProfile)
class GamificationProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'points', 'badge_count']
    list_filter = ['points']
    search_fields = ['user__username']
    filter_horizontal = ['badges']
    
    def badge_count(self, obj):
        return obj.badges.count()
    badge_count.short_description = '배지 수'


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'goal', 'creator', 'participant_count', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['title', 'description', 'creator__username']
    filter_horizontal = ['participants']
    readonly_fields = ['created_at']