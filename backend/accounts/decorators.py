"""
관리자 권한 검증 데코레이터
Django REST Framework와 함수 기반 뷰 모두 지원
"""

from functools import wraps
from django.http import JsonResponse
from django.contrib.auth.decorators import user_passes_test
from rest_framework.decorators import permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class IsAdminUser(BasePermission):
    """
    DRF용 관리자 권한 검증 클래스
    
    사용법:
    @permission_classes([IsAdminUser])
    class AdminView(APIView):
        pass
    """
    
    def has_permission(self, request, view):
        """
        관리자 권한 검증
        
        Args:
            request: DRF 요청 객체
            view: 뷰 클래스
            
        Returns:
            bool: 권한 여부
        """
        # 인증된 사용자인지 확인
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"관리자 접근 시도 - 미인증 사용자: {request.META.get('REMOTE_ADDR')}")
            return False
        
        # 관리자 권한 확인
        if not request.user.is_staff:
            logger.warning(f"관리자 접근 시도 - 권한 없음: {request.user.email}")
            return False
        
        # 활성 계정 확인
        if not request.user.is_active:
            logger.warning(f"관리자 접근 시도 - 비활성 계정: {request.user.email}")
            return False
        
        logger.info(f"관리자 접근 승인: {request.user.email}")
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        객체별 권한 검증 (필요시 오버라이드)
        """
        return self.has_permission(request, view)


class IsSuperUser(BasePermission):
    """
    DRF용 슈퍼유저 권한 검증 클래스
    """
    
    def has_permission(self, request, view):
        """슈퍼유저 권한 검증"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not request.user.is_superuser:
            logger.warning(f"슈퍼유저 접근 시도 - 권한 없음: {request.user.email}")
            return False
        
        if not request.user.is_active:
            return False
        
        logger.info(f"슈퍼유저 접근 승인: {request.user.email}")
        return True


def admin_required(function=None, redirect_url=None):
    """
    함수 기반 뷰용 관리자 권한 데코레이터
    
    사용법:
    @admin_required
    def admin_view(request):
        pass
    
    Args:
        function: 데코레이트할 함수
        redirect_url: 권한 없을 때 리다이렉트할 URL (선택)
    """
    
    def check_admin(user):
        """관리자 권한 체크 함수"""
        return user.is_authenticated and user.is_staff and user.is_active
    
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not check_admin(request.user):
                # API 요청인 경우 JSON 응답
                if request.path.startswith('/api/'):
                    return JsonResponse({
                        'success': False,
                        'message': '관리자 권한이 필요합니다.',
                        'error_code': 'ADMIN_REQUIRED'
                    }, status=403)
                
                # 일반 웹 요청인 경우
                if redirect_url:
                    from django.shortcuts import redirect
                    return redirect(redirect_url)
                else:
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden('관리자 권한이 필요합니다.')
            
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    
    if function is None:
        return decorator
    else:
        return decorator(function)


def superuser_required(function=None):
    """
    함수 기반 뷰용 슈퍼유저 권한 데코레이터
    
    사용법:
    @superuser_required
    def superuser_view(request):
        pass
    """
    
    def check_superuser(user):
        """슈퍼유저 권한 체크 함수"""
        return user.is_authenticated and user.is_superuser and user.is_active
    
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not check_superuser(request.user):
                # API 요청인 경우 JSON 응답
                if request.path.startswith('/api/'):
                    return JsonResponse({
                        'success': False,
                        'message': '슈퍼유저 권한이 필요합니다.',
                        'error_code': 'SUPERUSER_REQUIRED'
                    }, status=403)
                else:
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden('슈퍼유저 권한이 필요합니다.')
            
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    
    if function is None:
        return decorator
    else:
        return decorator(function)


class AdminPermissionMixin:
    """
    클래스 기반 뷰용 관리자 권한 믹스인
    
    사용법:
    class AdminView(AdminPermissionMixin, APIView):
        pass
    """
    
    def dispatch(self, request, *args, **kwargs):
        """요청 처리 전 권한 확인"""
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'message': '인증이 필요합니다.',
                'error_code': 'AUTHENTICATION_REQUIRED'
            }, status=401)
        
        if not request.user.is_staff:
            return JsonResponse({
                'success': False,
                'message': '관리자 권한이 필요합니다.',
                'error_code': 'ADMIN_REQUIRED'
            }, status=403)
        
        return super().dispatch(request, *args, **kwargs)


def rate_limit_admin(max_requests=100, window_minutes=60):
    """
    관리자 API 요청 제한 데코레이터
    
    Args:
        max_requests: 최대 요청 수
        window_minutes: 시간 창 (분)
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # 여기서는 간단한 구현만 제공
            # 실제 프로덕션에서는 Redis 등을 사용한 rate limiting 구현 필요
            
            # 관리자는 일반적으로 rate limit을 덜 엄격하게 적용
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    
    return decorator 