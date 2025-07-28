from django.contrib import admin
from .models import MealLog, AICoachTip

@admin.register(MealLog)
class MealLogAdmin(admin.ModelAdmin):
    list_display = ['date', 'user', 'mealType', 'foodName', 'calories', 'nutriScore', 'time']
    list_filter = ['date', 'mealType', 'nutriScore', 'user']
    search_fields = ['foodName', 'user__username']
    ordering = ['-date', '-time']
    readonly_fields = ['date', 'time']

@admin.register(AICoachTip)
class AICoachTipAdmin(admin.ModelAdmin):
    list_display = ['message', 'type', 'priority', 'createdAt']
    list_filter = ['type', 'priority', 'createdAt']
    search_fields = ['message']
    ordering = ['-createdAt']
