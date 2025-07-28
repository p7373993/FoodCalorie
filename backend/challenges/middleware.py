import json

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class ChallengeAuthMiddleware(MiddlewareMixin):
    """챌린지 관련 API에서 인증을 비활성화하는 미들웨어"""

    def process_request(self, request):
        # 챌린지 관련 API 경로들
        challenge_paths = [
            "/api/challenges/rooms/",
            "/api/challenges/join/",
            "/api/challenges/leave/",
            "/api/challenges/my/",
            "/api/challenges/leaderboard/",
        ]

        # 챌린지 관련 API인지 확인
        if any(path in request.path for path in challenge_paths):
            # 인증 헤더를 제거하여 인증 없이 접근 가능하도록 함
            if "HTTP_AUTHORIZATION" in request.META:
                del request.META["HTTP_AUTHORIZATION"]

            # 요청을 인증된 것으로 표시 (테스트용)
            request.user = None
            request.auth = None

        return None
