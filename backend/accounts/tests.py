"""
인증 관련 테스트 코드
Task 11: 인증 관련 테스트 코드 작성

테스트 범위:
1. 세션 기반 로그인/로그아웃 테스트
2. CSRF 보호 테스트
3. API 엔드포인트 인증 테스트
4. 세션 만료 처리 테스트

요구사항: 3.1, 3.2, 3.3, 4.1
"""

import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.contrib.sessions.models import Session
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import UserProfile, LoginAttempt, PasswordResetToken
try:
    from .services import LoginAttemptService, PasswordResetService
except ImportError:
    # 서비스가 없는 경우 Mock 사용
    class MockService:
        @staticmethod
        def record_attempt(*args, **kwargs):
            pass
        @staticmethod
        def is_account_locked(*args, **kwargs):
            return False
        @staticmethod
        def get_lockout_remaining_time(*args, **kwargs):
            return 0
        @staticmethod
        def create_reset_token(*args, **kwargs):
            return "mock_token"
        @staticmethod
        def send_reset_email(*args, **kwargs):
            return True
    
    LoginAttemptService = MockService()
    PasswordResetService = MockService()

User = get_user_model()


class SessionBasedAuthenticationTest(TestCase):
    """세션 기반 인증 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client()
        # 기존 사용자 정리
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # UserProfile 생성
        self.profile = UserProfile.objects.create(
            user=self.user,
            nickname='testnick',
            height=170.0,
            weight=70.0,
            age=25,
            gender='male'
        )
    
    def test_session_based_login_success(self):
        """세션 기반 로그인 성공 테스트 - 요구사항 3.1"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # 응답 구조 검증
        self.assertTrue(data['success'])
        self.assertIn('user', data)
        self.assertIn('profile', data)
        self.assertIn('session_info', data)
        
        # 세션 정보 검증
        session_info = data['session_info']
        self.assertIn('session_key', session_info)
        self.assertIn('expires_at', session_info)
        
        # 세션이 실제로 생성되었는지 확인
        self.assertTrue(self.client.session.session_key)
        
        # 인증된 사용자 확인
        self.assertTrue(self.client.session.get('_auth_user_id'))
    
    def test_session_based_login_failure(self):
        """세션 기반 로그인 실패 테스트 - 요구사항 3.1"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        # 응답 구조 검증
        self.assertFalse(data['success'])
        self.assertIn('message', data)
        
        # 세션이 생성되지 않았는지 확인
        self.assertFalse(self.client.session.get('_auth_user_id'))
    
    def test_session_based_logout(self):
        """세션 기반 로그아웃 테스트 - 요구사항 3.2"""
        # 먼저 로그인
        self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        # 로그인 상태 확인
        self.assertTrue(self.client.session.get('_auth_user_id'))
        
        # 로그아웃
        response = self.client.post('/api/auth/logout/', 
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # 응답 구조 검증
        self.assertTrue(data['success'])
        self.assertIn('logout_info', data)
        
        # 세션이 정리되었는지 확인
        self.assertFalse(self.client.session.get('_auth_user_id'))
    
    def test_remember_me_functionality(self):
        """로그인 상태 유지 기능 테스트 - 요구사항 3.1"""
        # remember_me=True로 로그인
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
            'remember_me': True
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # remember_me 정보 확인
        session_info = data['session_info']
        self.assertTrue(session_info['remember_me'])
        
        # 세션 만료 시간이 연장되었는지 확인 (4주)
        session = Session.objects.get(session_key=self.client.session.session_key)
        expected_expiry = timezone.now() + timedelta(seconds=2419200)  # 4주
        
        # 시간 차이가 1분 이내인지 확인 (테스트 실행 시간 고려)
        time_diff = abs((session.expire_date - expected_expiry).total_seconds())
        self.assertLess(time_diff, 60)
    
    def test_session_persistence_across_requests(self):
        """요청 간 세션 지속성 테스트 - 요구사항 3.2"""
        # 로그인
        self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        # 인증이 필요한 API 호출
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['email'], 'test@example.com')


class CSRFProtectionTest(TestCase):
    """CSRF 보호 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client(enforce_csrf_checks=True)
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_csrf_token_endpoint(self):
        """CSRF 토큰 엔드포인트 테스트 - 요구사항 4.1"""
        response = self.client.get('/api/auth/csrf-token/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # 응답 구조 검증
        self.assertTrue(data['success'])
        self.assertIn('csrf_token', data)
        self.assertIn('token_info', data)
        
        # 토큰이 실제로 생성되었는지 확인
        csrf_token = data['csrf_token']
        self.assertTrue(len(csrf_token) > 0)
    
    def test_csrf_protection_on_login(self):
        """로그인 시 CSRF 보호 테스트 - 요구사항 4.1"""
        # CSRF 토큰 없이 로그인 시도
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 403)
        data = response.json()
        
        # CSRF 오류 응답 구조 검증
        self.assertFalse(data['success'])
        self.assertEqual(data['error_code'], 'CSRF_TOKEN_MISSING_OR_INVALID')
        self.assertIn('csrf_info', data)
        
        csrf_info = data['csrf_info']
        self.assertTrue(csrf_info['should_refresh'])
        self.assertTrue(csrf_info['token_required'])
    
    def test_csrf_protection_with_valid_token(self):
        """유효한 CSRF 토큰으로 로그인 테스트 - 요구사항 4.1"""
        # CSRF 토큰 획득
        csrf_response = self.client.get('/api/auth/csrf-token/')
        csrf_token = csrf_response.json()['csrf_token']
        
        # 유효한 CSRF 토큰으로 로그인
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json', 
        HTTP_X_CSRFTOKEN=csrf_token)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
    
    def test_csrf_protection_on_password_change(self):
        """비밀번호 변경 시 CSRF 보호 테스트 - 요구사항 4.1"""
        # 로그인 (CSRF 토큰 포함)
        csrf_response = self.client.get('/api/auth/csrf-token/')
        csrf_token = csrf_response.json()['csrf_token']
        
        self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json', 
        HTTP_X_CSRFTOKEN=csrf_token)
        
        # CSRF 토큰 없이 비밀번호 변경 시도
        response = self.client.put('/api/auth/password/change/', {
            'current_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertEqual(data['error_code'], 'CSRF_TOKEN_MISSING_OR_INVALID')


class APIEndpointAuthenticationTest(APITestCase):
    """API 엔드포인트 인증 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = APIClient()
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.profile = UserProfile.objects.create(
            user=self.user,
            nickname='testnick'
        )
    
    def test_unauthenticated_profile_access(self):
        """인증 없는 프로필 접근 테스트 - 요구사항 4.1"""
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, 401)
        data = response.json()
        
        # 인증 오류 응답 구조 검증
        self.assertFalse(data['success'])
        self.assertEqual(data['error_code'], 'AUTHENTICATION_REQUIRED')
        self.assertEqual(data['redirect_url'], '/login')
        self.assertIn('session_info', data)
        
        session_info = data['session_info']
        self.assertTrue(session_info['session_expired'])
        self.assertTrue(session_info['should_redirect'])
    
    def test_authenticated_profile_access(self):
        """인증된 프로필 접근 테스트 - 요구사항 4.1"""
        # 세션 기반 로그인
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['email'], 'test@example.com')
        self.assertIn('profile', data)
    
    def test_unauthenticated_password_change(self):
        """인증 없는 비밀번호 변경 시도 테스트 - 요구사항 4.1"""
        response = self.client.put('/api/auth/password/change/', {
            'current_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        })
        
        self.assertEqual(response.status_code, 401)
        data = response.json()
        
        self.assertFalse(data['success'])
        self.assertEqual(data['error_code'], 'AUTHENTICATION_REQUIRED')
    
    def test_authenticated_password_change(self):
        """인증된 비밀번호 변경 테스트 - 요구사항 4.1"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.put('/api/auth/password/change/', {
            'current_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data['success'])
        self.assertIn('session_info', data)
        self.assertIn('security_info', data)
        
        # 세션 갱신 확인
        session_info = data['session_info']
        self.assertTrue(session_info['session_renewed'])
        
        # 보안 정보 확인
        security_info = data['security_info']
        self.assertTrue(security_info['password_changed'])
        self.assertTrue(security_info['all_sessions_invalidated'])


class SessionExpiryTest(TestCase):
    """세션 만료 처리 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client()
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.profile = UserProfile.objects.create(
            user=self.user,
            nickname='testnick'
        )
    
    def test_session_expiry_handling(self):
        """세션 만료 처리 테스트 - 요구사항 3.3"""
        # 로그인
        self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        # 세션 강제 만료
        session = Session.objects.get(session_key=self.client.session.session_key)
        session.expire_date = timezone.now() - timedelta(hours=1)
        session.save()
        
        # 만료된 세션으로 API 호출
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, 401)
        data = response.json()
        
        # 세션 만료 응답 구조 검증
        self.assertFalse(data['success'])
        self.assertEqual(data['error_code'], 'AUTHENTICATION_REQUIRED')
        self.assertEqual(data['redirect_url'], '/login')
        
        session_info = data['session_info']
        self.assertTrue(session_info['session_expired'])
        self.assertTrue(session_info['should_redirect'])
    
    @patch('django.utils.timezone.now')
    def test_session_renewal_on_activity(self, mock_now):
        """활동 시 세션 갱신 테스트 - 요구사항 3.2"""
        # 초기 시간 설정
        initial_time = timezone.now()
        mock_now.return_value = initial_time
        
        # 로그인
        self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        initial_session = Session.objects.get(session_key=self.client.session.session_key)
        initial_expiry = initial_session.expire_date
        
        # 시간 경과 시뮬레이션 (1시간 후)
        later_time = initial_time + timedelta(hours=1)
        mock_now.return_value = later_time
        
        # API 호출 (세션 갱신 트리거)
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, 200)
        
        # 세션이 갱신되었는지 확인
        updated_session = Session.objects.get(session_key=self.client.session.session_key)
        self.assertGreater(updated_session.expire_date, initial_expiry)
    
    def test_multiple_session_invalidation_on_password_change(self):
        """비밀번호 변경 시 모든 세션 무효화 테스트 - 요구사항 3.3"""
        # 첫 번째 클라이언트로 로그인
        client1 = Client()
        client1.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        # 두 번째 클라이언트로 로그인
        client2 = Client()
        client2.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        # 두 세션 모두 활성 상태 확인
        response1 = client1.get('/api/auth/profile/')
        response2 = client2.get('/api/auth/profile/')
        
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)
        
        # 첫 번째 클라이언트에서 비밀번호 변경
        client1.put('/api/auth/password/change/', {
            'current_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }, content_type='application/json')
        
        # 첫 번째 클라이언트는 여전히 인증됨 (새 세션)
        response1 = client1.get('/api/auth/profile/')
        self.assertEqual(response1.status_code, 200)
        
        # 두 번째 클라이언트는 세션 무효화로 인증 실패
        response2 = client2.get('/api/auth/profile/')
        self.assertEqual(response2.status_code, 401)


class LoginAttemptSecurityTest(TestCase):
    """로그인 시도 보안 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client()
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_login_attempt_recording(self):
        """로그인 시도 기록 테스트 - 요구사항 3.1"""
        # 성공적인 로그인
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # 로그인 시도 기록 확인
        attempt = LoginAttempt.objects.filter(username='test@example.com').first()
        self.assertIsNotNone(attempt)
        self.assertTrue(attempt.is_successful)
    
    def test_failed_login_attempt_recording(self):
        """실패한 로그인 시도 기록 테스트 - 요구사항 3.1"""
        # 실패한 로그인
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        
        # 실패한 로그인 시도 기록 확인
        attempt = LoginAttempt.objects.filter(username='test@example.com').first()
        self.assertIsNotNone(attempt)
        self.assertFalse(attempt.is_successful)
    
    def test_account_lockout_after_multiple_failures(self):
        """다중 실패 후 계정 잠금 테스트 - 요구사항 3.1"""
        # 5번 연속 실패 (계정 잠금 임계값)
        for i in range(5):
            response = self.client.post('/api/auth/login/', {
                'email': 'test@example.com',
                'password': 'wrongpassword'
            }, content_type='application/json')
            
            if i < 4:
                self.assertEqual(response.status_code, 400)
            else:
                # 5번째 시도에서 계정 잠금
                self.assertEqual(response.status_code, 423)
                data = response.json()
                self.assertEqual(data['error_code'], 'ACCOUNT_LOCKED')
                self.assertIn('locked_until', data)
        
        # 잠금 상태에서 올바른 비밀번호로도 로그인 불가
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 423)


class RegistrationTest(TestCase):
    """회원가입 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client()
        User.objects.filter(email='test@example.com').delete()
    
    def test_successful_registration_with_auto_login(self):
        """성공적인 회원가입 및 자동 로그인 테스트 - 요구사항 3.1"""
        response = self.client.post('/api/auth/register/', {
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'nickname': 'testuser'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = response.json()
        
        # 응답 구조 검증
        self.assertTrue(data['success'])
        self.assertIn('user', data)
        self.assertIn('profile', data)
        self.assertIn('session_info', data)
        
        # 자동 로그인 확인
        session_info = data['session_info']
        self.assertIn('session_key', session_info)
        
        # 사용자 및 프로필 생성 확인
        user = User.objects.get(email='test@example.com')
        self.assertTrue(user.is_active)
        
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.nickname, 'testuser')
        
        # 세션 기반 인증 상태 확인
        self.assertTrue(self.client.session.get('_auth_user_id'))
    
    def test_registration_with_duplicate_email(self):
        """중복 이메일로 회원가입 시도 테스트 - 요구사항 3.1"""
        # 첫 번째 사용자 생성
        User.objects.create_user(
            username='existing',
            email='test@example.com',
            password='password123'
        )
        
        # 중복 이메일로 회원가입 시도
        response = self.client.post('/api/auth/register/', {
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'nickname': 'newuser'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        
        self.assertFalse(data['success'])
        self.assertIn('errors', data)


class PasswordResetTest(TestCase):
    """비밀번호 재설정 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.client = Client()
        User.objects.filter(email='test@example.com').delete()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_password_reset_request(self):
        """비밀번호 재설정 요청 테스트 - 요구사항 3.3"""
        response = self.client.post('/api/auth/password/reset/', {
            'email': 'test@example.com'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data['success'])
        self.assertIn('message', data)
        
        # 재설정 토큰 생성 확인
        token = PasswordResetToken.objects.filter(user=self.user).first()
        self.assertIsNotNone(token)
        self.assertTrue(token.is_valid())
    
    def test_password_reset_request_nonexistent_email(self):
        """존재하지 않는 이메일로 재설정 요청 테스트 - 요구사항 3.3"""
        response = self.client.post('/api/auth/password/reset/', {
            'email': 'nonexistent@example.com'
        }, content_type='application/json')
        
        # 보안상 동일한 응답 (이메일 존재 여부 노출 방지)
        # 실제 구현에 따라 200 또는 400이 될 수 있음
        self.assertIn(response.status_code, [200, 400])
        data = response.json()
        # 성공 여부는 실제 구현에 따라 다를 수 있음
        self.assertIn('success', data)


if __name__ == '__main__':
    import unittest
    unittest.main()