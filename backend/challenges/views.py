from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from .models import ChallengeRoom, UserChallenge
from .serializers import (
    ChallengeRoomSerializer, ChallengeJoinSerializer, 
    UserChallengeSerializer
)
from .services import ChallengeJudgmentService
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
        serializer = ChallengeJoinSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'VALIDATION_ERROR',
                'message': '입력 데이터가 올바르지 않습니다.',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # 챌린지 방 조회
                room = get_object_or_404(ChallengeRoom, 
                                       id=serializer.validated_data['room_id'],
                                       is_active=True)
                
                # 이미 해당 방에 참여 중인지 확인
                existing_challenge = UserChallenge.objects.filter(
                    user=request.user,
                    room=room,
                    status='active'
                ).first()
                
                if existing_challenge:
                    return Response({
                        'success': False,
                        'error': 'ALREADY_JOINED',
                        'message': '이미 해당 챌린지에 참여 중입니다.',
                        'details': {
                            'current_room': room.name,
                            'joined_at': existing_challenge.challenge_start_date
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 새 챌린지 참여 생성
                user_challenge = UserChallenge.objects.create(
                    user=request.user,
                    room=room,
                    user_height=serializer.validated_data['user_height'],
                    user_weight=serializer.validated_data['user_weight'],
                    user_target_weight=serializer.validated_data['user_target_weight'],
                    user_challenge_duration_days=serializer.validated_data['user_challenge_duration_days'],
                    user_weekly_cheat_limit=serializer.validated_data['user_weekly_cheat_limit'],
                    remaining_duration_days=serializer.validated_data['user_challenge_duration_days'],
                    status='active'
                )
                
                logger.info(f"User {request.user.id} joined challenge room {room.name}")
                
                # 응답 데이터
                response_data = UserChallengeSerializer(user_challenge).data
                
                return Response({
                    'success': True,
                    'message': '챌린지 참여가 완료되었습니다.',
                    'data': response_data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error joining challenge: {str(e)}")
            return Response({
                'success': False,
                'error': 'SERVER_ERROR',
                'message': '챌린지 참여 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyChallengeView(APIView):
    """내 챌린지 현황 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 현재 사용자의 활성 챌린지 조회
            active_challenges = UserChallenge.objects.filter(
                user=request.user,
                status='active'
            ).select_related('room').order_by('-created_at')
            
            if not active_challenges.exists():
                return Response({
                    'success': True,
                    'message': '참여 중인 챌린지가 없습니다.',
                    'data': {
                        'active_challenges': [],
                        'has_active_challenge': False
                    }
                })
            
            # 챌린지 데이터 직렬화
            challenges_data = []
            for challenge in active_challenges:
                challenge_data = UserChallengeSerializer(challenge).data
                
                # 추가 정보 계산
                challenge_data.update({
                    'is_expired': challenge.remaining_duration_days <= 0,
                    'days_since_start': (timezone.now().date() - challenge.challenge_start_date).days,
                    'cheat_remaining': challenge.user_weekly_cheat_limit - challenge.current_weekly_cheat_count
                })
                
                challenges_data.append(challenge_data)
            
            return Response({
                'success': True,
                'message': '챌린지 현황을 조회했습니다.',
                'data': {
                    'active_challenges': challenges_data,
                    'has_active_challenge': True,
                    'total_active_count': len(challenges_data)
                }
            })
            
        except Exception as e:
            logger.error(f"Error retrieving user challenges: {str(e)}")
            return Response({
                'success': False,
                'error': 'SERVER_ERROR',
                'message': '챌린지 현황 조회 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExtendChallengeView(APIView):
    """챌린지 기간 연장 API"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        try:
            challenge_id = request.data.get('challenge_id')
            extend_days = request.data.get('extend_days', 7)  # 기본 7일 연장
            
            if not challenge_id:
                return Response({
                    'success': False,
                    'error': 'MISSING_CHALLENGE_ID',
                    'message': '연장할 챌린지 ID가 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 사용자의 활성 챌린지 조회
            user_challenge = get_object_or_404(
                UserChallenge,
                id=challenge_id,
                user=request.user,
                status='active'
            )
            
            # 연장 일수 검증 (1~365일)
            try:
                extend_days = int(extend_days)
                if extend_days < 1 or extend_days > 365:
                    raise ValueError("Invalid extend days")
            except (ValueError, TypeError):
                return Response({
                    'success': False,
                    'error': 'INVALID_EXTEND_DAYS',
                    'message': '연장 일수는 1~365일 사이여야 합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 챌린지 기간 연장
            with transaction.atomic():
                user_challenge.remaining_duration_days += extend_days
                user_challenge.user_challenge_duration_days += extend_days
                user_challenge.save()
                
                logger.info(f"User {request.user.id} extended challenge {challenge_id} by {extend_days} days")
                
                response_data = UserChallengeSerializer(user_challenge).data
                
                return Response({
                    'success': True,
                    'message': f'챌린지가 {extend_days}일 연장되었습니다.',
                    'data': response_data
                })
                
        except Exception as e:
            logger.error(f"Error extending challenge: {str(e)}")
            return Response({
                'success': False,
                'error': 'SERVER_ERROR',
                'message': '챌린지 연장 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LeaveChallengeView(APIView):
    """챌린지 탈퇴 API"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        try:
            challenge_id = request.data.get('challenge_id')
            
            if not challenge_id:
                return Response({
                    'success': False,
                    'error': 'MISSING_CHALLENGE_ID',
                    'message': '탈퇴할 챌린지 ID가 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 사용자의 활성 챌린지 조회
            user_challenge = get_object_or_404(
                UserChallenge,
                id=challenge_id,
                user=request.user,
                status='active'
            )
            
            # 챌린지 탈퇴 처리
            with transaction.atomic():
                user_challenge.status = 'inactive'
                user_challenge.save()
                
                logger.info(f"User {request.user.id} left challenge {challenge_id} ({user_challenge.room.name})")
                
                return Response({
                    'success': True,
                    'message': f'{user_challenge.room.name} 챌린지에서 탈퇴했습니다.',
                    'data': {
                        'challenge_id': challenge_id,
                        'room_name': user_challenge.room.name,
                        'final_streak': user_challenge.current_streak_days,
                        'total_success_days': user_challenge.total_success_days,
                        'left_at': timezone.now().isoformat()
                    }
                })
                
        except Exception as e:
            logger.error(f"Error leaving challenge: {str(e)}")
            return Response({
                'success': False,
                'error': 'SERVER_ERROR',
                'message': '챌린지 탈퇴 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
