from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class UserProfile(models.Model):
    """
    사용자 프로필 모델
    Django 기본 User 모델을 확장하여 추가 정보를 저장
    """
    
    GENDER_CHOICES = [
        ('male', '남성'),
        ('female', '여성'),
    ]
    
    # 사용자와 1:1 관계
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile',
        verbose_name='사용자'
    )
    
    # 기본 프로필 정보
    nickname = models.CharField(
        max_length=50, 
        unique=True,
        verbose_name='닉네임',
        help_text='다른 사용자에게 표시되는 이름'
    )
    
    # 신체 정보 (챌린지 시스템에서 칼로리 계산에 사용)
    height = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(100.0), MaxValueValidator(250.0)],
        verbose_name='키 (cm)',
        help_text='신장을 센티미터 단위로 입력'
    )
    
    weight = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(30.0), MaxValueValidator(300.0)],
        verbose_name='몸무게 (kg)',
        help_text='체중을 킬로그램 단위로 입력'
    )
    
    age = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(10), MaxValueValidator(120)],
        verbose_name='나이',
        help_text='만 나이'
    )
    
    gender = models.CharField(
        max_length=10, 
        choices=GENDER_CHOICES,
        null=True,
        blank=True,
        verbose_name='성별'
    )
    
    # 프로필 이미지
    profile_image = models.ImageField(
        upload_to='profiles/%Y/%m/', 
        null=True, 
        blank=True,
        verbose_name='프로필 이미지',
        help_text='프로필 사진 (선택사항)'
    )
    
    # 추가 설정
    bio = models.TextField(
        max_length=500,
        blank=True,
        verbose_name='자기소개',
        help_text='간단한 자기소개 (최대 500자)'
    )
    
    # 개인정보 공개 설정
    is_profile_public = models.BooleanField(
        default=True,
        verbose_name='프로필 공개',
        help_text='다른 사용자에게 프로필 정보 공개 여부'
    )
    
    # 알림 설정
    email_notifications = models.BooleanField(
        default=True,
        verbose_name='이메일 알림',
        help_text='이메일로 알림 받기'
    )
    
    push_notifications = models.BooleanField(
        default=True,
        verbose_name='푸시 알림',
        help_text='앱에서 푸시 알림 받기'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )
    
    class Meta:
        verbose_name = '사용자 프로필'
        verbose_name_plural = '사용자 프로필들'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.nickname} ({self.user.username})"
    
    def get_full_name(self):
        """전체 이름 반환 (User 모델의 first_name + last_name)"""
        return self.user.get_full_name() or self.nickname
    
    def get_bmi(self):
        """BMI 계산"""
        if self.height and self.weight:
            height_m = self.height / 100  # cm를 m로 변환
            return round(self.weight / (height_m ** 2), 2)
        return None
    
    def get_bmi_category(self):
        """BMI 분류 반환"""
        bmi = self.get_bmi()
        if not bmi:
            return '정보 없음'
        
        if bmi < 18.5:
            return '저체중'
        elif bmi < 23:
            return '정상'
        elif bmi < 25:
            return '과체중'
        elif bmi < 30:
            return '비만 1단계'
        elif bmi < 35:
            return '비만 2단계'
        else:
            return '비만 3단계'
    
    def calculate_bmr(self):
        """기초대사율 계산 (Harris-Benedict 공식)"""
        if not all([self.height, self.weight, self.age, self.gender]):
            return None
        
        if self.gender == 'male':
            # 남성: BMR = 88.362 + (13.397 × 체중kg) + (4.799 × 신장cm) - (5.677 × 나이)
            bmr = 88.362 + (13.397 * self.weight) + (4.799 * self.height) - (5.677 * self.age)
        else:
            # 여성: BMR = 447.593 + (9.247 × 체중kg) + (3.098 × 신장cm) - (4.330 × 나이)
            bmr = 447.593 + (9.247 * self.weight) + (3.098 * self.height) - (4.330 * self.age)
        
        return round(bmr, 2)
    
    def get_recommended_calories(self, activity_level='moderately_active'):
        """활동 수준에 따른 권장 칼로리 계산"""
        bmr = self.calculate_bmr()
        if not bmr:
            return None
        
        # 활동 계수
        activity_factors = {
            'sedentary': 1.2,          # 비활동적 (운동 안함)
            'lightly_active': 1.375,   # 가벼운 활동 (주 1-3회 운동)
            'moderately_active': 1.55, # 보통 활동 (주 3-5회 운동)
            'very_active': 1.725,      # 활발한 활동 (주 6-7회 운동)
            'extra_active': 1.9        # 매우 활발 (하루 2회 운동)
        }
        
        factor = activity_factors.get(activity_level, 1.55)
        return round(bmr * factor, 2)
    
    def is_complete_profile(self):
        """프로필이 완전한지 확인"""
        required_fields = [self.height, self.weight, self.age, self.gender]
        return all(field is not None for field in required_fields)
    
    def get_profile_completion_percentage(self):
        """프로필 완성도 퍼센트 계산"""
        total_fields = ['nickname', 'height', 'weight', 'age', 'gender', 'bio', 'profile_image']
        completed_fields = 0
        
        for field in total_fields:
            value = getattr(self, field)
            if value is not None and value != '':
                completed_fields += 1
        
        return round((completed_fields / len(total_fields)) * 100, 1)
    
    def get_missing_profile_fields(self):
        """완성되지 않은 프로필 필드 목록 반환"""
        required_fields = {
            'height': '키',
            'weight': '몸무게', 
            'age': '나이',
            'gender': '성별'
        }
        
        missing = []
        for field, display_name in required_fields.items():
            if getattr(self, field) is None:
                missing.append(display_name)
        
        return missing


class PasswordResetToken(models.Model):
    """
    비밀번호 재설정 토큰 모델
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='사용자'
    )
    
    token = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='재설정 토큰'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )
    
    expires_at = models.DateTimeField(
        verbose_name='만료일시'
    )
    
    is_used = models.BooleanField(
        default=False,
        verbose_name='사용 여부'
    )
    
    class Meta:
        verbose_name = '비밀번호 재설정 토큰'
        verbose_name_plural = '비밀번호 재설정 토큰들'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.token[:10]}..."
    
    def is_valid(self):
        """토큰이 유효한지 확인"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """토큰을 사용됨으로 표시"""
        self.is_used = True
        self.save()


class LoginAttempt(models.Model):
    """
    로그인 시도 기록 모델 (보안 모니터링용)
    """
    username = models.CharField(
        max_length=150,
        verbose_name='사용자명'
    )
    
    ip_address = models.GenericIPAddressField(
        verbose_name='IP 주소'
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    
    is_successful = models.BooleanField(
        verbose_name='성공 여부'
    )
    
    attempted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='시도 일시'
    )
    
    class Meta:
        verbose_name = '로그인 시도'
        verbose_name_plural = '로그인 시도들'
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['username', 'attempted_at']),
            models.Index(fields=['ip_address', 'attempted_at']),
        ]
    
    def __str__(self):
        status = "성공" if self.is_successful else "실패"
        return f"{self.username} - {status} ({self.attempted_at})"
