from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ChallengeRoom, UserChallenge
from .serializers import ChallengeRoomSerializer
import logging

logger = logging.getLogger('challenges')


class ChallengeRoomViewSet(viewsets.ReadOnlyModelViewSet):
    """챌린지 방 ViewSet (읽기 전용)"""
    serializer_class = ChallengeRoomSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ChallengeRoom.objects.filter(is_active=True)


class JoinChallengeView(APIView):
    """챌린지 참여 API"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Challenge join API - To be implemented'})


class MyChallengeView(APIView):
    """내 챌린지 현황 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'My challenge API - To be implemented'})


class ExtendChallengeView(APIView):
    """챌린지 기간 연장 API"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Extend challenge API - To be implemented'})


class LeaveChallengeView(APIView):
    """챌린지 탈퇴 API"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Leave challenge API - To be implemented'})


class RequestCheatDayView(APIView):
    """치팅 요청 API"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Request cheat day API - To be implemented'})


class CheatStatusView(APIView):
    """치팅 현황 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Cheat status API - To be implemented'})


class LeaderboardView(APIView):
    """리더보드 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, room_id):
        # TODO: 다음 태스크에서 구현
        return Response({'message': f'Leaderboard API for room {room_id} - To be implemented'})


class PersonalStatsView(APIView):
    """개인 통계 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Personal stats API - To be implemented'})


class ChallengeReportView(APIView):
    """챌린지 리포트 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Challenge report API - To be implemented'})


class DailyChallengeJudgmentView(APIView):
    """일일 챌린지 판정 API (내부 호출용)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Daily judgment API - To be implemented'})


class WeeklyResetView(APIView):
    """주간 초기화 API (스케줄러용)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # TODO: 다음 태스크에서 구현
        return Response({'message': 'Weekly reset API - To be implemented'})
