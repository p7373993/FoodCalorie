from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import UserProfile, PasswordResetToken, LoginAttempt


class UserProfileInline(admin.StackedInline):
    """User 모델에 인라인으로 UserProfile 추가"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = '프로필 정보'
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('nickname', 'bio', 'profile_image')
        }),
        ('신체 정보', {
            'fields': ('height', 'weight', 'age', 'gender'),
            'description': '챌린지 시스템에서 칼로리 계산에 사용됩니다.'
        }),
        ('설정', {
            'fields': ('is_profile_public', 'email_notifications', 'push_notifications'),
            'classes': ('collapse',)
        }),
    )


class UserAdmin(BaseUserAdmin):
    """사용자 관리 페이지 커스터마이징"""
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'get_nickname', 'get_profile_status', 'is_active', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'date_joined', 'profile__gender')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'profile__nickname')
    
    def get_nickname(self, obj):
        """닉네임 표시"""
        try:
            return obj.profile.nickname
        except UserProfile.DoesNotExist:
            return '-'
    get_nickname.short_description = '닉네임'
    
    def get_profile_status(self, obj):
        """프로필 완성도 표시"""
        try:
            profile = obj.profile
            if profile.is_complete_profile():
                return format_html('<span style="color: green;">✓ 완료</span>')
            else:
                return format_html('<span style="color: orange;">⚠ 미완료</span>')
        except UserProfile.DoesNotExist:
            return format_html('<span style="color: red;">✗ 없음</span>')
    get_profile_status.short_description = '프로필 상태'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """사용자 프로필 관리"""
    list_display = ('nickname', 'user', 'get_bmi', 'get_bmi_category', 'gender', 'is_complete_profile', 'created_at')
    list_filter = ('gender', 'is_profile_public', 'created_at')
    search_fields = ('nickname', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'get_bmi', 'get_bmi_category', 'calculate_bmr', 'get_recommended_calories_display')
    
    fieldsets = (
        ('사용자 정보', {
            'fields': ('user', 'nickname')
        }),
        ('신체 정보', {
            'fields': ('height', 'weight', 'age', 'gender'),
            'description': '칼로리 계산에 사용되는 정보입니다.'
        }),
        ('계산된 값', {
            'fields': ('get_bmi', 'get_bmi_category', 'calculate_bmr', 'get_recommended_calories_display'),
            'classes': ('collapse',),
            'description': '신체 정보를 바탕으로 자동 계산된 값들입니다.'
        }),
        ('프로필', {
            'fields': ('profile_image', 'bio')
        }),
        ('설정', {
            'fields': ('is_profile_public', 'email_notifications', 'push_notifications'),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_recommended_calories_display(self, obj):
        """권장 칼로리 표시용"""
        calories = obj.get_recommended_calories()
        if calories:
            return f"{calories} kcal/일"
        return "정보 부족"
    get_recommended_calories_display.short_description = '권장 칼로리'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """비밀번호 재설정 토큰 관리"""
    list_display = ('user', 'token_short', 'created_at', 'expires_at', 'is_used', 'is_valid')
    list_filter = ('is_used', 'created_at', 'expires_at')
    search_fields = ('user__username', 'user__email', 'token')
    readonly_fields = ('created_at', 'is_valid')
    
    def token_short(self, obj):
        """토큰 일부만 표시 (보안)"""
        return f"{obj.token[:10]}..."
    token_short.short_description = '토큰'
    
    def is_valid(self, obj):
        """토큰 유효성 표시"""
        if obj.is_valid():
            return format_html('<span style="color: green;">✓ 유효</span>')
        else:
            return format_html('<span style="color: red;">✗ 무효</span>')
    is_valid.short_description = '유효성'


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """로그인 시도 기록 관리"""
    list_display = ('username', 'ip_address', 'is_successful', 'attempted_at', 'user_agent_short')
    list_filter = ('is_successful', 'attempted_at')
    search_fields = ('username', 'ip_address')
    readonly_fields = ('username', 'ip_address', 'user_agent', 'is_successful', 'attempted_at')
    
    def user_agent_short(self, obj):
        """User Agent 일부만 표시"""
        if len(obj.user_agent) > 50:
            return f"{obj.user_agent[:50]}..."
        return obj.user_agent
    user_agent_short.short_description = 'User Agent'
    
    def has_add_permission(self, request):
        """추가 권한 제거 (읽기 전용)"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """수정 권한 제거 (읽기 전용)"""
        return False


# 기존 User admin 등록 해제 후 새로운 admin 등록
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# Admin 사이트 커스터마이징
admin.site.site_header = "FoodCalorie 관리자"
admin.site.site_title = "FoodCalorie 관리자"
admin.site.index_title = "사용자 인증 시스템 관리"
