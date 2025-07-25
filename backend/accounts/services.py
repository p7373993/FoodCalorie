"""
사용자 인증 관련 서비스

이 파일은 JWT 토큰 관리, 이메일 전송, 보안 관련 기능을 제공합니다.
"""

import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from .models import PasswordResetToken, LoginAttempt

User = get_user_model()


class JWTAuthService:
    """
    JWT 인증 서비스 클래스
    토큰 생성, 검증, 갱신, 블랙리스트 관리를 담당
    """
    
    @staticmethod
    def generate_tokens(user) -> Dict[str, str]:
        """
        사용자를 위한 Access Token과 Refresh Token 생성
        
        Args:
            user: Django User 인스턴스
            
        Returns:
            Dict: access_token과 refresh_token을 포함한 딕셔너리
        """
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        # 사용자 정보를 토큰에 추가
        access['user_id'] = user.id
        access['username'] = user.username
        access['email'] = user.email
        
        return {
            'access_token': str(access),
            'refresh_token': str(refresh),
            'access_expires_at': datetime.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
            'refresh_expires_at': datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
        }
    
    @staticmethod
    def generate_tokens_with_extended_refresh(user, extend_refresh: bool = False) -> Dict[str, str]:
        """
        "로그인 상태 유지" 옵션을 위한 확장된 Refresh Token 생성
        
        Args:
            user: Django User 인스턴스
            extend_refresh: Refresh Token 만료시간 연장 여부
            
        Returns:
            Dict: 토큰 정보를 포함한 딕셔너리
        """
        refresh = RefreshToken.for_user(user)
        
        if extend_refresh:
            # "로그인 상태 유지" 선택 시 30일 → 90일로 연장
            refresh.set_exp(lifetime=timedelta(days=90))
        
        access = refresh.access_token
        access['user_id'] = user.id
        access['username'] = user.username
        access['email'] = user.email
        
        return {
            'access_token': str(access),
            'refresh_token': str(refresh),
            'access_expires_at': datetime.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
            'refresh_expires_at': datetime.now() + (
                timedelta(days=90) if extend_refresh 
                else settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
            ),
        }
    
    @staticmethod
    def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Access Token 검증 및 사용자 정보 추출
        
        Args:
            token: JWT Access Token 문자열
            
        Returns:
            Dict: 토큰이 유효한 경우 사용자 정보, 무효한 경우 None
        """
        try:
            access_token = AccessToken(token)
            
            # 블랙리스트 확인
            if JWTAuthService.is_token_blacklisted(token):
                return None
            
            # 사용자 정보 반환
            return {
                'user_id': access_token['user_id'],
                'username': access_token.get('username'),
                'email': access_token.get('email'),
                'exp': access_token['exp'],
                'iat': access_token['iat'],
            }
            
        except (TokenError, InvalidToken, KeyError):
            return None
    
    @staticmethod
    def verify_refresh_token(token: str) -> Optional[RefreshToken]:
        """
        Refresh Token 검증
        
        Args:
            token: JWT Refresh Token 문자열
            
        Returns:
            RefreshToken: 유효한 경우 RefreshToken 객체, 무효한 경우 None
        """
        try:
            refresh_token = RefreshToken(token)
            
            # 블랙리스트 확인  
            if JWTAuthService.is_token_blacklisted(token):
                return None
                
            return refresh_token
            
        except (TokenError, InvalidToken):
            return None
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Refresh Token을 사용하여 새로운 Access Token 생성
        
        Args:
            refresh_token: JWT Refresh Token 문자열
            
        Returns:
            Dict: 새로운 access_token 정보, 실패 시 None
        """
        try:
            refresh = RefreshToken(refresh_token)
            
            # 블랙리스트 확인
            if JWTAuthService.is_token_blacklisted(refresh_token):
                return None
            
            # 새로운 Access Token 생성
            new_access = refresh.access_token
            
            # 사용자 정보 조회 및 토큰에 추가
            try:
                user = User.objects.get(id=refresh['user_id'])
                new_access['user_id'] = user.id
                new_access['username'] = user.username
                new_access['email'] = user.email
            except User.DoesNotExist:
                return None
            
            return {
                'access_token': str(new_access),
                'access_expires_at': datetime.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
            }
            
        except (TokenError, InvalidToken):
            return None
    
    @staticmethod
    def blacklist_token(token: str) -> bool:
        """
        토큰을 블랙리스트에 추가
        
        Args:
            token: 블랙리스트에 추가할 토큰
            
        Returns:
            bool: 성공 여부
        """
        try:
            # RefreshToken인 경우 django-rest-framework-simplejwt의 블랙리스트 사용
            refresh_token = RefreshToken(token)
            refresh_token.blacklist()
            
            # 추가로 캐시에도 저장 (빠른 조회를 위해) - 토큰 해시 사용
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            cache_key = f"bl_token:{token_hash}"
            cache.set(cache_key, True, timeout=60*60*24*30)  # 30일
            
            return True
            
        except (TokenError, InvalidToken):
            # AccessToken인 경우 캐시만 사용
            try:
                access_token = AccessToken(token)
                import hashlib
                token_hash = hashlib.sha256(token.encode()).hexdigest()
                cache_key = f"bl_token:{token_hash}"
                # Access Token 만료시간까지만 캐시
                timeout = int(access_token['exp'] - datetime.now().timestamp())
                cache.set(cache_key, True, timeout=max(timeout, 0))
                return True
            except (TokenError, InvalidToken):
                return False
    
    @staticmethod
    def is_token_blacklisted(token: str) -> bool:
        """
        토큰이 블랙리스트에 있는지 확인
        
        Args:
            token: 확인할 토큰
            
        Returns:
            bool: 블랙리스트에 있으면 True
        """
        # 캐시에서 빠른 조회 - 토큰 해시 사용
        import hashlib
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cache_key = f"bl_token:{token_hash}"
        if cache.get(cache_key):
            return True
        
        # RefreshToken인 경우 DB에서도 확인
        try:
            refresh_token = RefreshToken(token)
            # Outstanding Token이 blacklist에 있는지 확인
            try:
                outstanding_token = OutstandingToken.objects.get(token=token)
                return BlacklistedToken.objects.filter(token=outstanding_token).exists()
            except OutstandingToken.DoesNotExist:
                return False
        except (TokenError, InvalidToken):
            pass
        
        return False
    
    @staticmethod
    def get_user_from_token(token: str) -> Optional[User]:
        """
        토큰에서 사용자 객체 추출
        
        Args:
            token: JWT 토큰
            
        Returns:
            User: 사용자 객체, 실패 시 None
        """
        token_data = JWTAuthService.verify_access_token(token)
        if not token_data:
            return None
        
        try:
            return User.objects.get(id=token_data['user_id'])
        except User.DoesNotExist:
            return None
    
    @staticmethod
    def revoke_all_tokens_for_user(user) -> int:
        """
        사용자의 모든 토큰을 무효화 (로그아웃 전체 기기)
        
        Args:
            user: Django User 인스턴스
            
        Returns:
            int: 무효화된 토큰 수
        """
        # 해당 사용자의 모든 Outstanding Token 조회 및 블랙리스트 추가
        outstanding_tokens = OutstandingToken.objects.filter(user=user)
        blacklisted_count = 0
        
        for outstanding_token in outstanding_tokens:
            if not BlacklistedToken.objects.filter(token=outstanding_token).exists():
                BlacklistedToken.objects.create(token=outstanding_token)
                blacklisted_count += 1
        
        return blacklisted_count
    
    @staticmethod
    def clean_expired_blacklist_cache():
        """
        만료된 블랙리스트 캐시 정리 (배치 작업용)
        """
        # Django 캐시는 자동으로 만료되므로 별도 정리 불필요
        # 필요시 custom 구현
        pass


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
            # 재설정 링크 생성
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            
            # 이메일 내용 생성
            subject = "[FoodCalorie] 비밀번호 재설정 요청"
            
            html_message = f"""
            <html>
            <body>
                <h2>비밀번호 재설정</h2>
                <p>안녕하세요, {user.profile.nickname if hasattr(user, 'profile') else user.username}님!</p>
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
            
            안녕하세요, {user.profile.nickname if hasattr(user, 'profile') else user.username}님!
            
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


class TokenBlacklistService:
    """
    토큰 블랙리스트 관리를 위한 별도 서비스
    """
    
    @staticmethod
    def add_to_blacklist(token: str, token_type: str = 'refresh') -> bool:
        """
        토큰을 블랙리스트에 추가
        """
        return JWTAuthService.blacklist_token(token)
    
    @staticmethod
    def is_blacklisted(token: str) -> bool:
        """
        토큰이 블랙리스트에 있는지 확인
        """
        return JWTAuthService.is_token_blacklisted(token)
    
    @staticmethod
    def cleanup_expired_tokens():
        """
        만료된 토큰들을 정리하는 배치 작업
        """
        # Outstanding Token 중 만료된 것들 정리
        from django.utils import timezone
        
        expired_tokens = OutstandingToken.objects.filter(
            expires_at__lt=timezone.now()
        )
        
        count = expired_tokens.count()
        expired_tokens.delete()
        
        return count


class LoginAttemptService:
    """
    로그인 시도 기록 및 관리 서비스
    """
    
    @staticmethod
    def record_attempt(request, email, user=None, success=False):
        """
        로그인 시도 기록
        
        Args:
            request: Django request 객체
            email: 시도한 이메일
            user: 사용자 객체 (성공 시)
            success: 로그인 성공 여부
        """
        from .models import LoginAttempt
        
        # IP 주소 추출
        ip_address = LoginAttemptService.get_client_ip(request)
        
        # User Agent 추출
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # 길이 제한
        
        # 로그인 시도 기록 생성
        LoginAttempt.objects.create(
            username=email,
            ip_address=ip_address,
            user_agent=user_agent,
            is_successful=success
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


class PasswordResetService:
    """
    비밀번호 재설정 서비스
    """
    
    @staticmethod
    def create_reset_token(user):
        """
        비밀번호 재설정 토큰 생성
        
        Args:
            user: 사용자 객체
            
        Returns:
            PasswordResetToken: 생성된 토큰 객체
        """
        from .models import PasswordResetToken
        import uuid
        from datetime import timedelta
        from django.utils import timezone
        
        # 기존 토큰들 무효화
        PasswordResetToken.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)
        
        # 새 토큰 생성
        token = PasswordResetToken.objects.create(
            user=user,
            token=str(uuid.uuid4()),
            expires_at=timezone.now() + timedelta(hours=24)  # 24시간 유효
        )
        
        return token
    
    @staticmethod
    def send_reset_email(user, reset_token):
        """
        비밀번호 재설정 이메일 발송
        
        Args:
            user: 사용자 객체
            reset_token: 재설정 토큰 객체
        """
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings
        
        # 이메일 템플릿 렌더링
        subject = '[FoodCalorie] 비밀번호 재설정 요청'
        
        # 재설정 링크 생성 (프론트엔드 URL)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
        
        message = f"""
안녕하세요, {user.userprofile.nickname}님

비밀번호 재설정을 요청하셨습니다.
아래 링크를 클릭하여 새 비밀번호를 설정해주세요.

재설정 링크: {reset_url}

이 링크는 24시간 동안 유효합니다.
만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시해주세요.

감사합니다.
FoodCalorie 팀
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"이메일 발송 실패: {e}")
            return False