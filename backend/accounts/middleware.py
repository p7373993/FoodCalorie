"""
인증 및 CSRF 관련 미들웨어
"""

import json
import logging
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class EnhancedCSRFMiddleware(CsrfViewMiddleware):
    """
    향상된 CSRF 미들웨어
    CSRF 실패 시 더 나은 에러 응답 제공
    """
    
    def _reject(self, request, reason):
        """CSRF 검증 실패 시 호출되는 메서드 오버라이드"""
        logger.warning(f"CSRF 검증 실패: {reason}, IP: {self._get_client_ip(request)}")
        
        # API 요청인 경우 JSON 응답 반환
        if request.path.startswith('/api/') or request.content_type == 'application/json':
            error_response = {
                'success': False,
                'message': 'CSRF 토큰이 유효하지 않습니다. 페이지를 새로고침해주세요.',
                'error_code': 'CSRF_FAILED',
                'reason': reason,
                'suggestion': '페이지를 새로고침하거나 다시 로그인해주세요.',
                'csrf_info': {
                    'token_required': True,
                    'should_refresh': True,
                    'failed_at': timezone.now().isoformat()
                }
            }
            
            return JsonResponse(error_response, status=403)
        
        # 일반 웹 요청은 기본 처리
        return super()._reject(request, reason)
    
    def _get_client_ip(self, request):
        """클라이언트 IP 주소 추출"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SessionExpiryMiddleware(MiddlewareMixin):
    """
    세션 만료 처리 미들웨어
    세션이 만료된 API 요청에 대해 적절한 응답 제공
    """
    
    def process_request(self, request):
        """요청 처리 전 세션 상태 확인"""
        # API 요청이고 인증이 필요한 경우에만 처리
        if not request.path.startswith('/api/'):
            return None
            
        # 인증이 필요하지 않은 엔드포인트는 제외
        public_endpoints = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/csrf-token/',
            '/api/auth/password/reset/',
        ]
        
        if any(request.path.startswith(endpoint) for endpoint in public_endpoints):
            return None
        
        # 세션이 있지만 만료된 경우 확인
        if hasattr(request, 'session') and request.session.session_key:
            if request.session.get_expiry_age() <= 0:
                logger.info(f"만료된 세션 감지: {request.session.session_key}")
                
                # 세션 정리
                request.session.flush()
                
                # JSON 응답 반환
                error_response = {
                    'success': False,
                    'message': '세션이 만료되었습니다. 다시 로그인해주세요.',
                    'error_code': 'SESSION_EXPIRED',
                    'redirect_url': '/login',
                    'session_info': {
                        'expired': True,
                        'expired_at': timezone.now().isoformat(),
                        'should_redirect': True
                    }
                }
                
                return JsonResponse(error_response, status=401)
        
        return None


class AuthenticationErrorMiddleware(MiddlewareMixin):
    """
    인증 에러 처리 미들웨어
    401/403 응답에 추가 정보 제공
    """
    
    def process_response(self, request, response):
        """응답 처리 시 인증 에러 정보 보강"""
        # API 요청이 아니면 처리하지 않음
        if not request.path.startswith('/api/'):
            return response
        
        # 401 Unauthorized 응답 처리
        if response.status_code == 401:
            try:
                # 기존 응답 데이터 파싱
                if hasattr(response, 'content') and response.content:
                    try:
                        data = json.loads(response.content.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        data = {}
                else:
                    data = {}
                
                # 추가 정보 보강
                if not data.get('error_code'):
                    data['error_code'] = 'AUTHENTICATION_REQUIRED'
                
                if not data.get('redirect_url'):
                    data['redirect_url'] = '/login'
                
                if not data.get('message'):
                    data['message'] = '인증이 필요합니다. 다시 로그인해주세요.'
                
                # 세션 정보 추가
                data['session_info'] = {
                    'authenticated': False,
                    'session_expired': True,
                    'should_redirect': True,
                    'failed_at': timezone.now().isoformat()
                }
                
                # 새로운 응답 생성
                response = JsonResponse(data, status=401)
                
            except Exception as e:
                logger.error(f"401 응답 처리 중 오류: {e}")
        
        # 403 Forbidden 응답 처리
        elif response.status_code == 403:
            try:
                # 기존 응답 데이터 파싱
                if hasattr(response, 'content') and response.content:
                    try:
                        data = json.loads(response.content.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        data = {}
                else:
                    data = {}
                
                # CSRF 에러인지 확인
                if 'csrf' in str(response.content).lower() or data.get('error_code') == 'CSRF_FAILED':
                    data['error_code'] = 'CSRF_FAILED'
                    data['suggestion'] = '페이지를 새로고침하고 다시 시도해주세요.'
                    data['csrf_info'] = {
                        'token_required': True,
                        'should_refresh': True,
                        'failed_at': timezone.now().isoformat()
                    }
                
                # 권한 부족 에러 처리
                elif not data.get('error_code'):
                    data['error_code'] = 'PERMISSION_DENIED'
                    data['message'] = data.get('message', '권한이 부족합니다.')
                
                # 새로운 응답 생성
                response = JsonResponse(data, status=403)
                
            except Exception as e:
                logger.error(f"403 응답 처리 중 오류: {e}")
        
        return response