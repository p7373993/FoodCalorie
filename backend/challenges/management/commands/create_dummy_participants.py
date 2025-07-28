import random
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from challenges.models import (
    ChallengeRoom,
    DailyChallengeRecord,
    UserChallenge,
)


class Command(BaseCommand):
    help = "챌린지 참여자와 진행 상황 더미 데이터를 생성합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--room-name",
            type=str,
            default="1500kcal_challenge",
            help="더미 데이터를 생성할 챌린지 방 이름",
        )
        parser.add_argument(
            "--participants", type=int, default=10, help="생성할 참가자 수"
        )
        parser.add_argument(
            "--days", type=int, default=7, help="생성할 진행 상황 일수"
        )

    def handle(self, *args, **options):
        room_name = options["room_name"]
        num_participants = options["participants"]
        num_days = options["days"]

        try:
            room = ChallengeRoom.objects.get(name=room_name)
        except ChallengeRoom.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    f'챌린지 방 "{room_name}"을 찾을 수 없습니다.'
                )
            )
            return

        self.stdout.write(
            f'챌린지 방 "{room.name}"에 더미 데이터를 생성합니다...'
        )

        # 더미 사용자들 생성
        participants = self.create_dummy_users(num_participants)

        # 사용자 챌린지 참여 데이터 생성
        user_challenges = self.create_user_challenges(room, participants)

        # 진행 상황 데이터 생성
        self.create_progress_data(user_challenges, num_days)

        self.stdout.write(
            self.style.SUCCESS(
                f"총 {len(participants)}명의 참가자와 {num_days}일간의 진행 상황 데이터가 생성되었습니다!"
            )
        )

    def create_dummy_users(self, num_users):
        """더미 사용자들 생성"""
        participants = []

        for i in range(num_users):
            username = f"dummy_user_{i+1:03d}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "first_name": f"User{i+1}",
                    "last_name": "Dummy",
                },
            )

            if created:
                self.stdout.write(f"  ✓ 더미 사용자 생성: {username}")
            else:
                self.stdout.write(f"  - 더미 사용자 이미 존재: {username}")

            participants.append(user)

        return participants

    def create_user_challenges(self, room, participants):
        """사용자 챌린지 참여 데이터 생성"""
        user_challenges = []

        for i, user in enumerate(participants):
            # 랜덤한 사용자 정보 생성
            height = random.uniform(150, 180)  # 150-180cm
            weight = random.uniform(50, 100)  # 50-100kg
            target_weight = weight - random.uniform(
                2, 10
            )  # 현재 체중보다 2-10kg 적게

            # 챌린지 설정
            challenge_duration = random.randint(7, 30)  # 7-30일
            weekly_cheat_limit = random.choice([0, 1, 2, 3])
            min_daily_meals = random.choice([2, 3, 4])

            # 진행 상태 (랜덤하게 설정)
            current_streak = random.randint(0, min(challenge_duration, 7))
            max_streak = random.randint(current_streak, current_streak + 5)
            remaining_days = max(
                0,
                challenge_duration
                - random.randint(0, challenge_duration // 2),
            )
            weekly_cheat_count = random.randint(0, weekly_cheat_limit)

            total_success = random.randint(
                0, challenge_duration - remaining_days
            )
            total_failure = random.randint(0, 3)

            user_challenge, created = UserChallenge.objects.get_or_create(
                user=user,
                room=room,
                defaults={
                    "user_height": height,
                    "user_weight": weight,
                    "user_target_weight": target_weight,
                    "user_challenge_duration_days": challenge_duration,
                    "user_weekly_cheat_limit": weekly_cheat_limit,
                    "min_daily_meals": min_daily_meals,
                    "current_streak_days": current_streak,
                    "max_streak_days": max_streak,
                    "remaining_duration_days": remaining_days,
                    "current_weekly_cheat_count": weekly_cheat_count,
                    "total_success_days": total_success,
                    "total_failure_days": total_failure,
                    "status": "active" if remaining_days > 0 else "completed",
                    "challenge_start_date": timezone.now().date()
                    - timedelta(days=challenge_duration - remaining_days),
                    "last_activity_date": timezone.now().date(),
                },
            )

            if created:
                self.stdout.write(
                    f"  ✓ 사용자 챌린지 참여 생성: {user.username} (연속 {current_streak}일)"
                )
            else:
                self.stdout.write(
                    f"  - 사용자 챌린지 참여 이미 존재: {user.username}"
                )

            user_challenges.append(user_challenge)

        return user_challenges

    def create_progress_data(self, user_challenges, num_days):
        """진행 상황 데이터 생성"""
        today = timezone.now().date()

        for user_challenge in user_challenges:
            # 챌린지 시작일부터 오늘까지의 데이터 생성
            start_date = user_challenge.challenge_start_date

            for i in range(num_days):
                progress_date = start_date + timedelta(days=i)

                # 오늘 이후의 날짜는 생성하지 않음
                if progress_date > today:
                    break

                # 목표 달성 여부 (70% 확률로 성공)
                is_success = random.random() < 0.7

                # 실제 달성값 (목표 칼로리의 ±20% 범위)
                target_calorie = user_challenge.room.target_calorie
                tolerance = user_challenge.room.tolerance

                if is_success:
                    # 성공: 목표 ± 허용 오차 범위
                    total_calories = random.uniform(
                        target_calorie - tolerance, target_calorie + tolerance
                    )
                else:
                    # 실패: 허용 오차를 벗어난 값
                    if random.random() < 0.5:
                        # 목표보다 높은 값
                        total_calories = random.uniform(
                            target_calorie + tolerance + 50,
                            target_calorie + tolerance + 300,
                        )
                    else:
                        # 목표보다 낮은 값
                        total_calories = random.uniform(
                            target_calorie - tolerance - 300,
                            target_calorie - tolerance - 50,
                        )

                # 치팅 사용 여부 (10% 확률)
                is_cheat_day = random.random() < 0.1

                # 식사 횟수 (2-4회)
                meal_count = random.randint(2, 4)

                record, created = DailyChallengeRecord.objects.get_or_create(
                    user_challenge=user_challenge,
                    date=progress_date,
                    defaults={
                        "total_calories": round(total_calories, 1),
                        "target_calories": target_calorie,
                        "is_success": is_success,
                        "is_cheat_day": is_cheat_day,
                        "meal_count": meal_count,
                    },
                )

                if created:
                    status = "성공" if is_success else "실패"
                    cheat_text = " (치팅)" if is_cheat_day else ""
                    self.stdout.write(
                        f"    ✓ 진행 상황 생성: {user_challenge.user.username} - {progress_date} ({status}{cheat_text})"
                    )

        self.stdout.write(
            f"  총 {num_days}일간의 진행 상황 데이터가 생성되었습니다."
        )
