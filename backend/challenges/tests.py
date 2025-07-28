from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import IntegrityError
from datetime import date, time, timedelta
from decimal import Decimal

from .models import (
    ChallengeRoom, UserChallenge, DailyChallengeRecord, 
    CheatDayRequest, ChallengeBadge, UserChallengeBadge
)
from .services import (
    ChallengeJudgmentService, CheatDayService, 
    ChallengeStatisticsService, WeeklyResetService
)
from api_integrated.models import MealLog


class ChallengeRoomModelTest(TestCase):
    """챌린지 방 모델 테스트"""
    
    def setUp(self):
        self.room_data = {
            'name': '1500kcal_challenge',
            'target_calorie': 1500,
            'tolerance': 50,
            'description': '1500칼로리 챌린지',
            'is_active': True,
            'dummy_users_count': 10
        }
    
    def test_create_challenge_room(self):
        """챌린지 방 생성 테스트"""
        room = ChallengeRoom.objects.create(**self.room_data)
        
        self.assertEqual(room.name, '1500kcal_challenge')
        self.assertEqual(room.target_calorie, 1500)
        self.assertEqual(room.tolerance, 50)
        self.assertTrue(room.is_active)
        self.assertEqual(room.dummy_users_count, 10)
    
    def test_challenge_room_str_representation(self):
        """챌린지 방 문자열 표현 테스트"""
        room = ChallengeRoom.objects.create(**self.room_data)
        expected_str = "1500kcal_challenge (1500kcal)"
        self.assertEqual(str(room), expected_str)
    
    def test_challenge_room_unique_name(self):
        """챌린지 방 이름 유니크 제약 테스트"""
        ChallengeRoom.objects.create(**self.room_data)
        
        with self.assertRaises(IntegrityError):
            ChallengeRoom.objects.create(**self.room_data)
    
    def test_challenge_room_validation(self):
        """챌린지 방 필드 검증 테스트"""
        # 칼로리 범위 검증
        invalid_data = self.room_data.copy()
        invalid_data['target_calorie'] = 500  # 최소값 미만
        
        room = ChallengeRoom(**invalid_data)
        with self.assertRaises(Exception):
            room.full_clean()


class UserChallengeModelTest(TestCase):
    """사용자 챌린지 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.challenge_data = {
            'user': self.user,
            'room': self.room,
            'user_height': 170.0,
            'user_weight': 70.0,
            'user_target_weight': 65.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2,
            'remaining_duration_days': 30
        }
    
    def test_create_user_challenge(self):
        """사용자 챌린지 생성 테스트"""
        challenge = UserChallenge.objects.create(**self.challenge_data)
        
        self.assertEqual(challenge.user, self.user)
        self.assertEqual(challenge.room, self.room)
        self.assertEqual(challenge.user_height, 170.0)
        self.assertEqual(challenge.user_weight, 70.0)
        self.assertEqual(challenge.status, 'active')
        self.assertEqual(challenge.current_streak_days, 0)
        self.assertEqual(challenge.max_streak_days, 0)
    
    def test_user_challenge_str_representation(self):
        """사용자 챌린지 문자열 표현 테스트"""
        challenge = UserChallenge.objects.create(**self.challenge_data)
        expected_str = "testuser - 1500kcal_challenge"
        self.assertEqual(str(challenge), expected_str)
    
    def test_user_challenge_unique_constraint(self):
        """사용자-방 유니크 제약 테스트"""
        UserChallenge.objects.create(**self.challenge_data)
        
        with self.assertRaises(IntegrityError):
            UserChallenge.objects.create(**self.challenge_data)
    
    def test_is_active_property(self):
        """is_active 프로퍼티 테스트"""
        challenge = UserChallenge.objects.create(**self.challenge_data)
        
        # 활성 상태 테스트
        self.assertTrue(challenge.is_active)
        
        # 비활성 상태 테스트
        challenge.status = 'inactive'
        challenge.save()
        self.assertFalse(challenge.is_active)
        
        # 기간 만료 테스트
        challenge.status = 'active'
        challenge.remaining_duration_days = 0
        challenge.save()
        self.assertFalse(challenge.is_active)
    
    def test_challenge_end_date_property(self):
        """challenge_end_date 프로퍼티 테스트"""
        challenge = UserChallenge.objects.create(**self.challenge_data)
        expected_end_date = challenge.challenge_start_date + timedelta(days=30)
        self.assertEqual(challenge.challenge_end_date, expected_end_date)


class DailyChallengeRecordModelTest(TestCase):
    """일일 챌린지 기록 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=30
        )
    
    def test_create_daily_record(self):
        """일일 기록 생성 테스트"""
        record = DailyChallengeRecord.objects.create(
            user_challenge=self.user_challenge,
            date=date.today(),
            total_calories=1480.0,
            target_calories=1500.0,
            is_success=True,
            meal_count=3
        )
        
        self.assertEqual(record.user_challenge, self.user_challenge)
        self.assertEqual(record.total_calories, 1480.0)
        self.assertTrue(record.is_success)
        self.assertFalse(record.is_cheat_day)
        self.assertEqual(record.meal_count, 3)
    
    def test_daily_record_unique_constraint(self):
        """일일 기록 유니크 제약 테스트"""
        DailyChallengeRecord.objects.create(
            user_challenge=self.user_challenge,
            date=date.today(),
            total_calories=1480.0,
            target_calories=1500.0,
            is_success=True
        )
        
        with self.assertRaises(IntegrityError):
            DailyChallengeRecord.objects.create(
                user_challenge=self.user_challenge,
                date=date.today(),
                total_calories=1520.0,
                target_calories=1500.0,
                is_success=True
            )
    
    def test_calorie_difference_property(self):
        """칼로리 차이 프로퍼티 테스트"""
        record = DailyChallengeRecord.objects.create(
            user_challenge=self.user_challenge,
            date=date.today(),
            total_calories=1480.0,
            target_calories=1500.0,
            is_success=True
        )
        
        self.assertEqual(record.calorie_difference, -20.0)


class CheatDayRequestModelTest(TestCase):
    """치팅 요청 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=30
        )
    
    def test_create_cheat_request(self):
        """치팅 요청 생성 테스트"""
        cheat_request = CheatDayRequest.objects.create(
            user_challenge=self.user_challenge,
            date=date.today(),
            is_approved=True,
            reason='가족 모임'
        )
        
        self.assertEqual(cheat_request.user_challenge, self.user_challenge)
        self.assertEqual(cheat_request.date, date.today())
        self.assertTrue(cheat_request.is_approved)
        self.assertEqual(cheat_request.reason, '가족 모임')
    
    def test_cheat_request_unique_constraint(self):
        """치팅 요청 유니크 제약 테스트"""
        CheatDayRequest.objects.create(
            user_challenge=self.user_challenge,
            date=date.today(),
            is_approved=True
        )
        
        with self.assertRaises(IntegrityError):
            CheatDayRequest.objects.create(
                user_challenge=self.user_challenge,
                date=date.today(),
                is_approved=False
            )


class ChallengeBadgeModelTest(TestCase):
    """챌린지 배지 모델 테스트"""
    
    def test_create_challenge_badge(self):
        """챌린지 배지 생성 테스트"""
        badge = ChallengeBadge.objects.create(
            name='연속 7일 성공',
            description='7일 연속으로 챌린지를 성공한 사용자에게 부여',
            icon='🔥',
            condition_type='streak',
            condition_value=7
        )
        
        self.assertEqual(badge.name, '연속 7일 성공')
        self.assertEqual(badge.condition_type, 'streak')
        self.assertEqual(badge.condition_value, 7)
        self.assertTrue(badge.is_active)
    
    def test_badge_str_representation(self):
        """배지 문자열 표현 테스트"""
        badge = ChallengeBadge.objects.create(
            name='연속 7일 성공',
            description='7일 연속 성공',
            icon='🔥',
            condition_type='streak',
            condition_value=7
        )
        
        expected_str = "연속 7일 성공 (streak: 7)"
        self.assertEqual(str(badge), expected_str)


class UserChallengeBadgeModelTest(TestCase):
    """사용자 배지 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.badge = ChallengeBadge.objects.create(
            name='연속 7일 성공',
            description='7일 연속 성공',
            icon='🔥',
            condition_type='streak',
            condition_value=7
        )
    
    def test_create_user_badge(self):
        """사용자 배지 생성 테스트"""
        user_badge = UserChallengeBadge.objects.create(
            user=self.user,
            badge=self.badge
        )
        
        self.assertEqual(user_badge.user, self.user)
        self.assertEqual(user_badge.badge, self.badge)
        self.assertIsNotNone(user_badge.earned_at)
    
    def test_user_badge_unique_constraint(self):
        """사용자 배지 유니크 제약 테스트"""
        UserChallengeBadge.objects.create(
            user=self.user,
            badge=self.badge
        )
        
        with self.assertRaises(IntegrityError):
            UserChallengeBadge.objects.create(
                user=self.user,
                badge=self.badge
            )


class ChallengeJudgmentServiceTest(TestCase):
    """챌린지 판정 서비스 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=30,
            min_daily_meals=2,
            challenge_cutoff_time=time(23, 0)
        )
        self.service = ChallengeJudgmentService()
        self.target_date = date.today()
    
    def test_calculate_daily_calories(self):
        """일일 칼로리 계산 테스트"""
        # 테스트용 식사 기록 생성
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(8, 0),
            mealType='breakfast',
            calories=500.0,
            image_url='test.jpg'
        )
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(12, 0),
            mealType='lunch',
            calories=600.0,
            image_url='test2.jpg'
        )
        
        total_calories = self.service._calculate_daily_calories(self.user, self.target_date)
        self.assertEqual(total_calories, 1100.0)
    
    def test_count_meals(self):
        """식사 횟수 계산 테스트"""
        # 테스트용 식사 기록 생성
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(8, 0),
            mealType='breakfast',
            calories=500.0,
            image_url='test.jpg'
        )
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(12, 0),
            mealType='lunch',
            calories=600.0,
            image_url='test2.jpg'
        )
        
        meal_count = self.service._count_meals(self.user, self.target_date)
        self.assertEqual(meal_count, 2)
    
    def test_is_valid_meal_time(self):
        """유효한 식사 시간 검증 테스트"""
        # 아침 식사 시간 (6:00-11:00)
        self.assertTrue(self.service._is_valid_meal_time('breakfast', time(8, 0)))
        self.assertFalse(self.service._is_valid_meal_time('breakfast', time(12, 0)))
        
        # 점심 식사 시간 (11:00-15:00)
        self.assertTrue(self.service._is_valid_meal_time('lunch', time(12, 0)))
        self.assertFalse(self.service._is_valid_meal_time('lunch', time(16, 0)))
        
        # 저녁 식사 시간 (18:00-23:00)
        self.assertTrue(self.service._is_valid_meal_time('dinner', time(19, 0)))
        self.assertFalse(self.service._is_valid_meal_time('dinner', time(17, 0)))
    
    def test_judge_success_with_calories_only(self):
        """칼로리만으로 성공 판정 테스트"""
        # 목표 칼로리 범위 내 (성공)
        success = self.service._judge_success(
            self.user_challenge, self.target_date, 1480.0, 1500.0, 50, False
        )
        # 최소 식사 횟수를 만족하지 않으므로 실패
        self.assertFalse(success)
    
    def test_judge_success_with_cheat_day(self):
        """치팅 데이 성공 판정 테스트"""
        success = self.service._judge_success(
            self.user_challenge, self.target_date, 2000.0, 1500.0, 50, True
        )
        self.assertTrue(success)  # 치팅 데이는 무조건 성공
    
    def test_judge_daily_challenge_success(self):
        """일일 챌린지 판정 - 성공 케이스"""
        # 유효한 식사 기록 생성 (칼로리 범위 내 + 최소 식사 횟수 만족)
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(8, 0),
            mealType='breakfast',
            calories=700.0,
            image_url='test.jpg'
        )
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(12, 0),
            mealType='lunch',
            calories=800.0,
            image_url='test2.jpg'
        )
        
        daily_record = self.service.judge_daily_challenge(self.user_challenge, self.target_date)
        
        self.assertTrue(daily_record.is_success)
        self.assertEqual(daily_record.total_calories, 1500.0)
        self.assertEqual(daily_record.target_calories, 1500.0)
        self.assertFalse(daily_record.is_cheat_day)
        
        # 연속 성공 일수 증가 확인
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_streak_days, 1)
    
    def test_judge_daily_challenge_failure(self):
        """일일 챌린지 판정 - 실패 케이스"""
        # 칼로리 초과
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(8, 0),
            mealType='breakfast',
            calories=1000.0,
            image_url='test.jpg'
        )
        MealLog.objects.create(
            user=self.user,
            date=self.target_date,
            time=time(12, 0),
            mealType='lunch',
            calories=800.0,
            image_url='test2.jpg'
        )
        
        daily_record = self.service.judge_daily_challenge(self.user_challenge, self.target_date)
        
        self.assertFalse(daily_record.is_success)
        self.assertEqual(daily_record.total_calories, 1800.0)
        
        # 연속 성공 일수 초기화 확인
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_streak_days, 0)
    
    def test_update_streak_on_success(self):
        """성공 시 연속 일수 업데이트 테스트"""
        self.user_challenge.current_streak_days = 5
        self.user_challenge.max_streak_days = 5
        self.user_challenge.save()
        
        self.service._update_streak(self.user_challenge, self.target_date, True, False)
        
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_streak_days, 6)
        self.assertEqual(self.user_challenge.max_streak_days, 6)
    
    def test_update_streak_on_cheat_day(self):
        """치팅 데이 시 연속 일수 유지 테스트"""
        self.user_challenge.current_streak_days = 5
        self.user_challenge.max_streak_days = 5
        self.user_challenge.save()
        
        self.service._update_streak(self.user_challenge, self.target_date, True, True)
        
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_streak_days, 5)  # 유지
        self.assertEqual(self.user_challenge.max_streak_days, 5)
    
    def test_update_streak_on_failure(self):
        """실패 시 연속 일수 초기화 테스트"""
        self.user_challenge.current_streak_days = 5
        self.user_challenge.save()
        
        self.service._update_streak(self.user_challenge, self.target_date, False, False)
        
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_streak_days, 0)


class CheatDayServiceTest(TestCase):
    """치팅 데이 서비스 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=30,
            user_weekly_cheat_limit=2,
            current_weekly_cheat_count=0
        )
        self.service = CheatDayService()
    
    def test_request_cheat_day_success(self):
        """치팅 요청 성공 테스트"""
        target_date = date.today()
        result = self.service.request_cheat_day(self.user_challenge, target_date)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['remaining_cheats'], 1)
        
        # 치팅 요청 생성 확인
        cheat_request = CheatDayRequest.objects.get(
            user_challenge=self.user_challenge,
            date=target_date
        )
        self.assertTrue(cheat_request.is_approved)
        
        # 주간 치팅 사용 횟수 증가 확인
        self.user_challenge.refresh_from_db()
        self.assertEqual(self.user_challenge.current_weekly_cheat_count, 1)
    
    def test_request_cheat_day_limit_exceeded(self):
        """치팅 한도 초과 테스트"""
        self.user_challenge.current_weekly_cheat_count = 2  # 한도 도달
        self.user_challenge.save()
        
        target_date = date.today()
        result = self.service.request_cheat_day(self.user_challenge, target_date)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'CHEAT_LIMIT_EXCEEDED')
    
    def test_request_cheat_day_already_used(self):
        """이미 사용한 날짜 치팅 요청 테스트"""
        target_date = date.today()
        
        # 이미 치팅 요청이 승인된 상태
        CheatDayRequest.objects.create(
            user_challenge=self.user_challenge,
            date=target_date,
            is_approved=True
        )
        
        result = self.service.request_cheat_day(self.user_challenge, target_date)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'ALREADY_USED_CHEAT')
    
    def test_get_weekly_cheat_status(self):
        """주간 치팅 현황 조회 테스트"""
        self.user_challenge.current_weekly_cheat_count = 1
        self.user_challenge.save()
        
        status = self.service.get_weekly_cheat_status(self.user_challenge)
        
        self.assertEqual(status['used_count'], 1)
        self.assertEqual(status['limit'], 2)
        self.assertEqual(status['remaining'], 1)


class ChallengeStatisticsServiceTest(TestCase):
    """챌린지 통계 서비스 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='테스트 챌린지'
        )
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25,
            current_streak_days=5,
            max_streak_days=7,
            total_success_days=10,
            total_failure_days=3
        )
        self.service = ChallengeStatisticsService()
    
    def test_get_user_statistics(self):
        """사용자 통계 조회 테스트"""
        # 테스트용 일일 기록 생성
        for i in range(5):
            DailyChallengeRecord.objects.create(
                user_challenge=self.user_challenge,
                date=date.today() - timedelta(days=i),
                total_calories=1500.0,
                target_calories=1500.0,
                is_success=True,
                is_cheat_day=(i == 2)  # 하나는 치팅 데이
            )
        
        statistics = self.service.get_user_statistics(self.user_challenge)
        
        self.assertEqual(statistics['current_streak'], 5)
        self.assertEqual(statistics['max_streak'], 7)
        self.assertEqual(statistics['total_success_days'], 10)
        self.assertEqual(statistics['total_failure_days'], 3)
        self.assertEqual(statistics['remaining_days'], 25)
        self.assertEqual(statistics['cheat_days_used'], 1)
        
        # 성공률 계산 확인
        expected_success_rate = (10 / 13) * 100  # 10 성공 / 13 총일
        self.assertAlmostEqual(statistics['success_rate'], expected_success_rate, places=1)
    
    def test_get_leaderboard(self):
        """리더보드 조회 테스트"""
        # 추가 사용자들 생성
        user2 = User.objects.create_user(username='user2', email='user2@example.com')
        user3 = User.objects.create_user(username='user3', email='user3@example.com')
        
        # 다른 연속 성공 일수로 챌린지 생성
        UserChallenge.objects.create(
            user=user2,
            room=self.room,
            user_height=165.0,
            user_weight=60.0,
            user_target_weight=55.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20,
            current_streak_days=10,  # 더 높은 연속 성공
            total_success_days=15
        )
        
        UserChallenge.objects.create(
            user=user3,
            room=self.room,
            user_height=175.0,
            user_weight=80.0,
            user_target_weight=75.0,
            user_challenge_duration_days=30,
            remaining_duration_days=28,
            current_streak_days=3,  # 더 낮은 연속 성공
            total_success_days=5
        )
        
        leaderboard = self.service.get_leaderboard(self.room.id, limit=10)
        
        self.assertEqual(len(leaderboard), 3)
        
        # 연속 성공 일수 순으로 정렬 확인
        self.assertEqual(leaderboard[0]['username'], 'user2')
        self.assertEqual(leaderboard[0]['current_streak'], 10)
        self.assertEqual(leaderboard[0]['rank'], 1)
        
        self.assertEqual(leaderboard[1]['username'], 'testuser')
        self.assertEqual(leaderboard[1]['current_streak'], 5)
        self.assertEqual(leaderboard[1]['rank'], 2)
        
        self.assertEqual(leaderboard[2]['username'], 'user3')
        self.assertEqual(leaderboard[2]['current_streak'], 3)
        self.assertEqual(leaderboard[2]['rank'], 3)


class WeeklyResetServiceTest(TestCase):
    """주간 초기화 서비스 테스트"""
    
    def setUp(self):
        self.service = WeeklyResetService()
        
        # 테스트용 사용자들과 챌린지 생성
        self.users = []
        self.challenges = []
        
        for i in range(3):
            user = User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com'
            )
            self.users.append(user)
            
            room = ChallengeRoom.objects.create(
                name=f'{1500 + i*200}kcal_challenge',
                target_calorie=1500 + i*200,
                tolerance=50,
                description=f'테스트 챌린지 {i}'
            )
            
            challenge = UserChallenge.objects.create(
                user=user,
                room=room,
                user_height=170.0,
                user_weight=70.0,
                user_target_weight=65.0,
                user_challenge_duration_days=30,
                remaining_duration_days=25,
                current_weekly_cheat_count=i + 1  # 각각 다른 치팅 사용 횟수
            )
            self.challenges.append(challenge)
    
    def test_reset_weekly_cheat_counts(self):
        """주간 치팅 초기화 테스트"""
        # 초기화 전 상태 확인
        for i, challenge in enumerate(self.challenges):
            self.assertEqual(challenge.current_weekly_cheat_count, i + 1)
        
        # 초기화 실행
        updated_count = self.service.reset_weekly_cheat_counts()
        
        # 결과 확인
        self.assertEqual(updated_count, 3)
        
        # 모든 챌린지의 치팅 횟수가 0으로 초기화되었는지 확인
        for challenge in self.challenges:
            challenge.refresh_from_db()
            self.assertEqual(challenge.current_weekly_cheat_count, 0)
    
    def test_reset_only_active_challenges(self):
        """활성 챌린지만 초기화 테스트"""
        # 하나의 챌린지를 비활성화
        self.challenges[0].status = 'inactive'
        self.challenges[0].save()
        
        updated_count = self.service.reset_weekly_cheat_counts()
        
        # 활성 챌린지만 초기화되었는지 확인 (2개)
        self.assertEqual(updated_count, 2)
        
        # 비활성 챌린지는 초기화되지 않음
        self.challenges[0].refresh_from_db()
        self.assertEqual(self.challenges[0].current_weekly_cheat_count, 1)
        
        # 활성 챌린지들은 초기화됨
        for challenge in self.challenges[1:]:
            challenge.refresh_from_db()
            self.assertEqual(challenge.current_weekly_cheat_count, 0)
fr
om rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
import json


class ChallengeAPITestCase(APITestCase):
    """챌린지 API 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 테스트용 챌린지 방 생성
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='1500칼로리 챌린지',
            is_active=True
        )
        
        # 인증 설정 (필요시)
        # self.client.force_authenticate(user=self.user)


class ChallengeRoomAPITest(ChallengeAPITestCase):
    """챌린지 방 API 테스트"""
    
    def test_list_challenge_rooms(self):
        """챌린지 방 목록 조회 테스트"""
        # 추가 챌린지 방 생성
        ChallengeRoom.objects.create(
            name='1800kcal_challenge',
            target_calorie=1800,
            tolerance=50,
            description='1800칼로리 챌린지',
            is_active=True
        )
        
        url = '/api/challenges/rooms/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], '1500kcal_challenge')
        self.assertEqual(data[1]['name'], '1800kcal_challenge')
    
    def test_list_only_active_rooms(self):
        """활성 챌린지 방만 조회 테스트"""
        # 비활성 챌린지 방 생성
        ChallengeRoom.objects.create(
            name='inactive_challenge',
            target_calorie=2000,
            tolerance=50,
            description='비활성 챌린지',
            is_active=False
        )
        
        url = '/api/challenges/rooms/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # 활성 방만 반환되는지 확인
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], '1500kcal_challenge')
    
    def test_get_challenge_room_detail(self):
        """챌린지 방 상세 조회 테스트"""
        url = f'/api/challenges/rooms/{self.room.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        self.assertEqual(data['id'], self.room.id)
        self.assertEqual(data['name'], '1500kcal_challenge')
        self.assertEqual(data['target_calorie'], 1500)
        self.assertEqual(data['tolerance'], 50)


class JoinChallengeAPITest(ChallengeAPITestCase):
    """챌린지 참여 API 테스트"""
    
    def test_join_challenge_success(self):
        """챌린지 참여 성공 테스트"""
        url = '/api/challenges/join/'
        data = {
            'room': self.room.id,
            'user_height': 170.0,
            'user_weight': 70.0,
            'user_target_weight': 65.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        self.assertIn('data', response_data)
        
        # 데이터베이스에 챌린지가 생성되었는지 확인
        challenge = UserChallenge.objects.get(room=self.room)
        self.assertEqual(challenge.user_height, 170.0)
        self.assertEqual(challenge.user_weight, 70.0)
        self.assertEqual(challenge.status, 'active')
    
    def test_join_challenge_validation_error(self):
        """챌린지 참여 검증 오류 테스트"""
        url = '/api/challenges/join/'
        data = {
            'room': self.room.id,
            'user_height': 50.0,  # 너무 작은 키
            'user_weight': 70.0,
            'user_target_weight': 65.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.json()
        
        self.assertFalse(response_data['success'])
        self.assertEqual(response_data['error'], 'VALIDATION_ERROR')
    
    def test_join_challenge_already_participating(self):
        """이미 참여 중인 챌린지 참여 시도 테스트"""
        # 먼저 챌린지에 참여
        UserChallenge.objects.create(
            user=User.objects.get(username='test_user'),
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=30,
            status='active'
        )
        
        url = '/api/challenges/join/'
        data = {
            'room': self.room.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 1
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.json()
        
        self.assertFalse(response_data['success'])
        self.assertEqual(response_data['error'], 'ALREADY_IN_CHALLENGE')


class MyChallengeAPITest(ChallengeAPITestCase):
    """내 챌린지 현황 API 테스트"""
    
    def test_get_my_challenge_with_active_challenge(self):
        """활성 챌린지가 있는 경우 현황 조회 테스트"""
        # 테스트 사용자의 활성 챌린지 생성
        test_user = User.objects.get(username='test_user')
        UserChallenge.objects.create(
            user=test_user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25,
            current_streak_days=5,
            status='active'
        )
        
        url = '/api/challenges/my/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        self.assertTrue(response_data['data']['has_active_challenge'])
        self.assertEqual(len(response_data['data']['active_challenges']), 1)
        
        challenge_data = response_data['data']['active_challenges'][0]
        self.assertEqual(challenge_data['room_name'], '1500kcal_challenge')
        self.assertEqual(challenge_data['current_streak_days'], 5)
        self.assertEqual(challenge_data['remaining_duration_days'], 25)
    
    def test_get_my_challenge_no_active_challenge(self):
        """활성 챌린지가 없는 경우 현황 조회 테스트"""
        url = '/api/challenges/my/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        self.assertFalse(response_data['data']['has_active_challenge'])
        self.assertEqual(len(response_data['data']['active_challenges']), 0)


class CheatDayAPITest(ChallengeAPITestCase):
    """치팅 데이 API 테스트"""
    
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)
        
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25,
            user_weekly_cheat_limit=2,
            current_weekly_cheat_count=0,
            status='active'
        )
    
    def test_request_cheat_day_success(self):
        """치팅 요청 성공 테스트"""
        url = '/api/challenges/cheat/'
        data = {
            'date': date.today().isoformat(),
            'challenge_id': self.user_challenge.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['data']['remaining_cheats'], 1)
        
        # 치팅 요청이 생성되었는지 확인
        cheat_request = CheatDayRequest.objects.get(
            user_challenge=self.user_challenge,
            date=date.today()
        )
        self.assertTrue(cheat_request.is_approved)
    
    def test_get_cheat_status(self):
        """치팅 현황 조회 테스트"""
        # 치팅 사용
        self.user_challenge.current_weekly_cheat_count = 1
        self.user_challenge.save()
        
        url = '/api/challenges/cheat/status/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        cheat_status = response_data['data']['weekly_cheat_status']
        
        self.assertEqual(cheat_status['used_count'], 1)
        self.assertEqual(cheat_status['limit'], 2)
        self.assertEqual(cheat_status['remaining'], 1)


class LeaderboardAPITest(ChallengeAPITestCase):
    """리더보드 API 테스트"""
    
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)
        
        # 테스트용 참여자들 생성
        self.participants = []
        for i in range(3):
            user = User.objects.create_user(
                username=f'participant{i}',
                email=f'participant{i}@example.com'
            )
            
            challenge = UserChallenge.objects.create(
                user=user,
                room=self.room,
                user_height=170.0,
                user_weight=70.0,
                user_target_weight=65.0,
                user_challenge_duration_days=30,
                remaining_duration_days=25,
                current_streak_days=10 - i * 2,  # 10, 8, 6
                total_success_days=15 - i * 2,
                status='active'
            )
            self.participants.append(challenge)
    
    def test_get_leaderboard(self):
        """리더보드 조회 테스트"""
        url = f'/api/challenges/leaderboard/{self.room.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        leaderboard = response_data['data']['leaderboard']
        
        self.assertEqual(len(leaderboard), 3)
        
        # 연속 성공 일수 순으로 정렬되었는지 확인
        self.assertEqual(leaderboard[0]['username'], 'participant0')
        self.assertEqual(leaderboard[0]['current_streak'], 10)
        self.assertEqual(leaderboard[0]['rank'], 1)
        
        self.assertEqual(leaderboard[1]['username'], 'participant1')
        self.assertEqual(leaderboard[1]['current_streak'], 8)
        self.assertEqual(leaderboard[1]['rank'], 2)
        
        self.assertEqual(leaderboard[2]['username'], 'participant2')
        self.assertEqual(leaderboard[2]['current_streak'], 6)
        self.assertEqual(leaderboard[2]['rank'], 3)


class PersonalStatsAPITest(ChallengeAPITestCase):
    """개인 통계 API 테스트"""
    
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)
        
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20,
            current_streak_days=5,
            max_streak_days=8,
            total_success_days=12,
            total_failure_days=3,
            status='active'
        )
        
        # 테스트용 일일 기록 생성
        for i in range(5):
            DailyChallengeRecord.objects.create(
                user_challenge=self.user_challenge,
                date=date.today() - timedelta(days=i),
                total_calories=1500.0,
                target_calories=1500.0,
                is_success=True,
                is_cheat_day=(i == 2)
            )
    
    def test_get_personal_stats(self):
        """개인 통계 조회 테스트"""
        url = '/api/challenges/stats/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        statistics = response_data['data']['statistics']
        
        self.assertEqual(statistics['current_streak'], 5)
        self.assertEqual(statistics['max_streak'], 8)
        self.assertEqual(statistics['total_success_days'], 12)
        self.assertEqual(statistics['total_failure_days'], 3)
        self.assertEqual(statistics['remaining_days'], 20)
        self.assertEqual(statistics['cheat_days_used'], 1)


class DailyChallengeJudgmentAPITest(ChallengeAPITestCase):
    """일일 챌린지 판정 API 테스트"""
    
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)
        
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25,
            status='active'
        )
    
    def test_daily_judgment_success(self):
        """일일 판정 성공 테스트"""
        # 테스트용 식사 기록 생성
        MealLog.objects.create(
            user=self.user,
            date=date.today(),
            time=time(8, 0),
            mealType='breakfast',
            calories=700.0,
            image_url='test.jpg'
        )
        MealLog.objects.create(
            user=self.user,
            date=date.today(),
            time=time(12, 0),
            mealType='lunch',
            calories=800.0,
            image_url='test2.jpg'
        )
        
        url = '/api/challenges/judge/'
        data = {
            'date': date.today().isoformat(),
            'challenge_id': self.user_challenge.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        results = response_data['data']['results']
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['is_success'])
        self.assertEqual(results[0]['total_calories'], 1500.0)
        self.assertEqual(results[0]['current_streak'], 1)


class WeeklyResetAPITest(ChallengeAPITestCase):
    """주간 초기화 API 테스트"""
    
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.user)
        
        # 테스트용 챌린지들 생성 (치팅 사용 상태)
        for i in range(3):
            user = User.objects.create_user(
                username=f'resetuser{i}',
                email=f'resetuser{i}@example.com'
            )
            
            UserChallenge.objects.create(
                user=user,
                room=self.room,
                user_height=170.0,
                user_weight=70.0,
                user_target_weight=65.0,
                user_challenge_duration_days=30,
                remaining_duration_days=25,
                current_weekly_cheat_count=i + 1,  # 1, 2, 3
                status='active'
            )
    
    def test_weekly_reset(self):
        """주간 초기화 테스트"""
        url = '/api/challenges/reset/weekly/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['data']['updated_challenges'], 3)
        
        # 모든 활성 챌린지의 치팅 횟수가 초기화되었는지 확인
        active_challenges = UserChallenge.objects.filter(status='active')
        for challenge in active_challenges:
            self.assertEqual(challenge.current_weekly_cheat_count, 0)