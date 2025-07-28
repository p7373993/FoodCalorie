from django.core.management.base import BaseCommand

from challenges.models import ChallengeBadge, ChallengeRoom


class Command(BaseCommand):
    help = "챌린지 시스템 초기 데이터 설정"

    def handle(self, *args, **options):
        self.stdout.write("챌린지 시스템 초기 데이터를 설정합니다...")

        # 챌린지 방 생성
        self.create_challenge_rooms()

        # 배지 생성
        self.create_badges()

        self.stdout.write(
            self.style.SUCCESS(
                "챌린지 시스템 초기 데이터 설정이 완료되었습니다!"
            )
        )

    def create_challenge_rooms(self):
        """챌린지 방 생성"""
        rooms_data = [
            {
                "name": "1200kcal_challenge",
                "target_calorie": 1200,
                "description": "다이어트를 위한 저칼로리 챌린지입니다. 하루 1200kcal 목표로 건강한 체중 감량을 목표로 합니다.",
                "dummy_users_count": 15,
            },
            {
                "name": "1500kcal_challenge",
                "target_calorie": 1500,
                "description": "균형 잡힌 다이어트 챌린지입니다. 하루 1500kcal로 건강하게 체중을 관리해보세요.",
                "dummy_users_count": 32,
            },
            {
                "name": "1800kcal_challenge",
                "target_calorie": 1800,
                "description": "표준 칼로리 관리 챌린지입니다. 하루 1800kcal로 체중을 유지하며 건강한 식습관을 만들어보세요.",
                "dummy_users_count": 28,
            },
            {
                "name": "2000kcal_challenge",
                "target_calorie": 2000,
                "description": "활동적인 생활을 위한 챌린지입니다. 하루 2000kcal로 에너지를 충분히 섭취하며 건강을 유지하세요.",
                "dummy_users_count": 21,
            },
            {
                "name": "2200kcal_challenge",
                "target_calorie": 2200,
                "description": "근육량 증가를 위한 챌린지입니다. 하루 2200kcal로 충분한 영양을 섭취하며 체력을 기르세요.",
                "dummy_users_count": 18,
            },
        ]

        for room_data in rooms_data:
            room, created = ChallengeRoom.objects.get_or_create(
                name=room_data["name"], defaults=room_data
            )
            if created:
                self.stdout.write(f"  ✓ 챌린지 방 생성: {room.name}")
            else:
                self.stdout.write(f"  - 챌린지 방 이미 존재: {room.name}")

    def create_badges(self):
        """배지 생성"""
        badges_data = [
            # 연속 성공 배지
            {
                "name": "첫 걸음",
                "description": "첫 번째 성공을 축하합니다!",
                "icon": "🎯",
                "condition_type": "streak",
                "condition_value": 1,
            },
            {
                "name": "일주일 챔피언",
                "description": "7일 연속 성공을 달성했습니다!",
                "icon": "🏆",
                "condition_type": "streak",
                "condition_value": 7,
            },
            {
                "name": "2주 마스터",
                "description": "14일 연속 성공! 대단한 의지력입니다!",
                "icon": "🥇",
                "condition_type": "streak",
                "condition_value": 14,
            },
            {
                "name": "한 달 전설",
                "description": "30일 연속 성공! 당신은 전설입니다!",
                "icon": "👑",
                "condition_type": "streak",
                "condition_value": 30,
            },
            {
                "name": "100일 신화",
                "description": "100일 연속 성공! 불가능을 가능으로 만든 당신!",
                "icon": "🌟",
                "condition_type": "streak",
                "condition_value": 100,
            },
            # 총 성공 일수 배지
            {
                "name": "성실한 도전자",
                "description": "총 10일 성공을 달성했습니다!",
                "icon": "📈",
                "condition_type": "total_success",
                "condition_value": 10,
            },
            {
                "name": "꾸준한 실천가",
                "description": "총 30일 성공을 달성했습니다!",
                "icon": "💪",
                "condition_type": "total_success",
                "condition_value": 30,
            },
            {
                "name": "습관의 달인",
                "description": "총 50일 성공을 달성했습니다!",
                "icon": "🎖️",
                "condition_type": "total_success",
                "condition_value": 50,
            },
            {
                "name": "칼로리 마에스트로",
                "description": "총 100일 성공을 달성했습니다!",
                "icon": "🎭",
                "condition_type": "total_success",
                "condition_value": 100,
            },
            # 챌린지 완료 배지
            {
                "name": "챌린지 완주자",
                "description": "첫 번째 챌린지를 완주했습니다!",
                "icon": "🏁",
                "condition_type": "completion",
                "condition_value": 1,
            },
            {
                "name": "다중 챌린저",
                "description": "3개의 챌린지를 완주했습니다!",
                "icon": "🎪",
                "condition_type": "completion",
                "condition_value": 3,
            },
            {
                "name": "챌린지 컬렉터",
                "description": "5개의 챌린지를 완주했습니다!",
                "icon": "🏛️",
                "condition_type": "completion",
                "condition_value": 5,
            },
        ]

        for badge_data in badges_data:
            badge, created = ChallengeBadge.objects.get_or_create(
                name=badge_data["name"], defaults=badge_data
            )
            if created:
                self.stdout.write(f"  ✓ 배지 생성: {badge.name}")
            else:
                self.stdout.write(f"  - 배지 이미 존재: {badge.name}")
