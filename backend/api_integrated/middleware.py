"""
API 통합 미들웨어
"""
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class APIErrorHandlingMiddleware:
    """API 에러 처리 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        return response
    
    def process_exception(self, request, exception):
        """예외 처리"""
        if request.path.startswith('/api/'):
            logger.error(f"API 에러: {request.path} - {str(exception)}")
            
            if settings.DEBUG:
                return JsonResponse({
                    'success': False,
                    'error': str(exception),
                    'type': type(exception).__name__
                }, status=500)
            else:
                return JsonResponse({
                    'success': False,
                    'error': '서버 내부 오류가 발생했습니다.'
                }, status=500)
        
        return None

class RequestLoggingMiddleware:
    """요청 로깅 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # 요청 로깅
        if request.path.startswith('/api/') and settings.DEBUG:
            logger.info(f"API 요청: {request.method} {request.path}")
            if request.method in ['POST', 'PUT', 'PATCH']:
                logger.info(f"요청 데이터: {request.POST}")
        
        response = self.get_response(request)
        
        # 응답 로깅
        if request.path.startswith('/api/') and settings.DEBUG:
            logger.info(f"API 응답: {response.status_code}")
        
        return response