import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ChallengeRoom,
    CheatDayRequest,
    DailyChallengeRecord,
    UserChallenge,
    UserChallengeBadge,
)
from .serializers import (
    ChallengeRoomSerializer,
    UserChallengeCreateSerializer,
    UserChallengeSerializer,
)
from .services import CheatDayService

logger = logging.getLogger("challenges")


class ChallengeRoomListView(APIView):
    """챌린지 방 목록 API (인증 없이 접근 가능)"""

    authentication_classes = []  # 인증 클래스 비활성화
    permission_classes = [AllowAny]

    def get(self, request):
        """활성화된 챌린지 방 목록 조회"""
        try:
            rooms = ChallengeRoom.objects.filter(is_active=True)
            serializer = ChallengeRoomSerializer(rooms, many=True)

            return Response(
                {
                    "count": len(serializer.data),
                    "next": None,
                    "previous": None,
                    "results": serializer.data,
                }
            )
        except Exception as e:
            logger.error(f"Error fetching challenge rooms: {str(e)}")
            return Response(
                {"error": "Failed to fetch challenge rooms"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChallengeRoomViewSet(viewsets.ReadOnlyModelViewSet):
    """챌린지 방 ViewSet (읽기 전용)"""

    serializer_class = ChallengeRoomSerializer
    authentication_classes = []  # 인증 클래스 비활성화
    permission_classes = [AllowAny]  # 명시적으로 모든 접근 허용

    def get_queryset(self):
        return ChallengeRoom.objects.filter(is_active=True)


class JoinChallengeView(APIView):
    """챌린지 참여 API"""

    permission_classes = [AllowAny]  # 명시적으로 모든 접근 허용

    def post(self, request):
        serializer = UserChallengeCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "error": "VALIDATION_ERROR",
                    "message": "입력 데이터가 올바르지 않습니다.",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # 챌린지 방은 시리얼라이저에서 이미 검증됨
                room = serializer.validated_data["room"]

                # 데모용 사용자 생성 (실제 서비스에서는 인증된 사용자 사용)
                import random

                from django.contrib.auth.models import User

                # 기존 test_user가 있으면 사용, 없으면 더미 사용자 중 하나 선택
                demo_user = None
                try:
                    demo_user = User.objects.get(username="test_user")
                except User.DoesNotExist:
                    # 더미 사용자 중 랜덤 선택 (활성 챌린지가 없는 사용자)
                    available_users = User.objects.filter(
                        username__startswith="dummy_user_"
                    ).exclude(user_challenges__status="active")[
                        :10
                    ]  # 처음 10명 중에서

                    if available_users:
                        demo_user = random.choice(available_users)
                    else:
                        # 사용 가능한 더미 사용자가 없으면 새로 생성
                        demo_user = User.objects.create_user(
                            username="test_user", email="test@example.com"
                        )

                # 중복 참여 방지: 활성 챌린지가 있는지 확인 (모든 방)
                existing_active_challenge = UserChallenge.objects.filter(
                    user=demo_user, status="active"
                ).first()

                if existing_active_challenge:
                    return Response(
                        {
                            "success": False,
                            "error": "ALREADY_IN_CHALLENGE",
                            "message": (
                                f'이미 "{existing_active_challenge.room.name}" '
                                f"챌린지에 참여 중입니다. 하나의 챌린지만 참여할 수 있습니다."
                            ),
                            "details": {
                                "current_room": (existing_active_challenge.room.name),
                                "current_room_id": (existing_active_challenge.room.id),
                                "joined_at": (
                                    existing_active_challenge.challenge_start_date
                                ),
                                "remaining_days": (
                                    existing_active_challenge.remaining_duration_days
                                ),
                            },
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # 새 챌린지 참여 생성 (시리얼라이저 사용)
                user_challenge = serializer.save(user=demo_user, status="active")

                logger.info(f"User {demo_user.id} joined challenge room {room.name}")

                # 응답 데이터
                response_data = UserChallengeSerializer(user_challenge).data

                return Response(
                    {
                        "success": True,
                        "message": "챌린지 참여가 완료되었습니다.",
                        "data": response_data,
                    },
                    status=status.HTTP_201_CREATED,
                )

        except Exception as e:
            logger.error(f"Error joining challenge: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "챌린지 참여 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MyChallengeView(APIView):
    """내 챌린지 현황 API"""

    permission_classes = [AllowAny]  # 명시적으로 모든 접근 허용

    def get(self, request):
        try:
            # 데모용 사용자 조회 (실제 서비스에서는 request.user 사용)
            from django.contrib.auth.models import User

            # test_user가 있으면 사용, 없으면 활성 챌린지가 있는 더미 사용자 중 하나 선택
            demo_user = None
            try:
                demo_user = User.objects.get(username="test_user")
            except User.DoesNotExist:
                # 활성 챌린지가 있는 더미 사용자 중 하나 선택
                demo_user = User.objects.filter(
                    username__startswith="dummy_user_",
                    user_challenges__status="active",
                ).first()

                if not demo_user:
                    # 활성 챌린지가 있는 사용자가 없으면 test_user 생성
                    demo_user = User.objects.create_user(
                        username="test_user", email="test@example.com"
                    )

            # 데모 사용자의 활성 챌린지 조회
            active_challenges = (
                UserChallenge.objects.filter(user=demo_user, status="active")
                .select_related("room")
                .order_by("-created_at")
            )

            if not active_challenges.exists():
                return Response(
                    {
                        "success": True,
                        "message": "참여 중인 챌린지가 없습니다.",
                        "data": {
                            "active_challenges": [],
                            "has_active_challenge": False,
                            "demo_user": demo_user.username,
                        },
                    }
                )

            # 챌린지 데이터 직렬화
            challenges_data = []
            for challenge in active_challenges:
                challenge_data = UserChallengeSerializer(challenge).data

                # 추가 정보 계산
                challenge_data.update(
                    {
                        "is_expired": (challenge.remaining_duration_days <= 0),
                        "days_since_start": (
                            timezone.now().date() - challenge.challenge_start_date
                        ).days,
                        "cheat_remaining": challenge.user_weekly_cheat_limit
                        - challenge.current_weekly_cheat_count,
                    }
                )

                challenges_data.append(challenge_data)

            return Response(
                {
                    "success": True,
                    "message": "챌린지 현황을 조회했습니다.",
                    "data": {
                        "active_challenges": challenges_data,
                        "has_active_challenge": True,
                        "total_active_count": len(challenges_data),
                        "demo_user": demo_user.username,
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error retrieving user challenges: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "챌린지 현황 조회 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExtendChallengeView(APIView):
    """챌린지 기간 연장 API"""

    permission_classes = [IsAuthenticated]

    def put(self, request):
        try:
            challenge_id = request.data.get("challenge_id")
            extend_days = request.data.get("extend_days", 7)  # 기본 7일 연장

            if not challenge_id:
                return Response(
                    {
                        "success": False,
                        "error": "MISSING_CHALLENGE_ID",
                        "message": "연장할 챌린지 ID가 필요합니다.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 사용자의 활성 챌린지 조회
            user_challenge = get_object_or_404(
                UserChallenge,
                id=challenge_id,
                user=request.user,
                status="active",
            )

            # 연장 일수 검증 (1~365일)
            try:
                extend_days = int(extend_days)
                if extend_days < 1 or extend_days > 365:
                    raise ValueError("Invalid extend days")
            except (ValueError, TypeError):
                return Response(
                    {
                        "success": False,
                        "error": "INVALID_EXTEND_DAYS",
                        "message": "연장 일수는 1~365일 사이여야 합니다.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 챌린지 기간 연장
            with transaction.atomic():
                user_challenge.remaining_duration_days += extend_days
                user_challenge.user_challenge_duration_days += extend_days
                user_challenge.save()

                logger.info(
                    f"User {request.user.id} extended challenge "
                    f"{challenge_id} by {extend_days} days"
                )

                response_data = UserChallengeSerializer(user_challenge).data

                return Response(
                    {
                        "success": True,
                        "message": f"챌린지가 {extend_days}일 연장되었습니다.",
                        "data": response_data,
                    }
                )

        except Exception as e:
            logger.error(f"Error extending challenge: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "챌린지 연장 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LeaveChallengeView(APIView):
    """챌린지 포기/탈퇴 API"""

    permission_classes = [AllowAny]  # 명시적으로 모든 접근 허용

    def post(self, request):
        try:
            challenge_id = request.data.get("challenge_id")

            if not challenge_id:
                return Response(
                    {
                        "success": False,
                        "message": "포기할 챌린지 ID가 필요합니다.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 데모용 사용자 조회 (실제 서비스에서는 request.user 사용)
            from django.contrib.auth.models import User  # noqa: F401

            # 챌린지 ID로 해당 챌린지의 사용자 찾기
            user_challenge = UserChallenge.objects.select_related("user").get(
                id=challenge_id, status="active"
            )

            # 챌린지 포기 처리
            user_challenge.status = "quit"
            user_challenge.save()

            return Response(
                {
                    "success": True,
                    "message": f'"{user_challenge.room.name}" 챌린지를 포기했습니다.',
                    "data": {
                        "challenge_id": challenge_id,
                        "room_name": user_challenge.room.name,
                        "user": user_challenge.user.username,
                    },
                }
            )

        except UserChallenge.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "해당 챌린지를 찾을 수 없습니다.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"오류: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RequestCheatDayView(APIView):
    """치팅 요청 API"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            target_date_str = request.data.get("date")
            challenge_id = request.data.get("challenge_id")

            # 날짜 파라미터 검증
            if not target_date_str:
                return Response(
                    {
                        "success": False,
                        "error": "MISSING_DATE",
                        "message": "치팅을 적용할 날짜가 필요합니다.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 날짜 파싱
            try:
                from datetime import datetime

                target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "error": "INVALID_DATE_FORMAT",
                        "message": "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식을 사용하세요.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 챌린지 조회
            if challenge_id:
                user_challenge = get_object_or_404(
                    UserChallenge,
                    id=challenge_id,
                    user=request.user,
                    status="active",
                )
            else:
                # 기본: 사용자의 첫 번째 활성 챌린지
                user_challenge = UserChallenge.objects.filter(
                    user=request.user, status="active"
                ).first()

                if not user_challenge:
                    return Response(
                        {
                            "success": False,
                            "error": "NO_ACTIVE_CHALLENGE",
                            "message": "참여 중인 활성 챌린지가 없습니다.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # 치팅 요청 처리
            cheat_service = CheatDayService()
            result = cheat_service.request_cheat_day(user_challenge, target_date)

            if result["success"]:
                return Response(
                    {
                        "success": True,
                        "message": result["message"],
                        "data": {
                            "date": target_date,
                            "challenge_id": user_challenge.id,
                            "room_name": user_challenge.room.name,
                            "remaining_cheats": result.get("remaining_cheats", 0),
                        },
                    }
                )
            else:
                return Response(
                    {
                        "success": False,
                        "error": result["error"],
                        "message": result["message"],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.error(f"Error requesting cheat day: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "치팅 요청 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CheatStatusView(APIView):
    """치팅 현황 API"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            challenge_id = request.query_params.get("challenge_id")

            # 챌린지 조회
            if challenge_id:
                user_challenge = get_object_or_404(
                    UserChallenge,
                    id=challenge_id,
                    user=request.user,
                    status="active",
                )
            else:
                # 기본: 사용자의 첫 번째 활성 챌린지
                user_challenge = UserChallenge.objects.filter(
                    user=request.user, status="active"
                ).first()

                if not user_challenge:
                    return Response(
                        {
                            "success": False,
                            "error": "NO_ACTIVE_CHALLENGE",
                            "message": "참여 중인 활성 챌린지가 없습니다.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # 치팅 현황 조회
            cheat_service = CheatDayService()
            cheat_status = cheat_service.get_weekly_cheat_status(user_challenge)

            # 이번 주 사용한 치팅 날짜들 조회
            from datetime import date, timedelta  # noqa: F401

            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())  # 이번 주 월요일

            cheat_requests = CheatDayRequest.objects.filter(
                user_challenge=user_challenge,
                date__gte=week_start,
                date__lte=today,
                is_approved=True,
            ).order_by("date")

            used_dates = [req.date.isoformat() for req in cheat_requests]

            return Response(
                {
                    "success": True,
                    "message": "치팅 현황을 조회했습니다.",
                    "data": {
                        "challenge_id": user_challenge.id,
                        "room_name": user_challenge.room.name,
                        "weekly_cheat_status": cheat_status,
                        "used_dates": used_dates,
                        "week_start": week_start.isoformat(),
                        "current_date": today.isoformat(),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error retrieving cheat status: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "치팅 현황 조회 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LeaderboardView(APIView):
    """리더보드 API"""

    authentication_classes = []  # 인증 클래스 비활성화
    permission_classes = [AllowAny]  # 인증 없이 접근 가능

    def get(self, request, room_id):
        try:
            # 챌린지 방 존재 확인
            room = get_object_or_404(ChallengeRoom, id=room_id, is_active=True)

            # 페이지 크기 설정
            limit = int(request.query_params.get("limit", 50))
            limit = min(limit, 100)  # 최대 100명까지

            # 리더보드 조회 (캐시 서비스 사용)
            from .cache import CachedLeaderboardService

            leaderboard = CachedLeaderboardService.get_leaderboard(room_id, limit)

            # 내 순위 찾기 (인증 없이 접근하므로 임시로 None)
            my_rank = None
            # for entry in leaderboard:
            #     if entry['user_id'] == request.user.id:
            #         my_rank = entry['rank']
            #         break

            return Response(
                {
                    "success": True,
                    "message": f"{room.name} 리더보드를 조회했습니다.",
                    "data": {
                        "room_id": room_id,
                        "room_name": room.name,
                        "leaderboard": leaderboard,
                        "my_rank": my_rank,
                        "total_participants": len(leaderboard),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error retrieving leaderboard: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "리더보드 조회 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PersonalStatsView(APIView):
    """개인 통계 API"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            challenge_id = request.query_params.get("challenge_id")

            # 챌린지 조회
            if challenge_id:
                user_challenge = get_object_or_404(
                    UserChallenge,
                    id=challenge_id,
                    user=request.user,
                    status="active",
                )
            else:
                # 기본: 사용자의 첫 번째 활성 챌린지
                user_challenge = UserChallenge.objects.filter(
                    user=request.user, status="active"
                ).first()

                if not user_challenge:
                    return Response(
                        {
                            "success": False,
                            "error": "NO_ACTIVE_CHALLENGE",
                            "message": "참여 중인 활성 챌린지가 없습니다.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # 통계 조회
            from .services import ChallengeStatisticsService

            stats_service = ChallengeStatisticsService()
            statistics = stats_service.get_user_statistics(user_challenge)

            # 획득한 배지 조회
            user_badges = (
                UserChallengeBadge.objects.filter(user=request.user)
                .select_related("badge")
                .order_by("-earned_at")
            )

            from .serializers import UserChallengeBadgeSerializer

            badges_data = UserChallengeBadgeSerializer(user_badges, many=True).data

            return Response(
                {
                    "success": True,
                    "message": "개인 통계를 조회했습니다.",
                    "data": {
                        "challenge_id": user_challenge.id,
                        "room_name": user_challenge.room.name,
                        "statistics": statistics,
                        "badges": badges_data,
                        "badge_count": len(badges_data),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error retrieving personal stats: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "개인 통계 조회 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChallengeReportView(APIView):
    """챌린지 리포트 API"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            challenge_id = request.query_params.get("challenge_id")

            # 챌린지 조회
            if challenge_id:
                user_challenge = get_object_or_404(
                    UserChallenge, id=challenge_id, user=request.user
                )
            else:
                # 기본: 사용자의 최신 챌린지 (완료/진행 중 포함)
                user_challenge = (
                    UserChallenge.objects.filter(user=request.user)
                    .order_by("-created_at")
                    .first()
                )

                if not user_challenge:
                    return Response(
                        {
                            "success": False,
                            "error": "NO_CHALLENGE_FOUND",
                            "message": "참여한 챌린지가 없습니다.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # 리포트 데이터 생성
            from .services import ChallengeStatisticsService

            stats_service = ChallengeStatisticsService()
            statistics = stats_service.get_user_statistics(user_challenge)

            # 일일 기록 조회 (최근 30일)
            from datetime import timedelta  # noqa: F401

            recent_records = DailyChallengeRecord.objects.filter(
                user_challenge=user_challenge
            ).order_by("-date")[:30]

            from .serializers import DailyChallengeRecordSerializer

            records_data = DailyChallengeRecordSerializer(
                recent_records, many=True
            ).data

            # 획득한 배지
            user_badges = (
                UserChallengeBadge.objects.filter(
                    user=request.user, user_challenge=user_challenge
                )
                .select_related("badge")
                .order_by("-earned_at")
            )

            from .serializers import UserChallengeBadgeSerializer

            badges_data = UserChallengeBadgeSerializer(user_badges, many=True).data

            # 완료 여부 및 결과 메시지
            is_completed = user_challenge.status == "completed"
            result_message = self._generate_result_message(
                user_challenge, statistics, is_completed
            )

            return Response(
                {
                    "success": True,
                    "message": "챌린지 리포트를 조회했습니다.",
                    "data": {
                        "challenge_info": {
                            "id": user_challenge.id,
                            "room_name": user_challenge.room.name,
                            "target_calorie": (user_challenge.room.target_calorie),
                            "start_date": user_challenge.challenge_start_date,
                            "duration_days": (
                                user_challenge.user_challenge_duration_days
                            ),
                            "status": user_challenge.status,
                            "is_completed": is_completed,
                        },
                        "statistics": statistics,
                        "recent_records": records_data,
                        "badges": badges_data,
                        "result_message": result_message,
                        "generated_at": timezone.now().isoformat(),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error generating challenge report: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "챌린지 리포트 생성 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _generate_result_message(self, user_challenge, statistics, is_completed):
        """결과 메시지 생성"""
        if is_completed:
            success_rate = statistics["success_rate"]
            if success_rate >= 80:
                return f"🎉 훌륭합니다! {success_rate}%의 높은 성공률로 챌린지를 완료했습니다!"
            elif success_rate >= 60:
                return (
                    f"👏 잘했습니다! {success_rate}%의 성공률로 챌린지를 완료했습니다!"
                )
            else:
                return (
                    f"💪 아쉽지만 {success_rate}%로 챌린지를 마쳤습니다. "
                    f"다음엔 더 좋은 결과를 만들어보세요!"
                )
        else:
            remaining_days = user_challenge.remaining_duration_days
            current_streak = statistics["current_streak"]
            if remaining_days > 0:
                return (
                    f"🔥 현재 {current_streak}일 연속 성공 중! "
                    f"남은 {remaining_days}일도 화이팅!"
                )
            else:
                return (
                    f"⏰ 챌린지 기간이 만료되었습니다. "
                    f"최고 연속 기록: {statistics['max_streak']}일"
                )


class DailyChallengeJudgmentView(APIView):
    """일일 챌린지 판정 API (내부 호출용)"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            target_date_str = request.data.get("date")
            challenge_id = request.data.get("challenge_id")

            # 날짜 파라미터 검증
            if target_date_str:
                from datetime import datetime

                try:
                    target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                except ValueError:
                    return Response(
                        {
                            "success": False,
                            "error": "INVALID_DATE_FORMAT",
                            "message": "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식을 사용하세요.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                # 기본: 오늘 날짜
                target_date = timezone.now().date()

            # 챌린지 조회
            if challenge_id:
                user_challenge = get_object_or_404(
                    UserChallenge,
                    id=challenge_id,
                    user=request.user,
                    status="active",
                )
                challenges = [user_challenge]
            else:
                # 모든 활성 챌린지 판정
                challenges = UserChallenge.objects.filter(
                    user=request.user,
                    status="active",
                    remaining_duration_days__gt=0,
                )

            if not challenges:
                return Response(
                    {
                        "success": False,
                        "error": "NO_ACTIVE_CHALLENGE",
                        "message": "판정할 활성 챌린지가 없습니다.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 판정 실행
            from .services import ChallengeJudgmentService

            judgment_service = ChallengeJudgmentService()

            results = []
            for challenge in challenges:
                daily_record = judgment_service.judge_daily_challenge(
                    challenge, target_date
                )
                results.append(
                    {
                        "challenge_id": challenge.id,
                        "room_name": challenge.room.name,
                        "date": target_date,
                        "is_success": daily_record.is_success,
                        "is_cheat_day": daily_record.is_cheat_day,
                        "total_calories": daily_record.total_calories,
                        "target_calories": daily_record.target_calories,
                        "current_streak": challenge.current_streak_days,
                    }
                )

            return Response(
                {
                    "success": True,
                    "message": f"{target_date} 일일 챌린지 판정이 완료되었습니다.",
                    "data": {
                        "judgment_date": target_date,
                        "processed_challenges": len(results),
                        "results": results,
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in daily challenge judgment: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "일일 챌린지 판정 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WeeklyResetView(APIView):
    """주간 초기화 API (스케줄러용)"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from .services import WeeklyResetService

            reset_service = WeeklyResetService()

            # 주간 치팅 초기화 실행
            updated_count = reset_service.reset_weekly_cheat_counts()

            return Response(
                {
                    "success": True,
                    "message": "주간 치팅 초기화가 완료되었습니다.",
                    "data": {
                        "updated_challenges": updated_count,
                        "reset_date": timezone.now().date().isoformat(),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in weekly reset: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "SERVER_ERROR",
                    "message": "주간 초기화 중 오류가 발생했습니다.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
