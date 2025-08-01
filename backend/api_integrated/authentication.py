from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """CSRF 검증을 하지 않는 세션 인증"""
    
    def enforce_csrf(self, request):
        return  # CSRF 검증을 건너뜀