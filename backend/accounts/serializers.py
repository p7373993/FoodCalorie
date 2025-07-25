"""
사용자 인증 시스템 시리얼라이저

이 파일은 API 요청/응답 데이터 직렬화를 담당합니다.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import UserProfile, PasswordResetToken


class UserProfileSerializer(serializers.ModelSerializer):
    """사용자 프로필 시리얼라이저"""
    
    # 계산된 필드들 (읽기 전용)
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()
    bmr = serializers.SerializerMethodField()
    recommended_calories = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'nickname', 'height', 'weight', 'age', 'gender',
            'profile_image', 'bio', 'is_profile_public',
            'email_notifications', 'push_notifications',
            'bmi', 'bmi_category', 'bmr', 'recommended_calories', 'is_complete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_bmi(self, obj):
        return obj.get_bmi()
    
    def get_bmi_category(self, obj):
        return obj.get_bmi_category()
    
    def get_bmr(self, obj):
        return obj.calculate_bmr()
    
    def get_recommended_calories(self, obj):
        return obj.get_recommended_calories()
    
    def get_is_complete(self, obj):
        return obj.is_complete_profile()
    
    def validate_nickname(self, value):
        """닉네임 중복 검사"""
        user = self.context['request'].user if self.context.get('request') else None
        
        # 현재 사용자의 닉네임은 제외하고 중복 검사
        queryset = UserProfile.objects.filter(nickname=value)
        if user and hasattr(user, 'profile'):
            queryset = queryset.exclude(id=user.profile.id)
        
        if queryset.exists():
            raise serializers.ValidationError("이미 사용 중인 닉네임입니다.")
        
        return value


class UserSerializer(serializers.ModelSerializer):
    """사용자 기본 정보 시리얼라이저"""
    
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'profile']
        read_only_fields = ['id', 'username', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """회원가입 시리얼라이저"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    nickname = serializers.CharField(max_length=50)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'nickname']
    
    def validate_email(self, value):
        """이메일 중복 검사"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value
    
    def validate_nickname(self, value):
        """닉네임 중복 검사"""
        if UserProfile.objects.filter(nickname=value).exists():
            raise serializers.ValidationError("이미 사용 중인 닉네임입니다.")
        return value
    
    def validate(self, attrs):
        """비밀번호 확인"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs
    
    def create(self, validated_data):
        """사용자 생성"""
        # password_confirm과 nickname 제거
        validated_data.pop('password_confirm')
        nickname = validated_data.pop('nickname')
        
        # 사용자 생성
        user = User.objects.create_user(**validated_data)
        
        # 프로필 업데이트 (시그널로 이미 생성됨)
        user.profile.nickname = nickname
        user.profile.save()
        
        return user


class LoginSerializer(serializers.Serializer):
    """로그인 시리얼라이저"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        """로그인 검증"""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
                if not user.check_password(password):
                    raise serializers.ValidationError("이메일 또는 비밀번호가 올바르지 않습니다.")
                if not user.is_active:
                    raise serializers.ValidationError("비활성화된 계정입니다.")
                attrs['user'] = user
            except User.DoesNotExist:
                raise serializers.ValidationError("이메일 또는 비밀번호가 올바르지 않습니다.")
        else:
            raise serializers.ValidationError("이메일과 비밀번호를 모두 입력해주세요.")
        
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """비밀번호 변경 시리얼라이저"""
    
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_current_password(self, value):
        """현재 비밀번호 확인"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value
    
    def validate(self, attrs):
        """새 비밀번호 확인"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("새 비밀번호가 일치하지 않습니다.")
        return attrs
    
    def save(self):
        """비밀번호 변경"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """비밀번호 재설정 요청 시리얼라이저"""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """이메일 존재 확인"""
        try:
            user = User.objects.get(email=value)
            self.user = user
        except User.DoesNotExist:
            # 보안상 동일한 메시지 반환
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """비밀번호 재설정 확인 시리얼라이저"""
    
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_token(self, value):
        """토큰 유효성 검사"""
        try:
            reset_token = PasswordResetToken.objects.get(token=value)
            if not reset_token.is_valid():
                raise serializers.ValidationError("만료되었거나 이미 사용된 토큰입니다.")
            self.reset_token = reset_token
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("유효하지 않은 토큰입니다.")
        return value
    
    def validate(self, attrs):
        """새 비밀번호 확인"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs
    
    def save(self):
        """비밀번호 재설정"""
        user = self.reset_token.user
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # 토큰 사용 처리
        self.reset_token.mark_as_used()
        
        return user


class AdminUserListSerializer(serializers.ModelSerializer):
    """관리자용 사용자 목록 시리얼라이저"""
    
    profile_status = serializers.SerializerMethodField()
    last_login_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'date_joined', 'last_login',
            'profile_status', 'last_login_display'
        ]
    
    def get_profile_status(self, obj):
        """프로필 완성 상태"""
        try:
            return obj.profile.is_complete_profile()
        except UserProfile.DoesNotExist:
            return False
    
    def get_last_login_display(self, obj):
        """마지막 로그인 시간 표시"""
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M')
        return '로그인 기록 없음'


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """관리자용 사용자 상세 시리얼라이저"""
    
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'profile'
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'last_login']