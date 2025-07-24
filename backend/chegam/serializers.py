from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Meal, WeightEntry, Badge, GamificationProfile, Challenge


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['user', 'created_at', 'updated_at']


class MealSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Meal
        fields = [
            'id', 'user', 'image_url', 'calories', 'timestamp', 
            'analysis_data', 'ml_task_id', 'estimated_mass', 'confidence_score'
        ]
        read_only_fields = ['timestamp', 'user']


class MealCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = ['image_url', 'calories', 'analysis_data', 'ml_task_id', 'estimated_mass', 'confidence_score']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WeightEntrySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = WeightEntry
        fields = ['id', 'user', 'weight', 'timestamp']
        read_only_fields = ['timestamp', 'user']


class WeightEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightEntry
        fields = ['weight']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon']


class GamificationProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    badges = BadgeSerializer(many=True, read_only=True)
    badge_names = serializers.SerializerMethodField()
    
    class Meta:
        model = GamificationProfile
        fields = ['user', 'points', 'badges', 'badge_names']
    
    def get_badge_names(self, obj):
        return [badge.name for badge in obj.badges.all()]


class ChallengeSerializer(serializers.ModelSerializer):
    creator = serializers.StringRelatedField(read_only=True)
    participant_count = serializers.ReadOnlyField()
    participants = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = Challenge
        fields = [
            'id', 'title', 'description', 'type', 'goal', 
            'creator', 'participants', 'participant_count', 'created_at'
        ]
        read_only_fields = ['created_at', 'creator']


class ChallengeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challenge
        fields = ['title', 'description', 'type', 'goal']
    
    def create(self, validated_data):
        validated_data['creator'] = self.context['request'].user
        challenge = super().create(validated_data)
        # 생성자를 자동으로 참가자로 추가
        challenge.participants.add(self.context['request'].user)
        return challenge


class CalendarMealSerializer(serializers.ModelSerializer):
    """캘린더용 간소화된 식단 시리얼라이저"""
    date = serializers.SerializerMethodField()
    
    class Meta:
        model = Meal
        fields = ['id', 'image_url', 'calories', 'date', 'timestamp']
    
    def get_date(self, obj):
        return obj.timestamp.date().isoformat()