"""
사용자 인증 관련 서비스

이 파일은 이메일 전송, 보안 관련 기능을 제공합니다.
"""

import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from .models import PasswordResetToken, LoginAttempt

User = get_user_model()



class PasswordResetService:
    """비밀번호 재설정 서비스"""
    
    @staticmethod
    def create_reset_token(user):
        """
        비밀번호 재설정 토큰 생성
        
        Args:
            user: User 인스턴스
            
        Returns:
            PasswordResetToken: 생성된 토큰 인스턴스
        """
        # 기존 토큰들 무효화
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # 새 토큰 생성
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)  # 24시간 후 만료
        
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        return reset_token
    
    @staticmethod
    def send_reset_email(user, reset_token):
        """
        비밀번호 재설정 이메일 전송
        
        Args:
            user: User 인스턴스
            reset_token: PasswordResetToken 인스턴스
            
        Returns:
            bool: 전송 성공 여부
        """
        try:
            # 사용자 닉네임 안전하게 가져오기
            try:
                user_name = user.profile.nickname
            except AttributeError:
                user_name = user.username
            
            # 재설정 링크 생성
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            
            # 이메일 내용 생성
            subject = "[FoodCalorie] 비밀번호 재설정 요청"
            
            html_message = f"""
            <html>
            <body>
                <h2>비밀번호 재설정</h2>
                <p>안녕하세요, {user_name}님!</p>
                <p>비밀번호 재설정을 요청하셨습니다.</p>
                <p>아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:</p>
                <p><a href="{reset_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">비밀번호 재설정</a></p>
                <p>이 링크는 24시간 후에 만료됩니다.</p>
                <p>만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시해주세요.</p>
                <hr>
                <p><small>FoodCalorie 팀</small></p>
            </body>
            </html>
            """
            
            plain_message = f"""
            비밀번호 재설정
            
            안녕하세요, {user_name}님!
            
            비밀번호 재설정을 요청하셨습니다.
            아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:
            
            {reset_url}
            
            이 링크는 24시간 후에 만료됩니다.
            만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시해주세요.
            
            FoodCalorie 팀
            """
            
            # 이메일 전송
            send_mail(
                subject=subject,
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            return True
            
        except Exception as e:
            print(f"이메일 전송 실패: {e}")
            return False


class SecurityService:
    """보안 관련 서비스"""
    
    @staticmethod
    def log_login_attempt(username, ip_address, user_agent, is_successful):
        """
        로그인 시도 기록
        
        Args:
            username: 사용자명
            ip_address: IP 주소
            user_agent: User Agent 문자열
            is_successful: 성공 여부
        """
        LoginAttempt.objects.create(
            username=username,
            ip_address=ip_address,
            user_agent=user_agent or '',
            is_successful=is_successful
        )
    
    @staticmethod
    def check_rate_limit(ip_address, username=None, time_window=15, max_attempts=5):
        """
        Rate Limiting 검사
        
        Args:
            ip_address: IP 주소
            username: 사용자명 (선택사항)
            time_window: 시간 창 (분)
            max_attempts: 최대 시도 횟수
            
        Returns:
            dict: {'allowed': bool, 'remaining': int, 'reset_time': datetime}
        """
        since = timezone.now() - timedelta(minutes=time_window)
        
        # IP 기반 제한 확인
        ip_attempts = LoginAttempt.objects.filter(
            ip_address=ip_address,
            attempted_at__gte=since,
            is_successful=False
        ).count()
        
        # 사용자명 기반 제한 확인 (선택사항)
        user_attempts = 0
        if username:
            user_attempts = LoginAttempt.objects.filter(
                username=username,
                attempted_at__gte=since,
                is_successful=False
            ).count()
        
        # 더 높은 시도 횟수를 기준으로 판단
        attempts = max(ip_attempts, user_attempts)
        
        return {
            'allowed': attempts < max_attempts,
            'remaining': max(0, max_attempts - attempts),
            'reset_time': timezone.now() + timedelta(minutes=time_window),
            'attempts': attempts
        }
    
    @staticmethod
    def get_client_ip(request):
        """
        클라이언트 IP 주소 추출
        
        Args:
            request: Django request 객체
            
        Returns:
            str: IP 주소
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def get_user_agent(request):
        """
        User Agent 추출
        
        Args:
            request: Django request 객체
            
        Returns:
            str: User Agent 문자열
        """
        return request.META.get('HTTP_USER_AGENT', '')


class ProfileService:
    """프로필 관련 서비스"""
    
    @staticmethod
    def update_challenge_recommendations(user_profile):
        """
        프로필 업데이트 시 챌린지 추천 칼로리 재계산
        
        Args:
            user_profile: UserProfile 인스턴스
        """
        if not user_profile.is_complete_profile():
            return
        
        try:
            # 권장 칼로리 계산
            recommended_calories = user_profile.get_recommended_calories()
            
            if recommended_calories:
                # 챌린지 시스템과 연동
                from challenges.models import UserChallenge
                
                # 활성 챌린지의 추천 칼로리 업데이트
                active_challenges = UserChallenge.objects.filter(
                    user=user_profile.user,
                    status='active'
                )
                
                for challenge in active_challenges:
                    # 기존 목표 칼로리와 차이가 클 경우에만 업데이트
                    if abs(challenge.room.target_calorie - recommended_calories) > 200:
                        print(f"챌린지 추천 칼로리 업데이트: {user_profile.nickname} -> {recommended_calories}kcal")
                        # TODO: 사용자에게 알림 전송
                
        except ImportError:
            # 챌린지 앱이 없는 경우 무시
            pass
        except Exception as e:
            print(f"챌린지 추천 칼로리 업데이트 오류: {e}")
    
    @staticmethod
    def generate_unique_nickname(base_nickname):
        """
        유니크한 닉네임 생성
        
        Args:
            base_nickname: 기본 닉네임
            
        Returns:
            str: 유니크한 닉네임
        """
        from .models import UserProfile
        
        nickname = base_nickname
        counter = 1
        
        while UserProfile.objects.filter(nickname=nickname).exists():
            nickname = f"{base_nickname}_{counter}"
            counter += 1
        
        return nickname




class LoginAttemptService:
    """
    로그인 시도 기록 및 관리 서비스
    """
    
    @staticmethod
    def record_attempt(request, email, user=None, success=False, attempt_type='login'):
        """
        로그인/로그아웃 시도 기록
        
        Args:
            request: Django request 객체
            email: 시도한 이메일
            user: 사용자 객체 (성공 시)
            success: 로그인/로그아웃 성공 여부
            attempt_type: 시도 타입 ('login' 또는 'logout')
        """
        from .models import LoginAttempt
        
        # IP 주소 추출
        ip_address = LoginAttemptService.get_client_ip(request)
        
        # User Agent 추출
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # 길이 제한
        
        # 로그인/로그아웃 시도 기록 생성
        LoginAttempt.objects.create(
            username=email,
            ip_address=ip_address,
            user_agent=user_agent,
            is_successful=success
            # attempt_type은 LoginAttempt 모델에 필드가 있을 때만 저장
            # 현재는 기본 필드만 사용
        )
    
    @staticmethod
    def get_client_ip(request):
        """클라이언트 IP 주소 추출"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def get_recent_failed_attempts(email, minutes=15):
        """
        최근 실패한 로그인 시도 횟수 조회
        
        Args:
            email: 이메일 주소
            minutes: 조회할 시간 범위 (분)
            
        Returns:
            int: 실패한 로그인 시도 횟수
        """
        from django.utils import timezone
        from datetime import timedelta
        from .models import LoginAttempt
        
        cutoff_time = timezone.now() - timedelta(minutes=minutes)
        
        return LoginAttempt.objects.filter(
            username=email,
            is_successful=False,
            attempted_at__gte=cutoff_time
        ).count()
    
    @staticmethod
    def is_account_locked(email, max_attempts=5, lockout_minutes=15):
        """
        계정 잠금 상태 확인
        
        Args:
            email: 이메일 주소
            max_attempts: 최대 시도 횟수
            lockout_minutes: 잠금 시간 (분)
            
        Returns:
            bool: 계정 잠금 여부
        """
        failed_attempts = LoginAttemptService.get_recent_failed_attempts(
            email, lockout_minutes
        )
        return failed_attempts >= max_attempts
    
    @staticmethod
    def get_lockout_remaining_time(email, max_attempts=5, lockout_minutes=15):
        """
        계정 잠금 해제까지 남은 시간 계산
        
        Returns:
            int: 남은 시간 (초), 잠금되지 않은 경우 0
        """
        from django.utils import timezone
        from datetime import timedelta
        from .models import LoginAttempt
        
        if not LoginAttemptService.is_account_locked(email, max_attempts, lockout_minutes):
            return 0
        
        cutoff_time = timezone.now() - timedelta(minutes=lockout_minutes)
        
        # 가장 오래된 실패 시도 찾기
        oldest_failed_attempt = LoginAttempt.objects.filter(
            username=email,
            is_successful=False,
            attempted_at__gte=cutoff_time
        ).order_by('attempted_at').first()
        
        if oldest_failed_attempt:
            unlock_time = oldest_failed_attempt.attempted_at + timedelta(minutes=lockout_minutes)
            remaining_seconds = (unlock_time - timezone.now()).total_seconds()
            return max(0, int(remaining_seconds))
        
        return 0


