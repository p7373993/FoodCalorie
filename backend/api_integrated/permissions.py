"""
API 권한 관리 모듈
"""
from rest_framework import permissions
from django.conf import settings

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    객체의 소유자만 수정/삭제 가능, 읽기는 모든 인증된 사용자 가능
    """
    
    def has_object_permission(self, request, view, obj):
        # 읽기 권한은 모든 인증된 사용자에게 허용
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 쓰기 권한은 객체의 소유자에게만 허용
        return obj.user == request.user

class IsOwner(permissions.BasePermission):
    """
    객체의 소유자만 접근 가능
    """
    
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

class IsDebugMode(permissions.BasePermission):
    """
    디버그 모드에서만 접근 가능 (테스트 API용)
    """
    
    def has_permission(self, request, view):
        return settings.DEBUG

class IsAuthenticatedOrDebug(permissions.BasePermission):
    """
    인증된 사용자이거나 디버그 모드에서 접근 가능
    """
    
    def has_permission(self, request, view):
        if settings.DEBUG:
            return True
        return request.user and request.user.is_authenticated