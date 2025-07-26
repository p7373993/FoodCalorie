"""
사용자 인증 시스템 시리얼라이저

이 파일은 API 요청/응답 데이터 직렬화를 담당합니다.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import UserProfile, PasswordResetToken, LoginAttempt
from .services import JWTAuthService

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    """
    회원가입용 Serializer
    이메일, 비밀번호, 닉네임 검증 및 사용자 생성
    """
    email = serializers.EmailField(
        max_length=254,
        help_text="사용자 이메일 주소"
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
        help_text="비밀번호 (8자 이상)"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
        help_text="비밀번호 확인"
    )
    nickname = serializers.CharField(
        max_length=50,
        help_text="사용자 닉네임"
    )
    remember_me = serializers.BooleanField(
        default=False,
        required=False,
        help_text="로그인 상태 유지 여부"
    )

    def validate_email(self, value):
        """이메일 중복 검사"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 존재하는 이메일입니다.")
        return value

    def validate_nickname(self, value):
        """닉네임 중복 검사"""
        if UserProfile.objects.filter(nickname=value).exists():
            raise serializers.ValidationError("이미 사용 중인 닉네임입니다.")
        
        # 닉네임 길이 및 특수문자 검증
        if len(value.strip()) < 2:
            raise serializers.ValidationError("닉네임은 2자 이상이어야 합니다.")
        
        # 특수문자 검증 (한글, 영문, 숫자, 일부 특수문자만 허용)
        import re
        if not re.match(r'^[a-zA-Z0-9가-힣_.-]+$', value):
            raise serializers.ValidationError("닉네임에는 한글, 영문, 숫자, _, ., - 만 사용할 수 있습니다.")
        
        return value.strip()

    def validate_password(self, value):
        """비밀번호 강도 검증"""
        # 비밀번호 길이 검증
        if len(value) < 8:
            raise serializers.ValidationError("비밀번호는 최소 8자 이상이어야 합니다.")
        
        # 비밀번호 복잡성 검증
        import re
        
        # 영문, 숫자, 특수문자 포함 여부 확인
        has_letter = re.search(r'[a-zA-Z]', value)
        has_digit = re.search(r'\d', value)
        has_special = re.search(r'[!@#$%^&*(),.?":{}|<>]', value)
        
        if not has_letter:
            raise serializers.ValidationError("비밀번호에는 영문자가 포함되어야 합니다.")
        
        if not has_digit:
            raise serializers.ValidationError("비밀번호에는 숫자가 포함되어야 합니다.")
        
        if not has_special:
            raise serializers.ValidationError("비밀번호에는 특수문자가 포함되어야 합니다.")
        
        # 너무 간단한 비밀번호 검증
        if value.lower() in ['password', '123456', 'qwerty', 'admin']:
            raise serializers.ValidationError("너무 간단한 비밀번호는 사용할 수 없습니다.")
        
        return value

    def validate(self, attrs):
        """비밀번호 일치 검증"""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': '비밀번호가 일치하지 않습니다.'
            })
        
        return attrs

    def create(self, validated_data):
        """
        사용자 계정 생성 및 자동 로그인 처리
        """
        # password_confirm 제거 (DB 저장 불필요)
        validated_data.pop('password_confirm')
        remember_me = validated_data.pop('remember_me', False)
        nickname = validated_data.pop('nickname')
        
        # 사용자 생성
        user = User.objects.create_user(
            username=validated_data['email'],  # 이메일을 username으로 사용
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # UserProfile은 signals에 의해 자동 생성되므로, 닉네임만 업데이트
        # profile 속성으로 접근 (related_name='profile')
        user.profile.nickname = nickname
        user.profile.save()
        
        # JWT 토큰 생성 (자동 로그인 처리)
        tokens = JWTAuthService.generate_tokens_with_extended_refresh(
            user, extend_refresh=remember_me
        )
        
        # 사용자 정보와 토큰을 함께 반환
        return {
            'user': user,
            'tokens': tokens,
            'profile': user.profile
        }


class LoginSerializer(serializers.Serializer):
    """
    로그인용 Serializer
    """
    email = serializers.EmailField(help_text="사용자 이메일")
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="비밀번호"
    )
    remember_me = serializers.BooleanField(
        default=False,
        required=False,
        help_text="로그인 상태 유지 여부"
    )

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # 이메일로 사용자 찾기
            try:
                user = User.objects.get(email=email)
                username = user.username
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'non_field_errors': '이메일 또는 비밀번호가 올바르지 않습니다.'
                })
            
            # 인증
            user = authenticate(username=username, password=password)
            
            if user:
                if not user.is_active:
                    raise serializers.ValidationError({
                        'non_field_errors': '비활성화된 계정입니다.'
                    })
                attrs['user'] = user
            else:
                raise serializers.ValidationError({
                    'non_field_errors': '이메일 또는 비밀번호가 올바르지 않습니다.'
                })
        else:
            raise serializers.ValidationError({
                'non_field_errors': '이메일과 비밀번호를 모두 입력해주세요.'
            })
        
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    사용자 프로필 Serializer
    """
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()
    recommended_calories = serializers.SerializerMethodField()
    is_profile_complete = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'username', 'nickname', 'height', 'weight', 
            'age', 'gender', 'profile_image', 'bio', 'is_profile_public',
            'email_notifications', 'push_notifications', 'created_at', 
            'updated_at', 'bmi', 'bmi_category', 'recommended_calories',
            'is_profile_complete'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_bmi(self, obj):
        return obj.get_bmi()

    def get_bmi_category(self, obj):
        return obj.get_bmi_category()

    def get_recommended_calories(self, obj):
        return obj.get_recommended_calories()

    def get_is_profile_complete(self, obj):
        return obj.is_complete_profile()

    def validate_nickname(self, value):
        """닉네임 중복 검사 (본인 제외)"""
        if value:
            existing_profile = UserProfile.objects.filter(nickname=value).exclude(
                id=self.instance.id if self.instance else None
            ).first()
            
            if existing_profile:
                raise serializers.ValidationError("이미 사용 중인 닉네임입니다.")
            
            # 닉네임 형식 검증
            if len(value.strip()) < 2:
                raise serializers.ValidationError("닉네임은 2자 이상이어야 합니다.")
            
            import re
            if not re.match(r'^[a-zA-Z0-9가-힣_.-]+$', value):
                raise serializers.ValidationError(
                    "닉네임에는 한글, 영문, 숫자, _, ., - 만 사용할 수 있습니다."
                )
        
        return value.strip() if value else value


class PasswordChangeSerializer(serializers.Serializer):
    """
    비밀번호 변경용 Serializer
    """
    current_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text="현재 비밀번호"
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="새 비밀번호 (8자 이상)"
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="새 비밀번호 확인"
    )

    def validate_current_password(self, value):
        """현재 비밀번호 확인"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value

    def validate_new_password(self, value):
        """새 비밀번호 강도 검증"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        """새 비밀번호 일치 검증"""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': '새 비밀번호가 일치하지 않습니다.'
            })
        
        return attrs

    def save(self):
        """비밀번호 변경 처리"""
        user = self.context['request'].user
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    비밀번호 재설정 요청용 Serializer
    """
    email = serializers.EmailField(help_text="등록된 이메일 주소")

    def validate_email(self, value):
        """이메일 존재 여부 확인"""
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("등록되지 않은 이메일입니다.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    비밀번호 재설정 확인용 Serializer
    """
    token = serializers.CharField(help_text="비밀번호 재설정 토큰")
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="새 비밀번호 (8자 이상)"
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="새 비밀번호 확인"
    )

    def validate_token(self, value):
        """토큰 유효성 확인"""
        try:
            reset_token = PasswordResetToken.objects.get(token=value)
            if not reset_token.is_valid():
                raise serializers.ValidationError("만료되었거나 이미 사용된 토큰입니다.")
            self.reset_token = reset_token
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("유효하지 않은 토큰입니다.")
        return value

    def validate_new_password(self, value):
        """새 비밀번호 강도 검증"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        """새 비밀번호 일치 검증"""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': '새 비밀번호가 일치하지 않습니다.'
            })
        
        return attrs

    def save(self):
        """비밀번호 재설정 처리"""
        user = self.reset_token.user
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
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