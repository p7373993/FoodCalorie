from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer, 
    PasswordChangeSerializer, PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer
)
from .services import JWTAuthService, LoginAttemptService, PasswordResetService
from .models import LoginAttempt

User = get_user_model()


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    """
    회원가입 API 뷰
    POST /api/auth/register/
    
    요구사항:
    1. 이메일 중복 검사
    2. 비밀번호 확인 및 강도 검증
    3. 닉네임 중복 검사
    4. 사용자 계정 생성 및 UserProfile 자동 생성
    5. 회원가입 성공 시 자동 로그인 처리 (JWT 토큰 생성)
    """
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def post(self, request):
        """회원가입 처리"""
        serializer = self.serializer_class(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # 사용자 생성 및 자동 로그인 처리
                    result = serializer.save()
                    user = result['user']
                    tokens = result['tokens']
                    profile = result['profile']
                    
                    # 로그인 시도 기록 (성공)
                    LoginAttemptService.record_attempt(
                        request, user.email, user, success=True
                    )
                    
                    # 응답 데이터 구성
                    response_data = {
                        'success': True,
                        'message': '회원가입이 완료되었습니다. 자동으로 로그인되었습니다.',
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'username': user.username,
                        },
                        'profile': UserProfileSerializer(profile).data,
                        'auth': {
                            'access_token': tokens['access_token'],
                            'refresh_token': tokens['refresh_token'],
                            'token_type': 'Bearer',
                            'access_expires_at': tokens['access_expires_at'].isoformat(),
                            'refresh_expires_at': tokens['refresh_expires_at'].isoformat(),
                        }
                    }
                    
                    return Response(response_data, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                # 로그인 시도 기록 (실패)
                email = request.data.get('email', '')
                LoginAttemptService.record_attempt(
                    request, email, None, success=False
                )
                
                return Response({
                    'success': False,
                    'message': '회원가입 처리 중 오류가 발생했습니다.',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        else:
            # 유효성 검사 실패 시 로그인 시도 기록
            email = request.data.get('email', '')
            LoginAttemptService.record_attempt(
                request, email, None, success=False
            )
            
            return Response({
                'success': False,
                'message': '입력 정보가 올바르지 않습니다.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """
    로그인 API 뷰
    POST /api/auth/login/
    
    요구사항:
    1. 이메일/비밀번호 검증 로직
    2. JWT 토큰 생성 및 응답 처리
    3. "로그인 상태 유지" 옵션 처리 (Refresh Token 만료 시간 연장)
    4. 로그인 실패 시 에러 메시지 처리
    5. 계정 잠금 기능 (보안)
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        """로그인 처리"""
        email = request.data.get('email', '')
        
        # 계정 잠금 확인
        if LoginAttemptService.is_account_locked(email):
            remaining_time = LoginAttemptService.get_lockout_remaining_time(email)
            minutes = remaining_time // 60
            seconds = remaining_time % 60
            
            return Response({
                'success': False,
                'message': f'계정이 잠금되었습니다. {minutes}분 {seconds}초 후에 다시 시도해주세요.',
                'locked_until': remaining_time,
                'error_code': 'ACCOUNT_LOCKED'
            }, status=status.HTTP_423_LOCKED)
        
        serializer = self.serializer_class(data=request.data)
        
        if serializer.is_valid():
            try:
                user = serializer.validated_data['user']
                remember_me = serializer.validated_data.get('remember_me', False)
                
                # JWT 토큰 생성
                tokens = JWTAuthService.generate_tokens_with_extended_refresh(
                    user, extend_refresh=remember_me
                )
                
                # 로그인 시도 기록 (성공)
                LoginAttemptService.record_attempt(
                    request, email, user, success=True
                )
                
                # 응답 데이터 구성
                response_data = {
                    'success': True,
                    'message': '로그인이 완료되었습니다.',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                    },
                    'profile': UserProfileSerializer(user.profile).data,
                    'auth': {
                        'access_token': tokens['access_token'],
                        'refresh_token': tokens['refresh_token'],
                        'token_type': 'Bearer',
                        'access_expires_at': tokens['access_expires_at'].isoformat(),
                        'refresh_expires_at': tokens['refresh_expires_at'].isoformat(),
                        'remember_me': remember_me
                    }
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                # 로그인 시도 기록 (실패)
                LoginAttemptService.record_attempt(
                    request, email, None, success=False
                )
                
                return Response({
                    'success': False,
                    'message': '로그인 처리 중 오류가 발생했습니다.',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        else:
            # 유효성 검사 실패 시 로그인 시도 기록
            LoginAttemptService.record_attempt(
                request, email, None, success=False
            )
            
            # 구체적인 에러 메시지 추출
            error_message = '로그인 정보가 올바르지 않습니다.'
            if 'non_field_errors' in serializer.errors:
                error_message = serializer.errors['non_field_errors'][0]
            elif 'email' in serializer.errors:
                error_message = serializer.errors['email'][0]
            elif 'password' in serializer.errors:
                error_message = serializer.errors['password'][0]
            
            return Response({
                'success': False,
                'message': error_message,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """
    로그아웃 API 뷰
    POST /api/auth/logout/
    
    요구사항:
    1. Refresh Token 블랙리스트 처리
    2. 클라이언트 토큰 무효화 응답
    3. 로그아웃 후 리다이렉트 처리
    4. 로그아웃 기록 및 보안 처리
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """로그아웃 처리"""
        try:
            user = request.user
            refresh_token = request.data.get('refresh_token')
            
            # Refresh Token이 제공된 경우 블랙리스트 처리
            if refresh_token:
                try:
                    from rest_framework_simplejwt.tokens import RefreshToken
                    
                    # Refresh Token 검증 및 블랙리스트 추가
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    
                    blacklist_message = "Refresh Token이 블랙리스트에 추가되었습니다."
                    
                except Exception as token_error:
                    # 토큰이 이미 만료되었거나 유효하지 않은 경우
                    blacklist_message = f"토큰 처리 중 오류: {str(token_error)}"
            else:
                blacklist_message = "Refresh Token이 제공되지 않았습니다."
            
            # 현재 사용자의 모든 Refresh Token 블랙리스트 처리 (선택사항)
            logout_all_devices = request.data.get('logout_all_devices', False)
            if logout_all_devices:
                try:
                    JWTAuthService.revoke_all_user_tokens(user)
                    blacklist_message += " 모든 기기에서 로그아웃되었습니다."
                except Exception as revoke_error:
                    blacklist_message += f" 전체 로그아웃 처리 중 오류: {str(revoke_error)}"
            
            # 로그아웃 시도 기록
            try:
                from django.utils import timezone
                LoginAttemptService.record_attempt(
                    request, 
                    user.email, 
                    user, 
                    success=True,
                    attempt_type='logout'
                )
            except Exception as log_error:
                # 로그 기록 실패는 로그아웃 성공에 영향을 주지 않음
                pass
            
            # 리다이렉트 URL 처리
            redirect_url = request.data.get('redirect_url')
            if redirect_url:
                # 허용된 도메인 검증 (보안)
                from django.conf import settings
                allowed_domains = getattr(settings, 'ALLOWED_LOGOUT_REDIRECT_DOMAINS', [
                    'localhost:3000', '127.0.0.1:3000', settings.FRONTEND_URL.replace('http://', '').replace('https://', '')
                ])
                
                from urllib.parse import urlparse
                parsed_url = urlparse(redirect_url)
                domain_with_port = f"{parsed_url.hostname}:{parsed_url.port}" if parsed_url.port else parsed_url.hostname
                
                if domain_with_port not in allowed_domains and parsed_url.hostname not in allowed_domains:
                    redirect_url = settings.FRONTEND_URL + '/login'  # 기본 리다이렉트
            else:
                from django.conf import settings
                redirect_url = settings.FRONTEND_URL + '/login'  # 기본 리다이렉트
            
            # 성공 응답
            response_data = {
                'success': True,
                'message': '로그아웃이 완료되었습니다.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                },
                'logout_info': {
                    'blacklist_status': blacklist_message,
                    'logout_all_devices': logout_all_devices,
                    'redirect_url': redirect_url,
                    'logout_timestamp': timezone.now().isoformat()
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # 로그아웃 실패 시에도 기본적인 정보는 제공
            return Response({
                'success': False,
                'message': '로그아웃 처리 중 오류가 발생했습니다.',
                'error': str(e),
                'logout_info': {
                    'partial_logout': True,
                    'redirect_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000') + '/login'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProfileView(APIView):
    """프로필 관리 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 프로필 조회 로직 구현
        return Response({
            'message': '프로필 조회 API - 구현 예정'
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        # TODO: 프로필 수정 로직 구현
        return Response({
            'message': '프로필 수정 API - 구현 예정',
            'data': request.data
        }, status=status.HTTP_200_OK)


class CurrentUserProfileView(APIView):
    """현재 사용자 프로필 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 현재 사용자 프로필 조회 로직 구현
        return Response({
            'message': '현재 사용자 프로필 API - 구현 예정',
            'user': str(request.user)
        }, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    """비밀번호 변경 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        # TODO: 비밀번호 변경 로직 구현
        return Response({
            'message': '비밀번호 변경 API - 구현 예정'
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """비밀번호 재설정 요청 API - 임시 구현"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        # TODO: 비밀번호 재설정 요청 로직 구현
        return Response({
            'message': '비밀번호 재설정 요청 API - 구현 예정'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """비밀번호 재설정 확인 API - 임시 구현"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        # TODO: 비밀번호 재설정 확인 로직 구현
        return Response({
            'message': '비밀번호 재설정 확인 API - 구현 예정'
        }, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    """관리자용 사용자 목록 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: 관리자 권한 확인 및 사용자 목록 조회 로직 구현
        return Response({
            'message': '관리자용 사용자 목록 API - 구현 예정'
        }, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    """관리자용 사용자 상세 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        # TODO: 관리자 권한 확인 및 사용자 상세 조회 로직 구현
        return Response({
            'message': f'관리자용 사용자 상세 API - 구현 예정 (ID: {pk})'
        }, status=status.HTTP_200_OK)
    
    def put(self, request, pk):
        # TODO: 관리자 권한 확인 및 사용자 정보 수정 로직 구현
        return Response({
            'message': f'관리자용 사용자 수정 API - 구현 예정 (ID: {pk})'
        }, status=status.HTTP_200_OK)
