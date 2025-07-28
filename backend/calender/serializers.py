from rest_framework import serializers
from django.contrib.auth.models import User
from .models import CalendarUserProfile, DailyGoal, Badge, UserBadge, WeeklyAnalysis
from accounts.models import UserProfile
from api_integrated.models import MealLog
from datetime import datetime, timedelta


class CalendarUserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CalendarUserProfile
        fields = ['name', 'avatar_url', 'calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal']
    
    def get_name(self, obj):
        # accounts.UserProfile에서 nickname 가져오기, 없으면 username 사용
        try:
            return obj.user.profile.nickname
        except:
            return obj.user.username
    
    def get_avatar_url(self, obj):
        # accounts.UserProfile에서 profile_image 가져오기
        try:
            if obj.user.profile.profile_image:
                return obj.user.profile.profile_image.url
        except:
            pass
        return None


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
        # 식사 타입별 기본 이미지 또는 음식 아이콘
        default_images = {
            'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',  # 아침식사
            'lunch': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',      # 점심식사  
            'dinner': 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop',     # 저녁식사
            'snack': 'https://images.unsplash.com/photo-1559054663-e8b64c2e5d96?w=400&h=300&fit=crop'       # 간식
        }
        return default_images.get(obj.mealType, default_images['lunch'])

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
    user_profile = CalendarUserProfileSerializer()
    badges = BadgeSerializer(many=True)
    daily_logs = DailyLogSerializer(many=True)
    weekly_analysis = WeeklyAnalysisSerializer(required=False)