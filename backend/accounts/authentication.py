"""
Django REST Framework 호환 JWT 인증 클래스
"""

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from accounts.services import JWTAuthService
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class JWTAuthentication(BaseAuthentication):
    """
    Django REST Framework 호환 JWT 인증 클래스
    
    사용법:
    - Authorization: Bearer <access_token>
    - 토큰 검증 및 사용자 인증
    - 자동 토큰 갱신 지원
    """
    
    keyword = 'Bearer'
    
    def authenticate(self, request):
        """
        JWT 토큰으로 사용자 인증
        
        Returns:
            tuple: (user, token) 또는 None
        """
        auth_header = self.get_authorization_header(request)
        
        if not auth_header:
            # Authorization 헤더가 없음 (익명 사용자)
            return None
        
        try:
            # Authorization 헤더 파싱
            auth_parts = auth_header.split()
            
            if len(auth_parts) != 2:
                return None
            
            if auth_parts[0].lower() != self.keyword.lower().encode():
                return None
            
            token = auth_parts[1].decode('utf-8')
            
            # 토큰 검증 및 사용자 인증
            return self.authenticate_credentials(token)
            
        except Exception as e:
            logger.error(f"JWT 인증 오류: {e}")
            raise AuthenticationFailed('유효하지 않은 토큰 형식입니다.')
    
    def authenticate_credentials(self, token):
        """
        JWT 토큰으로 사용자 자격 증명 확인
        
        Args:
            token (str): JWT 액세스 토큰
            
        Returns:
            tuple: (user, token)
            
        Raises:
            AuthenticationFailed: 인증 실패 시
        """
        try:
            # JWT 토큰 검증
            payload = JWTAuthService.verify_access_token(token)
            
            if not payload:
                raise AuthenticationFailed('토큰이 유효하지 않거나 만료되었습니다.')
            
            # 사용자 ID 추출
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('토큰에 사용자 정보가 없습니다.')
            
            # 사용자 조회
            try:
                user = User.objects.get(id=user_id, is_active=True)
            except User.DoesNotExist:
                raise AuthenticationFailed('사용자를 찾을 수 없거나 비활성화되었습니다.')
            
            logger.debug(f"JWT 인증 성공: {user.email}")
            return (user, token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"JWT 자격 증명 검증 오류: {e}")
            raise AuthenticationFailed('토큰 검증 중 오류가 발생했습니다.')
    
    def get_authorization_header(self, request):
        """
        Authorization 헤더 추출
        
        Args:
            request: Django/DRF 요청 객체
            
        Returns:
            bytes: Authorization 헤더 값
        """
        auth = request.META.get('HTTP_AUTHORIZATION', b'')
        
        if isinstance(auth, str):
            auth = auth.encode('iso-8859-1')
        
        return auth
    
    def authenticate_header(self, request):
        """
        401 응답에 포함될 WWW-Authenticate 헤더 값
        
        Returns:
            str: WWW-Authenticate 헤더 값
        """
        return f'{self.keyword} realm="api"'


class JWTCookieAuthentication(JWTAuthentication):
    """
    쿠키 기반 JWT 인증 클래스
    
    쿠키에서 JWT 토큰을 추출하여 인증
    CSRF 공격 방지를 위해 SameSite, Secure 옵션 필요
    """
    
    cookie_name = 'access_token'
    
    def authenticate(self, request):
        """
        쿠키에서 JWT 토큰으로 사용자 인증
        """
        # 쿠키에서 토큰 추출
        token = request.COOKIES.get(self.cookie_name)
        
        if not token:
            # 쿠키에 토큰이 없음
            return None
        
        try:
            # 토큰 검증 및 사용자 인증
            return self.authenticate_credentials(token)
            
        except Exception as e:
            logger.error(f"JWT 쿠키 인증 오류: {e}")
            raise AuthenticationFailed('쿠키 토큰이 유효하지 않습니다.')


class OptionalJWTAuthentication(JWTAuthentication):
    """
    선택적 JWT 인증 클래스
    
    토큰이 없어도 오류를 발생시키지 않음
    익명 사용자도 허용하면서 토큰이 있으면 인증 처리
    """
    
    def authenticate(self, request):
        """
        선택적 JWT 토큰 인증
        토큰이 없으면 None 반환 (오류 없음)
        """
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            # 인증 실패해도 예외를 발생시키지 않고 None 반환
            return None
    
    def authenticate_header(self, request):
        """
        선택적 인증이므로 WWW-Authenticate 헤더 없음
        """
        return None 