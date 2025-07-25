"""
JWT 인증 미들웨어
Django REST Framework와 호환되는 JWT 인증 처리
"""

import json
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from django.conf import settings
from accounts.services import JWTAuthService
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from django.core.exceptions import ImproperlyConfigured
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    JWT 인증 미들웨어
    - Authorization 헤더에서 JWT 토큰 추출 및 검증
    - 토큰 만료 시 자동 갱신 처리
    - 인증 실패 시 401 Unauthorized 응답
    - DRF Request 객체 래핑 지원
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # DRF 설정 확인
        try:
            from rest_framework.settings import api_settings
            self.drf_available = True
        except ImportError:
            self.drf_available = False
            logger.warning("Django REST Framework를 찾을 수 없습니다.")
    
    def process_request(self, request):
        """
        요청 처리 전에 JWT 토큰 검증 및 사용자 인증
        """
        # API 경로만 처리 (정적 파일 등 제외)
        if not self._should_authenticate(request):
            return None
        
        # Authorization 헤더에서 토큰 추출
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            # 토큰이 없는 경우 (익명 사용자)
            request.user = None
            request.auth = None
            return None
        
        try:
            # 토큰 추출 및 검증
            token = auth_header.split(' ')[1]
            user = self._authenticate_token(token)
            
            if user:
                # 인증 성공
                request.user = user
                request.auth = token
                
                # DRF Request 객체로 래핑 (필요한 경우)
                if self.drf_available and request.path.startswith('/api/'):
                    request = self._wrap_drf_request(request)
                
                logger.debug(f"사용자 인증 성공: {user.email}")
            else:
                # 토큰은 있지만 유효하지 않음
                return self._create_401_response("유효하지 않은 토큰입니다.")
                
        except Exception as e:
            logger.error(f"JWT 인증 오류: {e}")
            return self._create_401_response("토큰 인증 처리 중 오류가 발생했습니다.")
        
        return None
    
    def _should_authenticate(self, request):
        """
        인증이 필요한 요청인지 확인
        """
        # 정적 파일, 관리자 패널 등은 제외
        excluded_paths = [
            '/static/',
            '/media/',
            '/admin/',
            '/favicon.ico',
        ]
        
        for path in excluded_paths:
            if request.path.startswith(path):
                return False
        
        # API 경로는 인증 처리
        if request.path.startswith('/api/'):
            return True
        
        # 기타 경로는 선택적 인증
        return False
    
    def _authenticate_token(self, token):
        """
        JWT 토큰으로 사용자 인증
        """
        try:
            # 토큰 검증
            payload = JWTAuthService.verify_access_token(token)
            
            if not payload:
                logger.warning("토큰 검증 실패")
                return None
            
            # 사용자 조회
            user_id = payload.get('user_id')
            if not user_id:
                logger.warning("토큰에 user_id가 없음")
                return None
            
            try:
                user = User.objects.get(id=user_id, is_active=True)
                return user
            except User.DoesNotExist:
                logger.warning(f"사용자를 찾을 수 없음: {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"토큰 인증 오류: {e}")
            return None
    
    def _wrap_drf_request(self, request):
        """
        Django 요청을 DRF 요청으로 래핑
        """
        try:
            # DRF Request로 래핑하여 request.data 속성 추가
            from rest_framework.request import Request as DRFRequest
            from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
            
            # 기본 파서들 설정
            parsers = [JSONParser(), FormParser(), MultiPartParser()]
            
            # DRF Request 객체 생성
            drf_request = DRFRequest(request, parsers=parsers)
            
            # 인증 정보 유지
            drf_request.user = request.user
            drf_request.auth = request.auth
            
            return drf_request
            
        except Exception as e:
            logger.error(f"DRF 요청 래핑 실패: {e}")
            return request
    
    def _create_401_response(self, message):
        """
        401 Unauthorized 응답 생성
        """
        response_data = {
            'success': False,
            'message': message,
            'error_code': 'AUTHENTICATION_FAILED',
            'detail': '인증이 필요하거나 제공된 인증 정보가 유효하지 않습니다.'
        }
        
        return JsonResponse(
            response_data,
            status=401,
            content_type='application/json'
        )
    
    def process_exception(self, request, exception):
        """
        예외 처리
        """
        # JWT 관련 예외만 처리
        if 'jwt' in str(exception).lower() or 'token' in str(exception).lower():
            logger.error(f"JWT 미들웨어 예외: {exception}")
            return self._create_401_response("인증 처리 중 오류가 발생했습니다.")
        
        return None


class DRFRequestMiddleware(MiddlewareMixin):
    """
    DRF Request 래핑 전용 미들웨어
    API 엔드포인트에서 request.data 속성을 사용할 수 있도록 지원
    """
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        뷰 실행 전에 DRF Request로 래핑
        """
        # API 경로만 처리
        if not request.path.startswith('/api/'):
            return None
        
        # 이미 DRF Request인 경우 건너뛰기
        if hasattr(request, 'data'):
            return None
        
        try:
            from rest_framework.request import Request as DRFRequest
            from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
            
            # 파서 설정
            parsers = [JSONParser(), FormParser(), MultiPartParser()]
            
            # DRF Request 생성
            drf_request = DRFRequest(request, parsers=parsers)
            
            # 기존 속성 유지
            if hasattr(request, 'user'):
                drf_request.user = request.user
            if hasattr(request, 'auth'):
                drf_request.auth = request.auth
            
            # request 객체 교체
            view_kwargs['request'] = drf_request
            
            logger.debug(f"DRF Request 래핑 완료: {request.path}")
            
        except Exception as e:
            logger.error(f"DRF Request 래핑 실패: {e}")
        
        return None 