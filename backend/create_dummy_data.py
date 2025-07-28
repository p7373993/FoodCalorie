#!/usr/bin/env python
"""
더미 데이터 생성 스크립트
챌린지 시스템을 실제처럼 작동하도록 더미 사용자, 참여 기록, 일일 기록 등을 생성합니다.
"""
import os
import random
import sys
from datetime import date, timedelta

import django
from faker import Faker

# Django 설정
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User

from challenges.models import (ChallengeBadge, ChallengeRoom, CheatDayRequest,
                               DailyChallengeRecord, UserChallenge,
                               UserChallengeBadge)

fake = Faker("ko_KR")  # 한국어 더미 데이터


def create_dummy_users(count=100):
    """더미 사용자들을 생성합니다."""
    print(f"더미 사용자 {count}명 생성 중...")

    # 기존 더미 사용자 삭제 (test_user 제외)
    User.objects.filter(username__startswith="dummy_").delete()

    # 한국어 명사 리스트 (동물, 음식, 자연, 색깔 등)
    nouns1 = [
        "바다",
        "산",
        "하늘",
        "별",
        "달",
        "해",
        "구름",
        "바람",
        "꽃",
        "나무",
        "강",
        "호수",
        "숲",
        "들판",
        "언덕",
        "계곡",
        "폭포",
        "무지개",
        "눈",
        "비",
        "봄",
        "여름",
        "가을",
        "겨울",
        "아침",
        "저녁",
        "밤",
        "새벽",
        "황혼",
        "노을",
    ]

    nouns2 = [
        "사자",
        "호랑이",
        "곰",
        "늑대",
        "여우",
        "토끼",
        "고양이",
        "강아지",
        "새",
        "독수리",
        "사과",
        "바나나",
        "딸기",
        "포도",
        "복숭아",
        "오렌지",
        "수박",
        "멜론",
        "키위",
        "망고",
        "용사",
        "마법사",
        "기사",
        "궁수",
        "도적",
        "현자",
        "왕자",
        "공주",
        "요정",
        "천사",
        "루비",
        "다이아",
        "에메랄드",
        "사파이어",
        "진주",
        "황금",
        "은빛",
        "청동",
        "크리스탈",
        "보석",
    ]

    users = []
    used_names = set()

    for i in range(count):
        # 중복되지 않는 닉네임 생성
        while True:
            noun1 = random.choice(nouns1)
            noun2 = random.choice(nouns2)
            username = f"{noun1}{noun2}"

            if username not in used_names:
                used_names.add(username)
                break

        email = f"{username.lower()}@example.com"

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
        )
        users.append(user)

    print(f"✅ {len(users)}명의 더미 사용자 생성 완료")
    return users


def create_dummy_user_challenges(users, rooms):
    """더미 사용자 챌린지 참여 기록을 생성합니다."""
    print("더미 챌린지 참여 기록 생성 중...")

    # 기존 더미 챌린지 삭제
    UserChallenge.objects.filter(user__username__startswith="dummy_").delete()

    user_challenges = []

    for room in rooms:
        # 각 방에 설정된 더미 사용자 수만큼 참여자 생성
        participants_count = min(room.dummy_users_count, len(users))
        selected_users = random.sample(users, participants_count)

        for user in selected_users:
            # 챌린지 시작일 (최근 30일 내 랜덤)
            start_date = fake.date_between(start_date="-30d", end_date="today")

            # 챌린지 기간 (7~90일 랜덤)
            duration = random.randint(7, 90)

            # 현재까지 경과일
            days_passed = (date.today() - start_date).days
            remaining_days = max(0, duration - days_passed)

            # 상태 결정
            if remaining_days <= 0:
                status = random.choice(["completed", "quit"])
            else:
                status = "active"

            # 사용자 신체 정보 (랜덤)
            height = random.uniform(150, 190)
            current_weight = random.uniform(45, 100)
            target_weight = current_weight - random.uniform(2, 15)

            user_challenge = UserChallenge.objects.create(
                user=user,
                room=room,
                user_height=height,
                user_weight=current_weight,
                user_target_weight=target_weight,
                user_challenge_duration_days=duration,
                user_weekly_cheat_limit=random.choice([0, 1, 2, 3]),
                min_daily_meals=random.choice([2, 3, 4]),
                current_streak_days=random.randint(0, min(days_passed, 15)),
                max_streak_days=random.randint(0, min(days_passed, 20)),
                remaining_duration_days=remaining_days,
                current_weekly_cheat_count=random.randint(0, 2),
                total_success_days=random.randint(0, days_passed),
                total_failure_days=random.randint(0, days_passed // 2),
                status=status,
                challenge_start_date=start_date,
                last_activity_date=fake.date_between(
                    start_date=start_date, end_date="today"
                ),
            )
            user_challenges.append(user_challenge)

    print(f"✅ {len(user_challenges)}개의 더미 챌린지 참여 기록 생성 완료")
    return user_challenges


def create_dummy_daily_records(user_challenges):
    """더미 일일 챌린지 기록을 생성합니다."""
    print("더미 일일 기록 생성 중...")

    # 기존 더미 일일 기록 삭제
    DailyChallengeRecord.objects.filter(
        user_challenge__user__username__startswith="dummy_"
    ).delete()

    daily_records = []

    for user_challenge in user_challenges:
        start_date = user_challenge.challenge_start_date
        days_passed = (date.today() - start_date).days

        # 최소 1일은 기록 생성하도록 보장
        record_days = max(1, min(days_passed + 1, 30))

        # 각 날짜별로 기록 생성
        for day_offset in range(record_days):
            record_date = start_date + timedelta(days=day_offset)

            # 목표 칼로리
            target_calories = user_challenge.room.target_calorie
            tolerance = user_challenge.room.tolerance

            # 실제 섭취 칼로리 (성공률 70% 정도로 설정)
            success_probability = 0.7
            if random.random() < success_probability:
                # 성공: 목표 칼로리 ± tolerance 범위 내
                total_calories = random.uniform(
                    target_calories - tolerance, target_calories + tolerance
                )
                is_success = True
            else:
                # 실패: 목표 칼로리를 크게 벗어남
                if random.random() < 0.5:
                    # 과다 섭취
                    total_calories = random.uniform(
                        target_calories + tolerance,
                        target_calories + tolerance * 3,
                    )
                else:
                    # 과소 섭취
                    total_calories = random.uniform(
                        target_calories - tolerance * 2,
                        target_calories - tolerance,
                    )
                is_success = False

            # 치팅 사용 여부 (10% 확률)
            is_cheat_day = (
                random.random() < 0.1
                and user_challenge.user_weekly_cheat_limit > 0
            )
            if is_cheat_day:
                is_success = True  # 치팅 사용시 성공으로 처리

            # 식사 횟수
            meal_count = random.randint(
                user_challenge.min_daily_meals,
                user_challenge.min_daily_meals + 2,
            )

            daily_record = DailyChallengeRecord.objects.create(
                user_challenge=user_challenge,
                date=record_date,
                total_calories=round(total_calories, 1),
                target_calories=target_calories,
                is_success=is_success,
                is_cheat_day=is_cheat_day,
                meal_count=meal_count,
            )
            daily_records.append(daily_record)

    print(f"✅ {len(daily_records)}개의 더미 일일 기록 생성 완료")
    return daily_records


def create_dummy_cheat_requests(user_challenges):
    """더미 치팅 요청을 생성합니다."""
    print("더미 치팅 요청 생성 중...")

    # 기존 더미 치팅 요청 삭제
    CheatDayRequest.objects.filter(
        user_challenge__user__username__startswith="dummy_"
    ).delete()

    cheat_requests = []

    for user_challenge in user_challenges:
        if user_challenge.user_weekly_cheat_limit == 0:
            continue

        # 치팅 요청 생성 (20% 확률)
        if random.random() < 0.2:
            start_date = user_challenge.challenge_start_date
            days_passed = (date.today() - start_date).days

            # 랜덤한 날짜에 치팅 요청 (중복 방지)
            max_days = max(1, min(days_passed + 1, 30))
            used_dates = set()

            for _ in range(
                random.randint(1, user_challenge.user_weekly_cheat_limit)
            ):
                # 중복되지 않는 날짜 찾기
                attempts = 0
                while attempts < 10:  # 최대 10번 시도
                    cheat_date = start_date + timedelta(
                        days=random.randint(0, max_days - 1)
                    )
                    if cheat_date not in used_dates:
                        used_dates.add(cheat_date)
                        break
                    attempts += 1
                else:
                    continue  # 중복되지 않는 날짜를 찾지 못하면 스킵

                cheat_request, created = CheatDayRequest.objects.get_or_create(
                    user_challenge=user_challenge,
                    date=cheat_date,
                    defaults={
                        "is_approved": True,  # 대부분 승인됨
                        "reason": random.choice(
                            [
                                "회식이 있어서",
                                "생일 파티",
                                "스트레스로 인한 폭식",
                                "가족 모임",
                                "특별한 날",
                            ]
                        ),
                    },
                )
                if created:
                    cheat_requests.append(cheat_request)

    print(f"✅ {len(cheat_requests)}개의 더미 치팅 요청 생성 완료")
    return cheat_requests


def create_challenge_badges():
    """챌린지 배지들을 생성합니다."""
    print("챌린지 배지 생성 중...")

    # 기존 배지 삭제
    ChallengeBadge.objects.all().delete()

    badges_data = [
        {
            "name": "첫 걸음",
            "description": "첫 번째 챌린지 완료",
            "icon": "🎯",
            "condition_type": "completion",
            "condition_value": 1,
        },
        {
            "name": "3일 연속",
            "description": "3일 연속 성공",
            "icon": "🔥",
            "condition_type": "streak",
            "condition_value": 3,
        },
        {
            "name": "일주일 챔피언",
            "description": "7일 연속 성공",
            "icon": "👑",
            "condition_type": "streak",
            "condition_value": 7,
        },
        {
            "name": "2주 마스터",
            "description": "14일 연속 성공",
            "icon": "🏆",
            "condition_type": "streak",
            "condition_value": 14,
        },
        {
            "name": "한 달 전설",
            "description": "30일 연속 성공",
            "icon": "⭐",
            "condition_type": "streak",
            "condition_value": 30,
        },
        {
            "name": "완벽한 주",
            "description": "일주일 동안 완벽한 기록",
            "icon": "💎",
            "condition_type": "perfect_week",
            "condition_value": 1,
        },
        {
            "name": "성공 50일",
            "description": "총 50일 성공",
            "icon": "🌟",
            "condition_type": "total_success",
            "condition_value": 50,
        },
        {
            "name": "성공 100일",
            "description": "총 100일 성공",
            "icon": "🎖️",
            "condition_type": "total_success",
            "condition_value": 100,
        },
    ]

    badges = []
    for badge_data in badges_data:
        badge = ChallengeBadge.objects.create(**badge_data)
        badges.append(badge)

    print(f"✅ {len(badges)}개의 챌린지 배지 생성 완료")
    return badges


def assign_dummy_badges(user_challenges, badges):
    """더미 사용자들에게 배지를 할당합니다."""
    print("더미 배지 할당 중...")

    # 기존 더미 배지 삭제
    UserChallengeBadge.objects.filter(
        user__username__startswith="dummy_"
    ).delete()

    user_badges = []

    for user_challenge in user_challenges:
        user = user_challenge.user

        # 각 배지에 대해 조건 확인 및 할당 (랜덤)
        for badge in badges:
            should_earn = False

            if badge.condition_type == "streak":
                should_earn = (
                    user_challenge.max_streak_days >= badge.condition_value
                )
            elif badge.condition_type == "completion":
                should_earn = user_challenge.status == "completed"
            elif badge.condition_type == "total_success":
                should_earn = (
                    user_challenge.total_success_days >= badge.condition_value
                )
            elif badge.condition_type == "perfect_week":
                should_earn = random.random() < 0.3  # 30% 확률

            # 추가 랜덤 요소 (모든 조건을 만족해도 80% 확률로만 획득)
            if should_earn and random.random() < 0.8:
                user_badge, created = UserChallengeBadge.objects.get_or_create(
                    user=user,
                    badge=badge,
                    defaults={
                        "user_challenge": user_challenge,
                        "earned_at": fake.date_time_between(
                            start_date=user_challenge.challenge_start_date,
                            end_date="now",
                        ),
                    },
                )
                if created:
                    user_badges.append(user_badge)

    print(f"✅ {len(user_badges)}개의 더미 배지 할당 완료")
    return user_badges


def main():
    """메인 실행 함수"""
    print("🚀 더미 데이터 생성을 시작합니다...\n")

    try:
        # 1. 챌린지 방 확인
        rooms = list(ChallengeRoom.objects.filter(is_active=True))
        if not rooms:
            print(
                "❌ 활성화된 챌린지 방이 없습니다. 먼저 create_test_challenges.py를 실행하세요."
            )
            return

        print(f"📋 {len(rooms)}개의 챌린지 방 확인됨")

        # 2. 더미 사용자 생성
        users = create_dummy_users(100)

        # 3. 더미 챌린지 참여 기록 생성
        user_challenges = create_dummy_user_challenges(users, rooms)

        # 4. 더미 일일 기록 생성
        daily_records = create_dummy_daily_records(user_challenges)

        # 5. 더미 치팅 요청 생성
        cheat_requests = create_dummy_cheat_requests(user_challenges)

        # 6. 챌린지 배지 생성
        badges = create_challenge_badges()

        # 7. 더미 배지 할당
        user_badges = assign_dummy_badges(user_challenges, badges)

        print(f"\n🎉 더미 데이터 생성 완료!")
        print(f"   - 사용자: {len(users)}명")
        print(f"   - 챌린지 참여: {len(user_challenges)}개")
        print(f"   - 일일 기록: {len(daily_records)}개")
        print(f"   - 치팅 요청: {len(cheat_requests)}개")
        print(f"   - 배지: {len(badges)}개")
        print(f"   - 사용자 배지: {len(user_badges)}개")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
