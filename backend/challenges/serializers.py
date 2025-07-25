from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    ChallengeRoom, UserChallenge, DailyChallengeRecord, 
    CheatDayRequest, ChallengeBadge, UserChallengeBadge
)


class ChallengeRoomSerializer(serializers.ModelSerializer):
    """챌린지 방 시리얼라이저"""
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChallengeRoom
        fields = [
            'id', 'name', 'target_calorie', 'tolerance', 'description',
            'is_active', 'created_at', 'dummy_users_count', 'participant_count'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_participant_count(self, obj):
        """실제 참여자 수 + 더미 사용자 수"""
        active_participants = obj.participants.filter(status='active').count()
        return active_participants + obj.dummy_users_count


class UserChallengeSerializer(serializers.ModelSerializer):
    """사용자 챌린지 시리얼라이저"""
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_target_calorie = serializers.IntegerField(source='room.target_calorie', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    challenge_end_date = serializers.DateField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserChallenge
        fields = [
            'id', 'user', 'room', 'room_name', 'room_target_calorie', 'username',
            'user_height', 'user_weight', 'user_target_weight', 
            'user_challenge_duration_days', 'user_weekly_cheat_limit',
            'current_streak_days', 'max_streak_days', 'remaining_duration_days',
            'current_weekly_cheat_count', 'total_success_days', 'total_failure_days',
            'status', 'challenge_start_date', 'challenge_end_date', 'last_activity_date',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'current_streak_days', 'max_streak_days', 
            'current_weekly_cheat_count', 'total_success_days', 'total_failure_days',
            'challenge_start_date', 'last_activity_date', 'created_at', 'updated_at'
        ]


class UserChallengeCreateSerializer(serializers.ModelSerializer):
    """챌린지 참여 생성 시리얼라이저"""
    
    class Meta:
        model = UserChallenge
        fields = [
            'room', 'user_height', 'user_weight', 'user_target_weight',
            'user_challenge_duration_days', 'user_weekly_cheat_limit'
        ]
    
    def validate(self, data):
        """챌린지 참여 검증"""
        user = self.context['request'].user
        room = data['room']
        
        # 이미 해당 방에 참여 중인지 확인
        if UserChallenge.objects.filter(user=user, room=room, status='active').exists():
            raise serializers.ValidationError("이미 해당 챌린지에 참여 중입니다.")
        
        # 키, 몸무게 검증
        if data['user_height'] < 100 or data['user_height'] > 250:
            raise serializers.ValidationError("키는 100cm~250cm 사이여야 합니다.")
        
        if data['user_weight'] < 30 or data['user_weight'] > 300:
            raise serializers.ValidationError("몸무게는 30kg~300kg 사이여야 합니다.")
        
        if data['user_target_weight'] < 30 or data['user_target_weight'] > 300:
            raise serializers.ValidationError("목표 체중은 30kg~300kg 사이여야 합니다.")
        
        # 챌린지 기간 검증
        if data['user_challenge_duration_days'] < 7 or data['user_challenge_duration_days'] > 365:
            raise serializers.ValidationError("챌린지 기간은 7일~365일 사이여야 합니다.")
        
        return data
    
    def create(self, validated_data):
        """챌린지 참여 생성"""
        validated_data['user'] = self.context['request'].user
        validated_data['remaining_duration_days'] = validated_data['user_challenge_duration_days']
        return super().create(validated_data)


class DailyChallengeRecordSerializer(serializers.ModelSerializer):
    """일일 챌린지 기록 시리얼라이저"""
    user_challenge_id = serializers.IntegerField(source='user_challenge.id', read_only=True)
    username = serializers.CharField(source='user_challenge.user.username', read_only=True)
    calorie_difference = serializers.FloatField(read_only=True)
    
    class Meta:
        model = DailyChallengeRecord
        fields = [
            'id', 'user_challenge_id', 'username', 'date',
            'total_calories', 'target_calories', 'calorie_difference',
            'is_success', 'is_cheat_day', 'meal_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CheatDayRequestSerializer(serializers.ModelSerializer):
    """치팅 요청 시리얼라이저"""
    username = serializers.CharField(source='user_challenge.user.username', read_only=True)
    
    class Meta:
        model = CheatDayRequest
        fields = [
            'id', 'user_challenge', 'username', 'date', 
            'requested_at', 'is_approved', 'reason'
        ]
        read_only_fields = ['id', 'requested_at', 'is_approved']


class ChallengeBadgeSerializer(serializers.ModelSerializer):
    """챌린지 배지 시리얼라이저"""
    
    class Meta:
        model = ChallengeBadge
        fields = [
            'id', 'name', 'description', 'icon', 'condition_type',
            'condition_value', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserChallengeBadgeSerializer(serializers.ModelSerializer):
    """사용자 획득 배지 시리얼라이저"""
    badge_name = serializers.CharField(source='badge.name', read_only=True)
    badge_description = serializers.CharField(source='badge.description', read_only=True)
    badge_icon = serializers.CharField(source='badge.icon', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserChallengeBadge
        fields = [
            'id', 'user', 'username', 'badge', 'badge_name', 
            'badge_description', 'badge_icon', 'earned_at', 'user_challenge'
        ]
        read_only_fields = ['id', 'earned_at']


class LeaderboardSerializer(serializers.Serializer):
    """리더보드 시리얼라이저"""
    rank = serializers.IntegerField()
    username = serializers.CharField()
    user_id = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    max_streak = serializers.IntegerField()
    total_success_days = serializers.IntegerField()
    challenge_start_date = serializers.DateField()
    last_activity = serializers.DateField()


class ChallengeStatsSerializer(serializers.Serializer):
    """챌린지 통계 시리얼라이저"""
    current_streak = serializers.IntegerField()
    max_streak = serializers.IntegerField()
    total_success_days = serializers.IntegerField()
    total_failure_days = serializers.IntegerField()
    success_rate = serializers.FloatField()
    recent_success_rate = serializers.FloatField()
    cheat_days_used = serializers.IntegerField()
    remaining_days = serializers.IntegerField()
    challenge_progress = serializers.FloatField()


class CheatStatusSerializer(serializers.Serializer):
    """치팅 현황 시리얼라이저"""
    used_count = serializers.IntegerField()
    limit = serializers.IntegerField()
    remaining = serializers.IntegerField()