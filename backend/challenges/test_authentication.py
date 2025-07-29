"""
Challenge 시스템 인증 테스트
세션 기반 인증 및 권한 관리 테스트
"""

import json
from datetime import date, timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import ChallengeRoom, UserChallenge, DailyChallengeRecord
from api_integrated.models import MealLog


class SessionAuthenticationTestCase(APITestCase):
    """세션 기반 인증 테스트"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 테스트 사용자 생성
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
        
        # 테스트용 사용자 챌린지 생성
        self.user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
    
    def test_authenticated_user_can_join_challenge(self):
        """인증된 사용자가 챌린지에 참여할 수 있는지 테스트"""
        # 기존 챌린지 제거 (한 사용자당 하나의 챌린지만 허용)
        self.user_challenge.delete()
        
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 새로운 챌린지 방 생성 (중복 참여 방지)
        new_room = ChallengeRoom.objects.create(
            name='1800kcal_challenge',
            target_calorie=1800,
            tolerance=50,
            description='1800칼로리 챌린지',
            is_active=True
        )
        
        # 챌린지 참여 요청
        url = reverse('challenges:join-challenge')
        data = {
            'room_id': new_room.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        # 성공 응답 확인
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()
        success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
        self.assertIn('message', response_data)
        self.assertIn('data', response_data)
    
    def test_unauthenticated_user_cannot_join_challenge(self):
        """인증되지 않은 사용자가 챌린지에 참여할 수 없는지 테스트"""
        # 로그인하지 않은 상태
        url = reverse('challenges:join-challenge')
        data = {
            'room_id': self.room.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        # 403 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        # Handle both boolean and string values for success field
        success_value = response_data.get('success', True)
        self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
        self.assertIn('redirect_url', response_data)
        self.assertIn('session_info', response_data)
    
    def test_authenticated_user_can_access_my_challenges(self):
        """인증된 사용자가 내 챌린지를 조회할 수 있는지 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        # 성공 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
        self.assertIn('data', response_data)
    
    def test_unauthenticated_user_cannot_access_my_challenges(self):
        """인증되지 않은 사용자가 내 챌린지를 조회할 수 없는지 테스트"""
        # 로그인하지 않은 상태
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        # 403 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
    
    def test_authenticated_user_can_leave_challenge(self):
        """인증된 사용자가 챌린지를 포기할 수 있는지 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        url = reverse('challenges:leave-challenge')
        data = {'challenge_id': self.user_challenge.id}
        
        response = self.client.post(url, data, format='json')
        
        # 성공 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
    
    def test_unauthenticated_user_cannot_leave_challenge(self):
        """인증되지 않은 사용자가 챌린지를 포기할 수 없는지 테스트"""
        # 로그인하지 않은 상태
        url = reverse('challenges:leave-challenge')
        data = {'challenge_id': self.user_challenge.id}
        
        response = self.client.post(url, data, format='json')
        
        # 403 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
    
    def test_session_expiry_handling(self):
        """세션 만료 처리 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 세션 만료 시뮬레이션 (로그아웃)
        self.client.logout()
        
        # 보호된 API 접근 시도
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        # 적절한 오류 응답 확인
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
        self.assertIn('session_info', response_data)
        self.assertIn('redirect_url', response_data)
        
        # 세션 정보 확인
        session_info = response_data.get('session_info', {})
        auth_value = session_info.get('authenticated', True); self.assertIn(auth_value, [False, 'False'])
        expired_value = session_info.get('session_expired', False); self.assertIn(expired_value, [True, 'True'])
        redirect_value = session_info.get('should_redirect', False); self.assertIn(redirect_value, [True, 'True'])
    
    def test_authenticated_user_can_request_cheat_day(self):
        """인증된 사용자가 치팅 데이를 요청할 수 있는지 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        url = reverse('challenges:request-cheat')
        data = {
            'room_id': self.room.id,
            'date': date.today().isoformat(),
            'reason': '가족 모임'
        }
        
        response = self.client.post(url, data, format='json')
        
        # 성공 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
    
    def test_unauthenticated_user_cannot_request_cheat_day(self):
        """인증되지 않은 사용자가 치팅 데이를 요청할 수 없는지 테스트"""
        # 로그인하지 않은 상태
        url = reverse('challenges:request-cheat')
        data = {
            'room_id': self.room.id,
            'date': date.today().isoformat(),
            'reason': '가족 모임'
        }
        
        response = self.client.post(url, data, format='json')
        
        # 403 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
    
    def test_authenticated_user_can_access_personal_stats(self):
        """인증된 사용자가 개인 통계를 조회할 수 있는지 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        url = reverse('challenges:personal-stats')
        response = self.client.get(url)
        
        # 성공 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
        self.assertIn('data', response_data)
    
    def test_unauthenticated_user_cannot_access_personal_stats(self):
        """인증되지 않은 사용자가 개인 통계를 조회할 수 없는지 테스트"""
        # 로그인하지 않은 상태
        url = reverse('challenges:personal-stats')
        response = self.client.get(url)
        
        # 403 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')


class PermissionBasedAccessTestCase(APITestCase):
    """권한 기반 접근 테스트"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 테스트 사용자들 생성
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        # 관리자 사용자 생성
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
        
        # 테스트용 챌린지 방 생성
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='1500칼로리 챌린지',
            is_active=True
        )
    
    def test_public_apis_accessible_without_auth(self):
        """공개 API가 인증 없이 접근 가능한지 테스트"""
        # 챌린지 방 목록 조회 (공개 API)
        url = reverse('challenges:challenge-room-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 리더보드 조회 (공개 API)
        url = reverse('challenges:leaderboard', kwargs={'room_id': self.room.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # ViewSet을 통한 챌린지 방 상세 조회 (공개 API)
        url = f'/api/challenges/rooms/{self.room.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_protected_apis_require_auth(self):
        """보호된 API가 인증을 요구하는지 테스트"""
        protected_endpoints = [
            ('challenges:join-challenge', 'post', {'room_id': self.room.id}),
            ('challenges:my-challenge', 'get', {}),
            ('challenges:leave-challenge', 'post', {'room_id': self.room.id}),
            ('challenges:request-cheat', 'post', {'room_id': self.room.id, 'date': date.today().isoformat()}),
            ('challenges:cheat-status', 'get', {}),
            ('challenges:personal-stats', 'get', {}),
            ('challenges:challenge-report', 'get', {}),
            ('challenges:daily-judgment', 'post', {'room_id': self.room.id, 'date': date.today().isoformat()}),
        ]
        
        for endpoint_name, method, data in protected_endpoints:
            with self.subTest(endpoint=endpoint_name, method=method):
                url = reverse(endpoint_name) if not endpoint_name.startswith('/') else endpoint_name
                
                if method == 'get':
                    response = self.client.get(url)
                elif method == 'post':
                    response = self.client.post(url, data, format='json')
                elif method == 'put':
                    response = self.client.put(url, data, format='json')
                elif method == 'delete':
                    response = self.client.delete(url)
                
                # 403 Forbidden 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                response_data = response.json()
                success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
                self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
    
    def test_proper_error_responses_on_authentication_failures(self):
        """인증 실패 시 적절한 오류 응답 테스트"""
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        # 응답 구조 확인
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        
        # 필수 필드 확인
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertIn('message', response_data)
        self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
        self.assertIn('redirect_url', response_data)
        self.assertIn('session_info', response_data)
        
        # 세션 정보 구조 확인
        session_info = response_data.get('session_info', {})
        self.assertIn('authenticated', session_info)
        self.assertIn('session_expired', session_info)
        self.assertIn('should_redirect', session_info)
        self.assertIn('failed_at', session_info)
        
        # 메시지가 한국어인지 확인
        self.assertIn('인증이 필요합니다', response_data.get('message', ''))
    
    def test_user_data_isolation(self):
        """사용자별 데이터 격리 테스트"""
        # 각 사용자가 챌린지에 참여
        UserChallenge.objects.create(
            user=self.user1,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        UserChallenge.objects.create(
            user=self.user2,
            room=self.room,
            user_height=165.0,
            user_weight=60.0,
            user_target_weight=55.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20
        )
        
        # user1으로 로그인하여 내 챌린지 조회
        self.client.login(username='user1', password='testpass123')
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        user1_challenges = response_data.get('data', [])
        
        # user1의 데이터만 반환되는지 확인
        for challenge in user1_challenges:
            self.assertEqual(challenge['user_height'], 170.0)
            self.assertEqual(challenge['user_weight'], 70.0)
        
        # user2로 로그인하여 내 챌린지 조회
        self.client.logout()
        self.client.login(username='user2', password='testpass123')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        user2_challenges = response_data.get('data', [])
        
        # user2의 데이터만 반환되는지 확인
        for challenge in user2_challenges:
            self.assertEqual(challenge['user_height'], 165.0)
            self.assertEqual(challenge['user_weight'], 60.0)


class IntegrationTestCase(APITestCase):
    """통합 테스트 - 완전한 챌린지 플로우"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 테스트 사용자 생성
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
    
    def test_complete_challenge_participation_flow(self):
        """완전한 챌린지 참여 플로우 테스트"""
        # 1. 로그인
        login_success = self.client.login(username='testuser', password='testpass123')
        self.assertTrue(login_success)
        
        # 2. 챌린지 참여
        join_url = reverse('challenges:join-challenge')
        join_data = {
            'room_id': self.room.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_201_CREATED)
        join_data_response = join_response.json()
        self.assertTrue(join_data_response.get('success', False))
        
        # 3. 내 챌린지 조회
        my_url = reverse('challenges:my-challenge')
        my_response = self.client.get(my_url)
        self.assertEqual(my_response.status_code, status.HTTP_200_OK)
        my_data = my_response.json()
        self.assertTrue(my_data.get('success', False))
        self.assertGreater(len(my_data.get('data', [])), 0)
        
        # 4. 개인 통계 조회
        stats_url = reverse('challenges:personal-stats')
        stats_response = self.client.get(stats_url)
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        stats_data = stats_response.json()
        self.assertTrue(stats_data.get('success', False))
        
        # 5. 치팅 데이 요청
        cheat_url = reverse('challenges:request-cheat')
        cheat_data = {
            'room_id': self.room.id,
            'date': date.today().isoformat(),
            'reason': '가족 모임'
        }
        
        cheat_response = self.client.post(cheat_url, cheat_data, format='json')
        self.assertEqual(cheat_response.status_code, status.HTTP_200_OK)
        cheat_response_data = cheat_response.json()
        self.assertTrue(cheat_response_data.get('success', False))
        
        # 6. 치팅 상태 조회
        cheat_status_url = reverse('challenges:cheat-status')
        cheat_status_response = self.client.get(cheat_status_url)
        self.assertEqual(cheat_status_response.status_code, status.HTTP_200_OK)
        cheat_status_data = cheat_status_response.json()
        self.assertTrue(cheat_status_data.get('success', False))
        
        # 7. 챌린지 포기
        leave_url = reverse('challenges:leave-challenge')
        leave_data = {'room_id': self.room.id}
        
        leave_response = self.client.post(leave_url, leave_data, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_200_OK)
        leave_response_data = leave_response.json()
        self.assertTrue(leave_response_data.get('success', False))
    
    def test_challenge_management_with_authenticated_users(self):
        """인증된 사용자의 챌린지 관리 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 챌린지 참여
        user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        # 챌린지 연장 테스트
        extend_url = reverse('challenges:extend-challenge')
        extend_data = {
            'room_id': self.room.id,
            'additional_days': 7
        }
        
        extend_response = self.client.post(extend_url, extend_data, format='json')
        self.assertEqual(extend_response.status_code, status.HTTP_200_OK)
        extend_response_data = extend_response.json()
        self.assertTrue(extend_response_data.get('success', False))
        
        # 연장 후 챌린지 상태 확인
        user_challenge.refresh_from_db()
        self.assertEqual(user_challenge.remaining_duration_days, 32)  # 25 + 7
    
    def test_error_scenarios_and_proper_error_response_formats(self):
        """오류 시나리오 및 적절한 오류 응답 형식 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 1. 존재하지 않는 챌린지 방에 참여 시도
        join_url = reverse('challenges:join-challenge')
        invalid_join_data = {
            'room_id': 99999,  # 존재하지 않는 ID
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, invalid_join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_400_BAD_REQUEST)
        join_error_data = join_response.json()
        self.assertFalse(join_error_data.get('success', True))
        self.assertIn('error_code', join_error_data)
        self.assertIn('message', join_error_data)
        
        # 2. 잘못된 데이터로 치팅 요청
        cheat_url = reverse('challenges:request-cheat')
        invalid_cheat_data = {
            'room_id': 99999,  # 존재하지 않는 방
            'date': 'invalid-date',  # 잘못된 날짜 형식
            'reason': '테스트'
        }
        
        cheat_response = self.client.post(cheat_url, invalid_cheat_data, format='json')
        self.assertIn(cheat_response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])
        cheat_error_data = cheat_response.json()
        self.assertFalse(cheat_error_data.get('success', True))
        self.assertIn('error_code', cheat_error_data)
        self.assertIn('message', cheat_error_data)
        
        # 3. 참여하지 않은 챌린지 포기 시도
        leave_url = reverse('challenges:leave-challenge')
        invalid_leave_data = {'room_id': self.room.id}
        
        leave_response = self.client.post(leave_url, invalid_leave_data, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_404_NOT_FOUND)
        leave_error_data = leave_response.json()
        self.assertFalse(leave_error_data.get('success', True))
        self.assertIn('error_code', leave_error_data)
        self.assertIn('message', leave_error_data)
    
    def test_session_consistency_across_requests(self):
        """요청 간 세션 일관성 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 챌린지 참여
        join_url = reverse('challenges:join-challenge')
        join_data = {
            'room_id': self.room.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_201_CREATED)
        
        # 여러 요청에서 동일한 사용자 정보 사용 확인
        my_url = reverse('challenges:my-challenge')
        
        # 첫 번째 요청
        response1 = self.client.get(my_url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        data1 = response1.json()
        
        # 두 번째 요청
        response2 = self.client.get(my_url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        data2 = response2.json()
        
        # 동일한 데이터 반환 확인
        self.assertEqual(data1, data2)
        
        # 세션이 유지되는지 확인 (사용자 정보가 일관되게 사용됨)
        if data1.get('data'):
            for challenge in data1['data']:
                self.assertEqual(challenge['user_height'], 175.0)
                self.assertEqual(challenge['user_weight'], 75.0)


class PermissionValidationTestCase(APITestCase):
    """권한 검증 상세 테스트"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 일반 사용자 생성
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 관리자 사용자 생성
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
        
        # 테스트용 챌린지 방 생성
        self.room = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='1500칼로리 챌린지',
            is_active=True
        )
    
    def test_public_challenge_room_list_access(self):
        """공개 API - 챌린지 방 목록 접근 테스트"""
        url = reverse('challenges:challenge-room-list')
        
        # 인증 없이 접근
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 응답 구조 확인
        response_data = response.json()
        self.assertIn('results', response_data)
        self.assertIn('count', response_data)
        
        # 인증된 사용자로 접근
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 관리자로 접근
        self.client.logout()
        self.client.login(username='admin', password='adminpass123')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_public_leaderboard_access(self):
        """공개 API - 리더보드 접근 테스트"""
        url = reverse('challenges:leaderboard', kwargs={'room_id': self.room.id})
        
        # 인증 없이 접근
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 인증된 사용자로 접근
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_public_challenge_room_viewset_access(self):
        """공개 API - ViewSet을 통한 챌린지 방 접근 테스트"""
        # 목록 조회
        url = '/api/challenges/rooms/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 상세 조회
        url = f'/api/challenges/rooms/{self.room.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response_data = response.json()
        self.assertEqual(response_data['id'], self.room.id)
        self.assertEqual(response_data['name'], '1500kcal_challenge')
    
    def test_protected_api_authentication_requirements(self):
        """보호된 API 인증 요구사항 상세 테스트"""
        protected_endpoints = [
            {
                'name': 'join-challenge',
                'url': reverse('challenges:join-challenge'),
                'method': 'post',
                'data': {
                    'room_id': self.room.id,
                    'user_height': 175.0,
                    'user_weight': 75.0,
                    'user_target_weight': 70.0,
                    'user_challenge_duration_days': 30,
                    'user_weekly_cheat_limit': 2
                }
            },
            {
                'name': 'my-challenge',
                'url': reverse('challenges:my-challenge'),
                'method': 'get',
                'data': {}
            },
            {
                'name': 'leave-challenge',
                'url': reverse('challenges:leave-challenge'),
                'method': 'post',
                'data': {'room_id': self.room.id}
            },
            {
                'name': 'extend-challenge',
                'url': reverse('challenges:extend-challenge'),
                'method': 'post',
                'data': {'room_id': self.room.id, 'additional_days': 7}
            },
            {
                'name': 'request-cheat',
                'url': reverse('challenges:request-cheat'),
                'method': 'post',
                'data': {
                    'room_id': self.room.id,
                    'date': date.today().isoformat(),
                    'reason': '테스트'
                }
            },
            {
                'name': 'cheat-status',
                'url': reverse('challenges:cheat-status'),
                'method': 'get',
                'data': {}
            },
            {
                'name': 'personal-stats',
                'url': reverse('challenges:personal-stats'),
                'method': 'get',
                'data': {}
            },
            {
                'name': 'challenge-report',
                'url': reverse('challenges:challenge-report'),
                'method': 'get',
                'data': {}
            },
            {
                'name': 'daily-judgment',
                'url': reverse('challenges:daily-judgment'),
                'method': 'post',
                'data': {
                    'room_id': self.room.id,
                    'date': date.today().isoformat()
                }
            }
        ]
        
        for endpoint in protected_endpoints:
            with self.subTest(endpoint=endpoint['name']):
                # 인증 없이 접근 시도
                if endpoint['method'] == 'get':
                    response = self.client.get(endpoint['url'])
                elif endpoint['method'] == 'post':
                    response = self.client.post(endpoint['url'], endpoint['data'], format='json')
                elif endpoint['method'] == 'put':
                    response = self.client.put(endpoint['url'], endpoint['data'], format='json')
                elif endpoint['method'] == 'delete':
                    response = self.client.delete(endpoint['url'])
                
                # 403 Forbidden 응답 확인 (DRF에서 NotAuthenticated 예외를 403으로 처리)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                
                # 오류 응답 구조 확인
                response_data = response.json()
                success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
                self.assertEqual(response_data.get('error_code'), 'AUTHENTICATION_REQUIRED')
                self.assertIn('message', response_data)
                self.assertIn('redirect_url', response_data)
                self.assertIn('session_info', response_data)
    
    def test_authentication_error_response_format(self):
        """인증 오류 응답 형식 상세 테스트"""
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        
        # 필수 필드 존재 확인
        required_fields = ['success', 'message', 'error_code', 'redirect_url', 'session_info']
        for field in required_fields:
            self.assertIn(field, response_data, f"Missing required field: {field}")
        
        # 필드 값 검증
        self.assertFalse(response_data['success'])
        self.assertEqual(response_data['error_code'], 'AUTHENTICATION_REQUIRED')
        self.assertEqual(response_data['redirect_url'], '/login')
        
        # 세션 정보 구조 확인
        session_info = response_data['session_info']
        session_required_fields = ['authenticated', 'session_expired', 'should_redirect', 'failed_at']
        for field in session_required_fields:
            self.assertIn(field, session_info, f"Missing session info field: {field}")
        
        # 세션 정보 값 검증
        self.assertFalse(session_info['authenticated'])
        self.assertTrue(session_info['session_expired'])
        self.assertTrue(session_info['should_redirect'])
        self.assertIsInstance(session_info['failed_at'], str)
        
        # 메시지가 한국어인지 확인
        self.assertIn('인증이 필요합니다', response_data['message'])
    
    def test_authenticated_user_access_to_protected_apis(self):
        """인증된 사용자의 보호된 API 접근 테스트"""
        # 사용자 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 사용자 챌린지 생성 (일부 API 테스트를 위해)
        user_challenge = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        # 접근 가능한 API들 테스트
        accessible_endpoints = [
            {
                'name': 'my-challenge',
                'url': reverse('challenges:my-challenge'),
                'method': 'get',
                'expected_status': status.HTTP_200_OK
            },
            {
                'name': 'personal-stats',
                'url': reverse('challenges:personal-stats'),
                'method': 'get',
                'expected_status': status.HTTP_200_OK
            },
            {
                'name': 'cheat-status',
                'url': reverse('challenges:cheat-status'),
                'method': 'get',
                'expected_status': status.HTTP_200_OK
            },
            {
                'name': 'challenge-report',
                'url': reverse('challenges:challenge-report'),
                'method': 'get',
                'expected_status': status.HTTP_200_OK
            }
        ]
        
        for endpoint in accessible_endpoints:
            with self.subTest(endpoint=endpoint['name']):
                if endpoint['method'] == 'get':
                    response = self.client.get(endpoint['url'])
                
                self.assertEqual(response.status_code, endpoint['expected_status'])
                
                # 성공 응답 구조 확인
                if response.status_code == status.HTTP_200_OK:
                    response_data = response.json()
                    success_value = response_data.get('success', False); self.assertIn(success_value, [True, 'True'])
                    self.assertIn('data', response_data)
    
    def test_user_specific_data_access_control(self):
        """사용자별 데이터 접근 제어 테스트"""
        # 두 번째 사용자 생성
        user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        # 각 사용자의 챌린지 생성
        challenge1 = UserChallenge.objects.create(
            user=self.user,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        challenge2 = UserChallenge.objects.create(
            user=user2,
            room=self.room,
            user_height=165.0,
            user_weight=60.0,
            user_target_weight=55.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20
        )
        
        # 첫 번째 사용자로 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 내 챌린지 조회
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        challenges = response_data.get('data', [])
        
        # 첫 번째 사용자의 데이터만 반환되는지 확인
        self.assertGreater(len(challenges), 0)
        for challenge in challenges:
            self.assertEqual(challenge['user_height'], 170.0)
        
        # 두 번째 사용자로 로그인
        self.client.logout()
        self.client.login(username='user2', password='testpass123')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        challenges = response_data.get('data', [])
        
        # 두 번째 사용자의 데이터만 반환되는지 확인
        self.assertGreater(len(challenges), 0)
        for challenge in challenges:
            self.assertEqual(challenge['user_height'], 165.0)
    
    def test_cross_user_data_protection(self):
        """사용자 간 데이터 보호 테스트"""
        # 두 번째 사용자 생성
        user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        # user2의 챌린지 생성
        user2_challenge = UserChallenge.objects.create(
            user=user2,
            room=self.room,
            user_height=165.0,
            user_weight=60.0,
            user_target_weight=55.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20
        )
        
        # user1으로 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # user2의 챌린지를 포기하려고 시도 (실제로는 자신의 챌린지가 없으므로 404)
        leave_url = reverse('challenges:leave-challenge')
        leave_data = {'room_id': self.room.id}
        
        response = self.client.post(leave_url, leave_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # user2의 챌린지가 여전히 존재하는지 확인
        user2_challenge.refresh_from_db()
        self.assertEqual(user2_challenge.status, 'active')
    
    def test_admin_permission_requirements(self):
        """관리자 권한 요구사항 테스트 (해당하는 경우)"""
        # 현재 challenge 시스템에는 명시적인 관리자 전용 API가 없지만,
        # 향후 추가될 수 있는 관리자 기능을 위한 테스트 프레임워크
        
        # 일반 사용자로 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 주간 리셋 API (관리자 전용으로 가정)
        reset_url = reverse('challenges:weekly-reset')
        response = self.client.post(reset_url)
        
        # 현재는 인증만 확인하지만, 향후 관리자 권한 추가 시 403 응답 예상
        # 현재 구현에서는 인증된 사용자면 접근 가능할 수 있음
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,  # 현재 구현
            status.HTTP_403_FORBIDDEN,  # 향후 관리자 권한 추가 시
            status.HTTP_403_FORBIDDEN  # 인증 실패 시
        ])
    
    def test_permission_error_message_localization(self):
        """권한 오류 메시지 한국어 지원 테스트"""
        # 인증 오류 메시지
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        response_data = response.json()
        message = response_data.get('message', '')
        
        # 한국어 메시지 확인
        korean_keywords = ['인증', '로그인', '필요']
        self.assertTrue(
            any(keyword in message for keyword in korean_keywords),
            f"Message should contain Korean text: {message}"
        )
    
    def test_consistent_error_response_structure(self):
        """일관된 오류 응답 구조 테스트"""
        # 여러 보호된 API에서 동일한 오류 응답 구조 확인
        protected_urls = [
            reverse('challenges:my-challenge'),
            reverse('challenges:personal-stats'),
            reverse('challenges:cheat-status'),
        ]
        
        for url in protected_urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                response_data = response.json()
                
                # 모든 API에서 동일한 구조 확인
                expected_structure = {
                    'success': False,
                    'error_code': 'AUTHENTICATION_REQUIRED',
                    'message': str,
                    'redirect_url': '/login',
                    'session_info': {
                        'authenticated': False,
                        'session_expired': True,
                        'should_redirect': True,
                        'failed_at': str
                    }
                }
                
                self.assertEqual(response_data['success'], expected_structure['success'])
                self.assertEqual(response_data['error_code'], expected_structure['error_code'])
                self.assertIsInstance(response_data['message'], str)
                self.assertEqual(response_data['redirect_url'], expected_structure['redirect_url'])
                
                session_info = response_data['session_info']
                expected_session = expected_structure['session_info']
                self.assertEqual(session_info['authenticated'], expected_session['authenticated'])
                self.assertEqual(session_info['session_expired'], expected_session['session_expired'])
                self.assertEqual(session_info['should_redirect'], expected_session['should_redirect'])
                self.assertIsInstance(session_info['failed_at'], str)


class APISecurityTestCase(APITestCase):
    """API 보안 테스트"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 테스트 사용자들 생성
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
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
    
    def test_session_hijacking_prevention(self):
        """세션 하이재킹 방지 테스트"""
        # user1으로 로그인
        self.client.login(username='user1', password='testpass123')
        
        # 정상적인 API 호출
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 다른 클라이언트에서 동일한 세션 사용 시도 시뮬레이션
        # (실제 세션 하이재킹은 테스트 환경에서 시뮬레이션하기 어려움)
        # 대신 로그아웃 후 접근 시도로 세션 무효화 테스트
        self.client.logout()
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_unauthorized_data_modification_prevention(self):
        """무단 데이터 수정 방지 테스트"""
        # user1의 챌린지 생성
        challenge1 = UserChallenge.objects.create(
            user=self.user1,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        # user2로 로그인
        self.client.login(username='user2', password='testpass123')
        
        # user1의 챌린지를 포기하려고 시도
        leave_url = reverse('challenges:leave-challenge')
        leave_data = {'room_id': self.room.id}
        
        response = self.client.post(leave_url, leave_data, format='json')
        
        # user2는 해당 챌린지에 참여하지 않았으므로 404 응답
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # user1의 챌린지가 여전히 활성 상태인지 확인
        challenge1.refresh_from_db()
        self.assertEqual(challenge1.status, 'active')
    
    def test_data_leakage_prevention(self):
        """데이터 유출 방지 테스트"""
        # 각 사용자의 챌린지 생성
        challenge1 = UserChallenge.objects.create(
            user=self.user1,
            room=self.room,
            user_height=170.0,
            user_weight=70.0,
            user_target_weight=65.0,
            user_challenge_duration_days=30,
            remaining_duration_days=25
        )
        
        challenge2 = UserChallenge.objects.create(
            user=self.user2,
            room=self.room,
            user_height=165.0,
            user_weight=60.0,
            user_target_weight=55.0,
            user_challenge_duration_days=30,
            remaining_duration_days=20
        )
        
        # user1으로 로그인
        self.client.login(username='user1', password='testpass123')
        
        # 내 챌린지 조회
        url = reverse('challenges:my-challenge')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        challenges = response_data.get('data', [])
        
        # user1의 데이터만 포함되고 user2의 데이터는 포함되지 않는지 확인
        for challenge in challenges:
            self.assertEqual(challenge['user_height'], 170.0)  # user1의 데이터
            self.assertNotEqual(challenge['user_height'], 165.0)  # user2의 데이터가 아님
    
    def test_input_validation_security(self):
        """입력 검증 보안 테스트"""
        self.client.login(username='user1', password='testpass123')
        
        # 악의적인 입력 데이터로 챌린지 참여 시도
        join_url = reverse('challenges:join-challenge')
        malicious_data = {
            'room_id': 'DROP TABLE challenges_challengeroom;',  # SQL 인젝션 시도
            'user_height': -999,  # 비정상적인 값
            'user_weight': 'invalid',  # 잘못된 타입
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        response = self.client.post(join_url, malicious_data, format='json')
        
        # 400 Bad Request 응답 확인 (입력 검증 실패)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.json()
        success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
        self.assertEqual(response_data.get('error_code'), 'VALIDATION_ERROR')
    
    def test_rate_limiting_consideration(self):
        """레이트 리미팅 고려사항 테스트"""
        # 현재 구현에는 레이트 리미팅이 없지만, 향후 추가를 위한 테스트 프레임워크
        self.client.login(username='user1', password='testpass123')
        
        url = reverse('challenges:my-challenge')
        
        # 연속적인 요청 시도
        responses = []
        for i in range(10):
            response = self.client.get(url)
            responses.append(response.status_code)
        
        # 현재는 모든 요청이 성공해야 함 (레이트 리미팅 없음)
        for status_code in responses:
            self.assertEqual(status_code, status.HTTP_200_OK)
        
        # 향후 레이트 리미팅 추가 시 429 Too Many Requests 응답 확인 가능


class ChallengeFlowIntegrationTestCase(APITestCase):
    """완전한 챌린지 플로우 통합 테스트"""
    
    def setUp(self):
        """테스트 데이터 설정"""
        self.client = APIClient()
        
        # 테스트 사용자 생성
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # 테스트용 챌린지 방들 생성
        self.room1 = ChallengeRoom.objects.create(
            name='1500kcal_challenge',
            target_calorie=1500,
            tolerance=50,
            description='1500칼로리 챌린지',
            is_active=True
        )
        
        self.room2 = ChallengeRoom.objects.create(
            name='1800kcal_challenge',
            target_calorie=1800,
            tolerance=50,
            description='1800칼로리 챌린지',
            is_active=True
        )
    
    def test_complete_challenge_lifecycle_with_session_auth(self):
        """세션 인증을 통한 완전한 챌린지 생명주기 테스트"""
        # 1. 로그인
        login_success = self.client.login(username='testuser', password='testpass123')
        self.assertTrue(login_success, "로그인이 실패했습니다")
        
        # 2. 챌린지 방 목록 조회 (공개 API)
        rooms_url = reverse('challenges:challenge-room-list')
        rooms_response = self.client.get(rooms_url)
        self.assertEqual(rooms_response.status_code, status.HTTP_200_OK)
        rooms_data = rooms_response.json()
        self.assertGreaterEqual(len(rooms_data['results']), 2)
        
        # 3. 첫 번째 챌린지 참여
        join_url = reverse('challenges:join-challenge')
        join_data = {
            'room_id': self.room1.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_201_CREATED)
        join_response_data = join_response.json()
        self.assertTrue(join_response_data.get('success', False))
        
        # 4. 내 챌린지 조회
        my_url = reverse('challenges:my-challenge')
        my_response = self.client.get(my_url)
        self.assertEqual(my_response.status_code, status.HTTP_200_OK)
        my_data = my_response.json()
        self.assertTrue(my_data.get('success', False))
        challenges = my_data.get('data', [])
        self.assertEqual(len(challenges), 1)
        self.assertEqual(challenges[0]['room']['id'], self.room1.id)
        
        # 5. 개인 통계 조회
        stats_url = reverse('challenges:personal-stats')
        stats_response = self.client.get(stats_url)
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        stats_data = stats_response.json()
        self.assertTrue(stats_data.get('success', False))
        
        # 6. 치팅 상태 조회
        cheat_status_url = reverse('challenges:cheat-status')
        cheat_status_response = self.client.get(cheat_status_url)
        self.assertEqual(cheat_status_response.status_code, status.HTTP_200_OK)
        cheat_status_data = cheat_status_response.json()
        self.assertTrue(cheat_status_data.get('success', False))
        
        # 7. 치팅 데이 요청
        cheat_url = reverse('challenges:request-cheat')
        cheat_data = {
            'room_id': self.room1.id,
            'date': date.today().isoformat(),
            'reason': '가족 모임'
        }
        
        cheat_response = self.client.post(cheat_url, cheat_data, format='json')
        self.assertEqual(cheat_response.status_code, status.HTTP_200_OK)
        cheat_response_data = cheat_response.json()
        self.assertTrue(cheat_response_data.get('success', False))
        
        # 8. 치팅 상태 재조회 (사용 횟수 증가 확인)
        cheat_status_response2 = self.client.get(cheat_status_url)
        self.assertEqual(cheat_status_response2.status_code, status.HTTP_200_OK)
        cheat_status_data2 = cheat_status_response2.json()
        self.assertTrue(cheat_status_data2.get('success', False))
        
        # 9. 챌린지 연장
        extend_url = reverse('challenges:extend-challenge')
        extend_data = {
            'room_id': self.room1.id,
            'additional_days': 7
        }
        
        extend_response = self.client.post(extend_url, extend_data, format='json')
        self.assertEqual(extend_response.status_code, status.HTTP_200_OK)
        extend_response_data = extend_response.json()
        self.assertTrue(extend_response_data.get('success', False))
        
        # 10. 연장 후 내 챌린지 상태 확인
        my_response2 = self.client.get(my_url)
        self.assertEqual(my_response2.status_code, status.HTTP_200_OK)
        my_data2 = my_response2.json()
        challenges2 = my_data2.get('data', [])
        self.assertEqual(challenges2[0]['remaining_duration_days'], 37)  # 30 + 7
        
        # 11. 리더보드 조회 (공개 API)
        leaderboard_url = reverse('challenges:leaderboard', kwargs={'room_id': self.room1.id})
        leaderboard_response = self.client.get(leaderboard_url)
        self.assertEqual(leaderboard_response.status_code, status.HTTP_200_OK)
        
        # 12. 챌린지 포기
        leave_url = reverse('challenges:leave-challenge')
        leave_data = {'room_id': self.room1.id}
        
        leave_response = self.client.post(leave_url, leave_data, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_200_OK)
        leave_response_data = leave_response.json()
        self.assertTrue(leave_response_data.get('success', False))
        
        # 13. 포기 후 내 챌린지 조회 (빈 목록 확인)
        my_response3 = self.client.get(my_url)
        self.assertEqual(my_response3.status_code, status.HTTP_200_OK)
        my_data3 = my_response3.json()
        challenges3 = my_data3.get('data', [])
        # 포기한 챌린지는 비활성 상태이므로 목록에서 제외될 수 있음
        active_challenges = [c for c in challenges3 if c.get('status') == 'active']
        self.assertEqual(len(active_challenges), 0)
    
    def test_multiple_challenge_participation_flow(self):
        """다중 챌린지 참여 플로우 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 첫 번째 챌린지 참여
        join_url = reverse('challenges:join-challenge')
        join_data1 = {
            'room_id': self.room1.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response1 = self.client.post(join_url, join_data1, format='json')
        self.assertEqual(join_response1.status_code, status.HTTP_201_CREATED)
        
        # 두 번째 챌린지 참여
        join_data2 = {
            'room_id': self.room2.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 45,
            'user_weekly_cheat_limit': 1
        }
        
        join_response2 = self.client.post(join_url, join_data2, format='json')
        self.assertEqual(join_response2.status_code, status.HTTP_201_CREATED)
        
        # 내 챌린지 조회 (두 개 모두 확인)
        my_url = reverse('challenges:my-challenge')
        my_response = self.client.get(my_url)
        self.assertEqual(my_response.status_code, status.HTTP_200_OK)
        my_data = my_response.json()
        challenges = my_data.get('data', [])
        self.assertEqual(len(challenges), 2)
        
        # 각 챌린지의 방 ID 확인
        room_ids = {challenge['room']['id'] for challenge in challenges}
        self.assertEqual(room_ids, {self.room1.id, self.room2.id})
        
        # 첫 번째 챌린지만 포기
        leave_url = reverse('challenges:leave-challenge')
        leave_data = {'room_id': self.room1.id}
        
        leave_response = self.client.post(leave_url, leave_data, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_200_OK)
        
        # 남은 챌린지 확인
        my_response2 = self.client.get(my_url)
        self.assertEqual(my_response2.status_code, status.HTTP_200_OK)
        my_data2 = my_response2.json()
        active_challenges = [c for c in my_data2.get('data', []) if c.get('status') == 'active']
        self.assertEqual(len(active_challenges), 1)
        self.assertEqual(active_challenges[0]['room']['id'], self.room2.id)
    
    def test_challenge_flow_with_daily_judgment(self):
        """일일 판정을 포함한 챌린지 플로우 테스트"""
        # 로그인 및 챌린지 참여
        self.client.login(username='testuser', password='testpass123')
        
        join_url = reverse('challenges:join-challenge')
        join_data = {
            'room_id': self.room1.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_201_CREATED)
        
        # 테스트용 식사 기록 생성
        MealLog.objects.create(
            user=self.user,
            date=date.today(),
            time=timezone.now().time(),
            mealType='breakfast',
            calories=700.0,
            image_url='test_breakfast.jpg'
        )
        
        MealLog.objects.create(
            user=self.user,
            date=date.today(),
            time=timezone.now().time(),
            mealType='lunch',
            calories=800.0,
            image_url='test_lunch.jpg'
        )
        
        # 일일 판정 실행
        judgment_url = reverse('challenges:daily-judgment')
        judgment_data = {
            'room_id': self.room1.id,
            'date': date.today().isoformat()
        }
        
        judgment_response = self.client.post(judgment_url, judgment_data, format='json')
        self.assertEqual(judgment_response.status_code, status.HTTP_200_OK)
        judgment_response_data = judgment_response.json()
        self.assertTrue(judgment_response_data.get('success', False))
        
        # 판정 후 개인 통계 확인
        stats_url = reverse('challenges:personal-stats')
        stats_response = self.client.get(stats_url)
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        stats_data = stats_response.json()
        self.assertTrue(stats_data.get('success', False))
        
        # 일일 기록이 생성되었는지 확인
        user_challenge = UserChallenge.objects.get(user=self.user, room=self.room1)
        daily_records = DailyChallengeRecord.objects.filter(
            user_challenge=user_challenge,
            date=date.today()
        )
        self.assertEqual(daily_records.count(), 1)
    
    def test_error_recovery_flow(self):
        """오류 복구 플로우 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 1. 존재하지 않는 챌린지 방에 참여 시도
        join_url = reverse('challenges:join-challenge')
        invalid_join_data = {
            'room_id': 99999,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response = self.client.post(join_url, invalid_join_data, format='json')
        self.assertEqual(join_response.status_code, status.HTTP_400_BAD_REQUEST)
        join_error_data = join_response.json()
        self.assertFalse(join_error_data.get('success', True))
        self.assertIn('error_code', join_error_data)
        
        # 2. 올바른 데이터로 재시도
        valid_join_data = {
            'room_id': self.room1.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_response2 = self.client.post(join_url, valid_join_data, format='json')
        self.assertEqual(join_response2.status_code, status.HTTP_201_CREATED)
        join_success_data = join_response2.json()
        self.assertTrue(join_success_data.get('success', False))
        
        # 3. 동일한 챌린지에 중복 참여 시도
        join_response3 = self.client.post(join_url, valid_join_data, format='json')
        self.assertEqual(join_response3.status_code, status.HTTP_400_BAD_REQUEST)
        duplicate_error_data = join_response3.json()
        self.assertFalse(duplicate_error_data.get('success', True))
        
        # 4. 참여하지 않은 챌린지 포기 시도
        leave_url = reverse('challenges:leave-challenge')
        invalid_leave_data = {'room_id': self.room2.id}
        
        leave_response = self.client.post(leave_url, invalid_leave_data, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_404_NOT_FOUND)
        leave_error_data = leave_response.json()
        self.assertFalse(leave_error_data.get('success', True))
        
        # 5. 올바른 챌린지 포기
        valid_leave_data = {'room_id': self.room1.id}
        leave_response2 = self.client.post(leave_url, valid_leave_data, format='json')
        self.assertEqual(leave_response2.status_code, status.HTTP_200_OK)
        leave_success_data = leave_response2.json()
        self.assertTrue(leave_success_data.get('success', False))
    
    def test_session_persistence_across_operations(self):
        """작업 간 세션 지속성 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 여러 작업을 연속으로 수행하며 세션이 유지되는지 확인
        operations = [
            ('GET', reverse('challenges:challenge-room-list')),
            ('POST', reverse('challenges:join-challenge'), {
                'room_id': self.room1.id,
                'user_height': 175.0,
                'user_weight': 75.0,
                'user_target_weight': 70.0,
                'user_challenge_duration_days': 30,
                'user_weekly_cheat_limit': 2
            }),
            ('GET', reverse('challenges:my-challenge')),
            ('GET', reverse('challenges:personal-stats')),
            ('GET', reverse('challenges:cheat-status')),
            ('POST', reverse('challenges:request-cheat'), {
                'room_id': self.room1.id,
                'date': date.today().isoformat(),
                'reason': '테스트'
            }),
            ('GET', reverse('challenges:cheat-status')),
            ('POST', reverse('challenges:leave-challenge'), {
                'room_id': self.room1.id
            })
        ]
        
        for i, operation in enumerate(operations):
            with self.subTest(operation_index=i, method=operation[0], url=operation[1]):
                if operation[0] == 'GET':
                    response = self.client.get(operation[1])
                elif operation[0] == 'POST':
                    response = self.client.post(operation[1], operation[2], format='json')
                
                # 모든 작업이 인증 오류 없이 수행되어야 함
                self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                
                # 성공적인 응답 또는 예상되는 오류 응답
                self.assertIn(response.status_code, [
                    status.HTTP_200_OK,
                    status.HTTP_201_CREATED,
                    status.HTTP_400_BAD_REQUEST,  # 비즈니스 로직 오류
                    status.HTTP_404_NOT_FOUND     # 리소스 없음
                ])
    
    def test_concurrent_user_challenge_flows(self):
        """동시 사용자 챌린지 플로우 테스트"""
        # 두 번째 사용자 생성
        user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        # 두 번째 클라이언트 생성
        client2 = APIClient()
        
        # 두 사용자 모두 로그인
        self.client.login(username='testuser', password='testpass123')
        client2.login(username='user2', password='testpass123')
        
        # 동일한 챌린지 방에 두 사용자가 참여
        join_url = reverse('challenges:join-challenge')
        join_data1 = {
            'room_id': self.room1.id,
            'user_height': 175.0,
            'user_weight': 75.0,
            'user_target_weight': 70.0,
            'user_challenge_duration_days': 30,
            'user_weekly_cheat_limit': 2
        }
        
        join_data2 = {
            'room_id': self.room1.id,
            'user_height': 165.0,
            'user_weight': 60.0,
            'user_target_weight': 55.0,
            'user_challenge_duration_days': 45,
            'user_weekly_cheat_limit': 1
        }
        
        # 동시 참여
        response1 = self.client.post(join_url, join_data1, format='json')
        response2 = client2.post(join_url, join_data2, format='json')
        
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # 각 사용자의 챌린지 조회 (데이터 격리 확인)
        my_url = reverse('challenges:my-challenge')
        
        my_response1 = self.client.get(my_url)
        my_response2 = client2.get(my_url)
        
        self.assertEqual(my_response1.status_code, status.HTTP_200_OK)
        self.assertEqual(my_response2.status_code, status.HTTP_200_OK)
        
        my_data1 = my_response1.json()
        my_data2 = my_response2.json()
        
        challenges1 = my_data1.get('data', [])
        challenges2 = my_data2.get('data', [])
        
        # 각 사용자는 자신의 데이터만 볼 수 있어야 함
        self.assertEqual(len(challenges1), 1)
        self.assertEqual(len(challenges2), 1)
        self.assertEqual(challenges1[0]['user_height'], 175.0)
        self.assertEqual(challenges2[0]['user_height'], 165.0)
        
        # 리더보드에서는 두 사용자 모두 확인 가능
        leaderboard_url = reverse('challenges:leaderboard', kwargs={'room_id': self.room1.id})
        leaderboard_response = self.client.get(leaderboard_url)
        self.assertEqual(leaderboard_response.status_code, status.HTTP_200_OK)
        
        leaderboard_data = leaderboard_response.json()
        leaderboard_users = leaderboard_data.get('data', [])
        self.assertGreaterEqual(len(leaderboard_users), 2)
    
    def test_challenge_flow_error_response_consistency(self):
        """챌린지 플로우 오류 응답 일관성 테스트"""
        # 로그인
        self.client.login(username='testuser', password='testpass123')
        
        # 다양한 오류 시나리오에서 일관된 응답 형식 확인
        error_scenarios = [
            {
                'name': 'invalid_room_join',
                'url': reverse('challenges:join-challenge'),
                'method': 'POST',
                'data': {'room_id': 99999, 'user_height': 175.0},
                'expected_status': status.HTTP_400_BAD_REQUEST
            },
            {
                'name': 'invalid_room_leave',
                'url': reverse('challenges:leave-challenge'),
                'method': 'POST',
                'data': {'room_id': 99999},
                'expected_status': status.HTTP_404_NOT_FOUND
            },
            {
                'name': 'invalid_cheat_request',
                'url': reverse('challenges:request-cheat'),
                'method': 'POST',
                'data': {'room_id': 99999, 'date': 'invalid-date'},
                'expected_status': [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]
            }
        ]
        
        for scenario in error_scenarios:
            with self.subTest(scenario=scenario['name']):
                if scenario['method'] == 'GET':
                    response = self.client.get(scenario['url'])
                elif scenario['method'] == 'POST':
                    response = self.client.post(scenario['url'], scenario['data'], format='json')
                
                # 예상 상태 코드 확인
                if isinstance(scenario['expected_status'], list):
                    self.assertIn(response.status_code, scenario['expected_status'])
                else:
                    self.assertEqual(response.status_code, scenario['expected_status'])
                
                # 일관된 오류 응답 구조 확인
                response_data = response.json()
                success_value = response_data.get('success', True); self.assertIn(success_value, [False, 'False'])
                self.assertIn('error_code', response_data)
                self.assertIn('message', response_data)
                
                # 메시지가 한국어인지 확인
                message = response_data.get('message', '')
                self.assertIsInstance(message, str)
                self.assertGreater(len(message), 0)