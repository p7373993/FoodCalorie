from rest_framework import serializers
from .models import (
    ChallengeRoom, UserChallenge, DailyChallengeRecord, 
    CheatDayRequest, ChallengeBadge, UserChallengeBadge
)
from django.contrib.auth.models import User


class ChallengeRoomSerializer(serializers.ModelSerializer):
    """챌린지 방 시리얼라이저"""
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChallengeRoom
        fields = [
            'id', 'name', 'target_calorie', 'tolerance', 'description',
            'is_active', 'created_at', 'dummy_users_count', 'participant_count'
        ]
    
    def get_participant_count(self, obj):
        """실제 참여자 수 + 더미 사용자 수"""
        active_participants = UserChallenge.objects.filter(
            room=obj, 
            status='active'
        ).count()
        return active_participants + obj.dummy_users_count


class UserChallengeSerializer(serializers.ModelSerializer):
    """사용자 챌린지 시리얼라이저"""
    room_name = serializers.CharField(source='room.name', read_only=True)
    target_calorie = serializers.IntegerField(source='room.target_calorie', read_only=True)
    challenge_end_date = serializers.DateField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserChallenge
        fields = [
            'id', 'room', 'room_name', 'target_calorie',
            'user_height', 'user_weight', 'user_target_weight',
            'user_challenge_duration_days', 'user_weekly_cheat_limit',
            'min_daily_meals', 'challenge_cutoff_time',  # 새로운 식사 규칙 필드
            'current_streak_days', 'max_streak_days', 'remaining_duration_days',
            'current_weekly_cheat_count', 'total_success_days', 'total_failure_days',
            'status', 'challenge_start_date', 'challenge_end_date', 'is_active',
            'last_activity_date', 'created_at'
        ]
        read_only_fields = [
            'current_streak_days', 'max_streak_days', 'remaining_duration_days',
            'current_weekly_cheat_count', 'total_success_days', 'total_failure_days',
            'status', 'challenge_start_date', 'last_activity_date', 'created_at'
        ]


class ChallengeJoinSerializer(serializers.Serializer):
    """챌린지 참여 요청 시리얼라이저"""
    room_id = serializers.IntegerField()
    user_height = serializers.FloatField(min_value=100, max_value=250)
    user_weight = serializers.FloatField(min_value=30, max_value=300)
    user_target_weight = serializers.FloatField(min_value=30, max_value=300)
    user_challenge_duration_days = serializers.IntegerField(min_value=7, max_value=365)
    user_weekly_cheat_limit = serializers.ChoiceField(choices=[0, 1, 2, 3])
    
    # 식사 규칙 설정
    min_daily_meals = serializers.ChoiceField(
        choices=[1, 2, 3, 4, 5], 
        default=2,
        help_text="하루 최소 식사 횟수"
    )
    challenge_cutoff_time = serializers.TimeField(
        default='23:00:00',
        help_text="챌린지 인정 마감 시간 (HH:MM:SS 형식)"
    )


class DailyChallengeRecordSerializer(serializers.ModelSerializer):
    """일일 챌린지 기록 시리얼라이저"""
    calorie_difference = serializers.FloatField(read_only=True)
    
    class Meta:
        model = DailyChallengeRecord
        fields = [
            'id', 'date', 'total_calories', 'target_calories', 
            'is_success', 'is_cheat_day', 'meal_count', 
            'calorie_difference', 'created_at'
        ]


class CheatDayRequestSerializer(serializers.ModelSerializer):
    """치팅 요청 시리얼라이저"""
    class Meta:
        model = CheatDayRequest
        fields = ['id', 'date', 'requested_at', 'is_approved', 'reason']
        read_only_fields = ['requested_at', 'is_approved']


class ChallengeBadgeSerializer(serializers.ModelSerializer):
    """챌린지 배지 시리얼라이저"""
    class Meta:
        model = ChallengeBadge
        fields = [
            'id', 'name', 'description', 'icon', 
            'condition_type', 'condition_value', 'is_active'
        ]


class UserChallengeBadgeSerializer(serializers.ModelSerializer):
    """사용자 획득 배지 시리얼라이저"""
    badge = ChallengeBadgeSerializer(read_only=True)
    
    class Meta:
        model = UserChallengeBadge
        fields = ['id', 'badge', 'earned_at']


class LeaderboardEntrySerializer(serializers.Serializer):
    """리더보드 항목 시리얼라이저"""
    rank = serializers.IntegerField()
    username = serializers.CharField()
    user_id = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    max_streak = serializers.IntegerField()
    total_success_days = serializers.IntegerField()
    challenge_start_date = serializers.DateField()
    last_activity = serializers.DateField()


class ChallengeStatisticsSerializer(serializers.Serializer):
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