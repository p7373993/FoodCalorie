from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis
from api_integrated.models import MealLog
from datetime import datetime, timedelta


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['name', 'avatar_url', 'calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal']


class DailyGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyGoal
        fields = ['date', 'goal_text', 'is_completed']


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'icon', 'description']


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    
    class Meta:
        model = UserBadge
        fields = ['badge', 'earned_at']


class MealLogSerializer(serializers.ModelSerializer):
    """기존 MealLog 모델을 위한 시리얼라이저"""
    nutrients = serializers.SerializerMethodField()
    ai_comment = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = MealLog
        fields = ['id', 'foodName', 'type', 'photo_url', 'nutrients', 'ai_comment', 'date', 'time']

    def get_nutrients(self, obj):
        return {
            'calories': obj.calories or 0,
            'protein': obj.protein or 0,
            'carbs': obj.carbs or 0,
            'fat': obj.fat or 0,
            'nutriScore': obj.nutriScore or 'C'
        }

    def get_ai_comment(self, obj):
        # 영양 점수에 따른 AI 코멘트 생성
        score = obj.nutriScore or 'C'
        comments = {
            'A': 'Excellent nutritional choice! Keep it up!',
            'B': 'Good choice for your health.',
            'C': 'Decent meal, consider adding more nutrients.',
            'D': 'Try to balance with healthier options.',
            'E': 'Consider healthier alternatives next time.'
        }
        return comments.get(score, 'Keep tracking your nutrition!')

    def get_photo_url(self, obj):
        if obj.imageUrl:
            return obj.imageUrl.url
        return f'https://picsum.photos/seed/{obj.id}/400/300'

    def get_type(self, obj):
        type_mapping = {
            'breakfast': 'Breakfast',
            'lunch': 'Lunch', 
            'dinner': 'Dinner',
            'snack': 'Snack'
        }
        return type_mapping.get(obj.mealType, 'Snack')


class DailyLogSerializer(serializers.Serializer):
    """프론트엔드에서 요구하는 DailyLog 형식"""
    date = serializers.DateField()
    meals = MealLogSerializer(many=True)
    mission = serializers.CharField()
    emotion = serializers.CharField()
    memo = serializers.CharField()
    daily_goal = serializers.CharField(required=False)


class WeeklyAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyAnalysis
        fields = [
            'week_start', 'avg_calories', 'avg_protein', 'avg_carbs', 'avg_fat',
            'calorie_achievement_rate', 'protein_achievement_rate', 
            'carbs_achievement_rate', 'fat_achievement_rate', 'ai_advice'
        ]


class CalendarDataSerializer(serializers.Serializer):
    """캘린더 페이지 전체 데이터"""
    user_profile = UserProfileSerializer()
    badges = BadgeSerializer(many=True)
    daily_logs = DailyLogSerializer(many=True)
    weekly_analysis = WeeklyAnalysisSerializer(required=False)