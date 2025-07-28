"""
커스텀 권한 클래스
"""

from rest_framework import permissions
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from django.utils import timezone


class IsAuthenticatedWithProperError(permissions.BasePermission):
    """
    인증이 필요한 권한 클래스
    인증되지 않은 경우 401 Unauthorized 반환 (403 대신)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            # 401 Unauthorized 예외 발생
            raise NotAuthenticated({
                'success': False,
                'message': '인증이 필요합니다. 다시 로그인해주세요.',
                'error_code': 'AUTHENTICATION_REQUIRED',
                'redirect_url': '/login',
                'session_info': {
                    'authenticated': False,
                    'session_expired': True,
                    'should_redirect': True,
                    'failed_at': timezone.now().isoformat()
                }
            })
        
        return True


class IsAdminUserWithProperError(permissions.BasePermission):
    """
    관리자 권한이 필요한 권한 클래스
    적절한 에러 메시지와 함께 403 Forbidden 반환
    """
    
    def has_permission(self, request, view):
        # 먼저 인증 확인
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated({
                'success': False,
                'message': '인증이 필요합니다. 다시 로그인해주세요.',
                'error_code': 'AUTHENTICATION_REQUIRED',
                'redirect_url': '/login',
                'session_info': {
                    'authenticated': False,
                    'session_expired': True,
                    'should_redirect': True,
                    'failed_at': timezone.now().isoformat()
                }
            })
        
        # 관리자 권한 확인
        if not request.user.is_staff:
            raise PermissionDenied({
                'success': False,
                'message': '관리자 권한이 필요합니다.',
                'error_code': 'ADMIN_PERMISSION_REQUIRED',
                'required_permission': 'admin',
                'suggestion': '관리자에게 문의하거나 필요한 권한을 확인해주세요.',
                'user_info': {
                    'user_id': request.user.id,
                    'is_staff': request.user.is_staff,
                    'is_superuser': request.user.is_superuser
                }
            })
        
        return True


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    객체의 소유자만 수정 가능, 다른 사용자는 읽기만 가능
    """
    
    def has_permission(self, request, view):
        # 인증된 사용자만 접근 가능
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated({
                'success': False,
                'message': '인증이 필요합니다. 다시 로그인해주세요.',
                'error_code': 'AUTHENTICATION_REQUIRED',
                'redirect_url': '/login',
                'session_info': {
                    'authenticated': False,
                    'session_expired': True,
                    'should_redirect': True,
                    'failed_at': timezone.now().isoformat()
                }
            })
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # 읽기 권한은 모든 인증된 사용자에게 허용
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 쓰기 권한은 객체의 소유자에게만 허용
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # 소유자 필드가 없는 경우 권한 거부
        raise PermissionDenied({
            'success': False,
            'message': '이 객체를 수정할 권한이 없습니다.',
            'error_code': 'OBJECT_PERMISSION_DENIED',
            'suggestion': '본인이 생성한 객체만 수정할 수 있습니다.'
        })


class IsOwnerOnly(permissions.BasePermission):
    """
    객체의 소유자만 접근 가능
    """
    
    def has_permission(self, request, view):
        # 인증된 사용자만 접근 가능
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated({
                'success': False,
                'message': '인증이 필요합니다. 다시 로그인해주세요.',
                'error_code': 'AUTHENTICATION_REQUIRED',
                'redirect_url': '/login',
                'session_info': {
                    'authenticated': False,
                    'session_expired': True,
                    'should_redirect': True,
                    'failed_at': timezone.now().isoformat()
                }
            })
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # 객체의 소유자만 접근 가능
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # 소유자 필드가 없는 경우 권한 거부
        raise PermissionDenied({
            'success': False,
            'message': '이 객체에 접근할 권한이 없습니다.',
            'error_code': 'OBJECT_ACCESS_DENIED',
            'suggestion': '본인이 생성한 객체만 접근할 수 있습니다.'
        })