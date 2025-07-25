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
from django.utils import timezone
from django.core.paginator import Paginator
from django.db.models import Q, Count
from functools import wraps
from datetime import datetime, timedelta
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer, 
    PasswordChangeSerializer, PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer, AdminUserListSerializer, AdminUserDetailSerializer
)
from .services import JWTAuthService, LoginAttemptService, PasswordResetService
from .models import LoginAttempt, UserProfile
from .decorators import IsAdminUser
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


def is_admin_user(view_func):
    """
    관리자 권한 검증 데코레이터
    is_staff=True인 사용자만 접근 허용
    """
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        # 인증 확인
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'message': '인증이 필요합니다.',
                'error_code': 'AUTHENTICATION_REQUIRED'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 관리자 권한 확인
        if not request.user.is_staff:
            print(f"관리자 접근 시도 - 권한 없음: {request.user.email}")
            return Response({
                'success': False,
                'message': '관리자 권한이 필요합니다.',
                'error_code': 'ADMIN_PERMISSION_REQUIRED'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"관리자 접근 허용: {request.user.email}")
        return view_func(self, request, *args, **kwargs)
    
    return wrapper


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
                    JWTAuthService.revoke_all_tokens_for_user(user)
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


@method_decorator(csrf_exempt, name='dispatch')
class ProfileView(APIView):
    """
    프로필 관리 API 뷰
    GET/PUT /api/auth/profile/
    
    요구사항:
    1. 현재 사용자 프로필 정보 조회 기능 (GET)
    2. 프로필 정보 수정 기능 (PUT) - 닉네임, 키, 몸무게, 나이, 성별
    3. 프로필 이미지 업로드 처리
    4. 닉네임 중복 검사 및 검증 로직
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """현재 사용자 프로필 정보 조회"""
        try:
            user = request.user
            
            # UserProfile이 없는 경우 자동 생성
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'nickname': user.username,  # 기본 닉네임은 username
                }
            )
            
            if created:
                print(f"새로운 UserProfile 생성됨: {user.email}")
            
            # 프로필 데이터 직렬화
            profile_serializer = UserProfileSerializer(profile)
            
            response_data = {
                'success': True,
                'message': '프로필 정보를 성공적으로 조회했습니다.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'date_joined': user.date_joined.isoformat(),
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                },
                'profile': profile_serializer.data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '프로필 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """프로필 정보 수정"""
        try:
            user = request.user
            
            # UserProfile이 없는 경우 자동 생성
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'nickname': user.username,
                }
            )
            
            # 닉네임 중복 검사 (현재 사용자 제외)
            new_nickname = request.data.get('nickname')
            if new_nickname and new_nickname != profile.nickname:
                if UserProfile.objects.filter(nickname=new_nickname).exclude(user=user).exists():
                    return Response({
                        'success': False,
                        'message': '이미 사용 중인 닉네임입니다.',
                        'error_code': 'NICKNAME_ALREADY_EXISTS'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # 프로필 데이터 업데이트
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            
            if serializer.is_valid():
                # 데이터베이스 트랜잭션으로 안전하게 저장
                with transaction.atomic():
                    updated_profile = serializer.save()
                    
                    # 사용자 기본 정보도 업데이트 (선택사항)
                    user_data = request.data.get('user', {})
                    if user_data:
                        if 'first_name' in user_data:
                            user.first_name = user_data['first_name']
                        if 'last_name' in user_data:
                            user.last_name = user_data['last_name']
                        user.save()
                
                # 업데이트된 프로필 정보 반환
                response_data = {
                    'success': True,
                    'message': '프로필이 성공적으로 업데이트되었습니다.',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                    },
                    'profile': UserProfileSerializer(updated_profile).data,
                    'updated_fields': list(serializer.validated_data.keys())
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            else:
                return Response({
                    'success': False,
                    'message': '프로필 데이터가 유효하지 않습니다.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': '프로필 업데이트 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CurrentUserProfileView(APIView):
    """
    현재 사용자 프로필 API 뷰
    GET /api/auth/profile/me/
    
    요구사항:
    1. 현재 인증된 사용자의 프로필 정보만 조회
    2. 빠른 조회를 위한 간소화된 응답
    3. 프로필 완성도 정보 포함
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """현재 사용자 프로필 정보 조회 (간소화된 버전)"""
        try:
            user = request.user
            
            # UserProfile이 없는 경우 자동 생성
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'nickname': user.username,
                }
            )
            
            if created:
                print(f"새로운 UserProfile 생성됨: {user.email}")
            
            # 프로필 완성도 계산
            profile_completeness = profile.get_profile_completion_percentage()
            
            response_data = {
                'success': True,
                'message': '현재 사용자 프로필 정보입니다.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                },
                'profile': {
                    'id': profile.id,
                    'nickname': profile.nickname,
                    'height': profile.height,
                    'weight': profile.weight,
                    'age': profile.age,
                    'gender': profile.gender,
                    'profile_image': profile.profile_image.url if profile.profile_image else None,
                    'bio': profile.bio,
                    'bmi': profile.get_bmi(),
                    'bmi_category': profile.get_bmi_category(),
                    'recommended_calories': profile.get_recommended_calories(),
                    'profile_completeness': profile_completeness,
                    'created_at': profile.created_at.isoformat(),
                    'updated_at': profile.updated_at.isoformat(),
                },
                'settings': {
                    'is_profile_public': profile.is_profile_public,
                    'email_notifications': profile.email_notifications,
                    'push_notifications': profile.push_notifications,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '현재 사용자 프로필 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class NicknameCheckView(APIView):
    """
    닉네임 중복 검사 API 뷰
    POST /api/auth/profile/nickname-check/
    
    요구사항:
    1. 닉네임 중복 검사 및 검증 로직
    2. 빠른 응답을 위한 별도 엔드포인트
    3. 실시간 중복 검사 지원
    """
    permission_classes = [AllowAny]  # 회원가입 시에도 사용할 수 있도록
    
    def post(self, request):
        """닉네임 중복 검사"""
        try:
            nickname = request.data.get('nickname', '').strip()
            current_user_id = request.data.get('current_user_id')  # 프로필 수정 시 현재 사용자 제외
            
            if not nickname:
                return Response({
                    'success': False,
                    'message': '닉네임을 입력해주세요.',
                    'error_code': 'NICKNAME_REQUIRED'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 닉네임 길이 검증
            if len(nickname) < 2:
                return Response({
                    'success': False,
                    'message': '닉네임은 2자 이상이어야 합니다.',
                    'error_code': 'NICKNAME_TOO_SHORT',
                    'available': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(nickname) > 50:
                return Response({
                    'success': False,
                    'message': '닉네임은 50자 이하여야 합니다.',
                    'error_code': 'NICKNAME_TOO_LONG',
                    'available': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 특수문자 검증 (영문, 한글, 숫자, 언더스코어만 허용)
            import re
            if not re.match(r'^[a-zA-Z0-9가-힣_]+$', nickname):
                return Response({
                    'success': False,
                    'message': '닉네임은 영문, 한글, 숫자, 언더스코어(_)만 사용할 수 있습니다.',
                    'error_code': 'NICKNAME_INVALID_CHARACTERS',
                    'available': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 중복 검사 (현재 사용자 제외)
            query = UserProfile.objects.filter(nickname=nickname)
            if current_user_id:
                query = query.exclude(user_id=current_user_id)
            
            is_duplicate = query.exists()
            
            if is_duplicate:
                return Response({
                    'success': False,
                    'message': '이미 사용 중인 닉네임입니다.',
                    'error_code': 'NICKNAME_ALREADY_EXISTS',
                    'available': False,
                    'nickname': nickname
                }, status=status.HTTP_200_OK)  # 중복은 200으로 반환 (정상적인 검사 결과)
            
            else:
                return Response({
                    'success': True,
                    'message': '사용 가능한 닉네임입니다.',
                    'available': True,
                    'nickname': nickname
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': '닉네임 검사 중 오류가 발생했습니다.',
                'error': str(e),
                'available': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordChangeView(APIView):
    """
    비밀번호 변경 API 뷰
    PUT /api/auth/password/change/
    
    요구사항:
    1. 현재 비밀번호 확인 후 새 비밀번호 변경 로직
    2. 비밀번호 강도 검증
    3. 변경 후 모든 세션 무효화 (보안)
    4. 비밀번호 변경 이력 기록
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """비밀번호 변경 처리"""
        try:
            user = request.user
            
            # 비밀번호 변경 데이터 검증
            serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                current_password = serializer.validated_data['current_password']
                new_password = serializer.validated_data['new_password']
                
                # 현재 비밀번호 확인
                if not user.check_password(current_password):
                    return Response({
                        'success': False,
                        'message': '현재 비밀번호가 올바르지 않습니다.',
                        'error_code': 'INVALID_CURRENT_PASSWORD'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 새 비밀번호가 현재 비밀번호와 같은지 확인
                if user.check_password(new_password):
                    return Response({
                        'success': False,
                        'message': '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
                        'error_code': 'SAME_AS_CURRENT_PASSWORD'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 데이터베이스 트랜잭션으로 안전하게 변경
                with transaction.atomic():
                    # 비밀번호 변경
                    user.set_password(new_password)
                    user.save()
                    
                    # 비밀번호 변경 시도 기록 (성공)
                    LoginAttemptService.record_attempt(
                        request, 
                        user.email, 
                        user, 
                        success=True, 
                        attempt_type='password_change'
                    )
                    
                    # 모든 Refresh Token 무효화 (보안 - 다른 기기에서 강제 로그아웃)
                    try:
                        JWTAuthService.revoke_all_tokens_for_user(user)
                    except Exception as token_error:
                        # 토큰 무효화 실패는 비밀번호 변경에 영향 없음
                        print(f"토큰 무효화 실패: {token_error}")
                
                # 새 JWT 토큰 생성 (현재 세션 유지를 위해)
                new_tokens = JWTAuthService.generate_tokens_with_extended_refresh(user, extend_refresh=False)
                
                response_data = {
                    'success': True,
                    'message': '비밀번호가 성공적으로 변경되었습니다.',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                    },
                    'auth': {
                        'access_token': new_tokens['access_token'],
                        'refresh_token': new_tokens['refresh_token'],
                        'token_type': 'Bearer',
                        'access_expires_at': new_tokens['access_expires_at'].isoformat(),
                        'refresh_expires_at': new_tokens['refresh_expires_at'].isoformat(),
                    },
                    'security_info': {
                        'all_sessions_revoked': True,
                        'new_tokens_issued': True,
                        'changed_at': timezone.now().isoformat()
                    }
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            else:
                # 비밀번호 변경 시도 기록 (실패)
                LoginAttemptService.record_attempt(
                    request, 
                    user.email, 
                    user, 
                    success=False, 
                    attempt_type='password_change'
                )
                
                return Response({
                    'success': False,
                    'message': '비밀번호 변경 데이터가 유효하지 않습니다.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': '비밀번호 변경 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    """
    비밀번호 재설정 요청 API 뷰
    POST /api/auth/password/reset/
    
    요구사항:
    1. 이메일 기반 비밀번호 재설정 토큰 생성 및 전송
    2. 존재하지 않는 이메일에도 동일한 응답 (보안)
    3. 토큰 만료 시간 설정 (15분)
    4. 이메일 전송 및 오류 처리
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """비밀번호 재설정 요청 처리"""
        try:
            # 비밀번호 재설정 요청 데이터 검증
            serializer = PasswordResetRequestSerializer(data=request.data)
            
            if serializer.is_valid():
                email = serializer.validated_data['email']
                
                # 사용자 찾기 (존재하지 않아도 보안상 동일한 응답)
                try:
                    user = User.objects.get(email=email)
                    user_exists = True
                except User.DoesNotExist:
                    user = None
                    user_exists = False
                
                if user_exists and user.is_active:
                    try:
                        # 비밀번호 재설정 토큰 생성 및 이메일 전송
                        reset_token = PasswordResetService.create_reset_token(user)
                        
                        # 이메일 전송 시도
                        email_sent = PasswordResetService.send_reset_email(
                            user, 
                            reset_token
                        )
                        
                        if email_sent:
                            # 재설정 요청 기록 (성공)
                            LoginAttemptService.record_attempt(
                                request, 
                                email, 
                                user, 
                                success=True, 
                                attempt_type='password_reset_request'
                            )
                            
                            actual_message = '비밀번호 재설정 이메일이 전송되었습니다.'
                        else:
                            actual_message = '비밀번호 재설정 토큰은 생성되었지만 이메일 전송에 실패했습니다.'
                    
                    except Exception as e:
                        # 토큰 생성/이메일 전송 실패
                        print(f"비밀번호 재설정 처리 오류: {e}")
                        actual_message = '비밀번호 재설정 처리 중 오류가 발생했습니다.'
                        
                        # 재설정 요청 기록 (실패)
                        LoginAttemptService.record_attempt(
                            request, 
                            email, 
                            user, 
                            success=False, 
                            attempt_type='password_reset_request'
                        )
                
                else:
                    # 사용자가 존재하지 않거나 비활성 상태
                    actual_message = '존재하지 않거나 비활성화된 사용자입니다.'
                    
                    # 재설정 요청 기록 (실패)
                    LoginAttemptService.record_attempt(
                        request, 
                        email, 
                        None, 
                        success=False, 
                        attempt_type='password_reset_request'
                    )
                
                # 보안을 위해 항상 성공 메시지 반환 (타이밍 공격 방지)
                response_data = {
                    'success': True,
                    'message': '해당 이메일로 비밀번호 재설정 안내가 전송되었습니다.',
                    'email': email,
                    'expires_in_minutes': 15,
                    'info': '이메일이 도착하지 않으면 스팸 폴더를 확인해주세요.'
                }
                
                # 개발 환경에서만 실제 메시지 포함 (디버깅용)
                from django.conf import settings
                if settings.DEBUG:
                    response_data['debug_info'] = {
                        'actual_message': actual_message,
                        'user_exists': user_exists,
                        'user_active': user.is_active if user else False
                    }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            else:
                return Response({
                    'success': False,
                    'message': '이메일 주소가 유효하지 않습니다.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': '비밀번호 재설정 요청 처리 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmView(APIView):
    """
    비밀번호 재설정 확인 API 뷰
    POST /api/auth/password/reset/confirm/
    
    요구사항:
    1. 토큰을 통한 비밀번호 재설정 확인
    2. 토큰 유효성 및 만료 시간 검증
    3. 새 비밀번호 강도 검증
    4. 재설정 후 모든 세션 무효화 및 새 토큰 발급
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """비밀번호 재설정 확인 처리"""
        try:
            # 비밀번호 재설정 확인 데이터 검증
            serializer = PasswordResetConfirmSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                token = serializer.validated_data['token']
                new_password = serializer.validated_data['new_password']
                
                # 토큰 유효성 검증
                try:
                    from .models import PasswordResetToken
                    reset_token = PasswordResetToken.objects.get(
                        token=token,
                        is_used=False
                    )
                    
                    # 토큰 유효성 확인
                    if not reset_token.is_valid():
                        return Response({
                            'success': False,
                            'message': '비밀번호 재설정 토큰이 만료되었거나 이미 사용되었습니다. 새로운 재설정 요청을 해주세요.',
                            'error_code': 'TOKEN_INVALID'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    user = reset_token.user
                    
                    # 사용자 활성 상태 확인
                    if not user.is_active:
                        return Response({
                            'success': False,
                            'message': '비활성화된 사용자 계정입니다.',
                            'error_code': 'USER_INACTIVE'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # 새 비밀번호가 현재 비밀번호와 같은지 확인
                    if user.check_password(new_password):
                        return Response({
                            'success': False,
                            'message': '새 비밀번호는 이전 비밀번호와 달라야 합니다.',
                            'error_code': 'SAME_AS_CURRENT_PASSWORD'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # 데이터베이스 트랜잭션으로 안전하게 처리
                    with transaction.atomic():
                        # 비밀번호 변경
                        user.set_password(new_password)
                        user.save()
                        
                        # 토큰 사용 처리
                        reset_token.mark_as_used()
                        
                        # 비밀번호 재설정 시도 기록 (성공)
                        LoginAttemptService.record_attempt(
                            request, 
                            user.email, 
                            user, 
                            success=True, 
                            attempt_type='password_reset_confirm'
                        )
                        
                        # 모든 Refresh Token 무효화 (보안)
                        try:
                            JWTAuthService.revoke_all_tokens_for_user(user)
                        except Exception as token_error:
                            print(f"토큰 무효화 실패: {token_error}")
                    
                    # 새 JWT 토큰 생성 (자동 로그인)
                    new_tokens = JWTAuthService.generate_tokens_with_extended_refresh(user, extend_refresh=False)
                    
                    response_data = {
                        'success': True,
                        'message': '비밀번호가 성공적으로 재설정되었습니다.',
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'username': user.username,
                        },
                        'auth': {
                            'access_token': new_tokens['access_token'],
                            'refresh_token': new_tokens['refresh_token'],
                            'token_type': 'Bearer',
                            'access_expires_at': new_tokens['access_expires_at'].isoformat(),
                            'refresh_expires_at': new_tokens['refresh_expires_at'].isoformat(),
                        },
                        'security_info': {
                            'all_sessions_revoked': True,
                            'auto_login_enabled': True,
                            'reset_at': timezone.now().isoformat(),
                            'token_used': True
                        }
                    }
                    
                    return Response(response_data, status=status.HTTP_200_OK)
                    
                except PasswordResetToken.DoesNotExist:
                    # 비밀번호 재설정 시도 기록 (실패 - 잘못된 토큰)
                    LoginAttemptService.record_attempt(
                        request, 
                        'unknown', 
                        None, 
                        success=False, 
                        attempt_type='password_reset_confirm'
                    )
                    
                    return Response({
                        'success': False,
                        'message': '유효하지 않은 비밀번호 재설정 토큰입니다.',
                        'error_code': 'INVALID_TOKEN'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
            else:
                return Response({
                    'success': False,
                    'message': '비밀번호 재설정 데이터가 유효하지 않습니다.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': '비밀번호 재설정 확인 처리 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========================
# 관리자 기능 API Views
# ========================

from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .decorators import IsAdminUser
from .serializers import AdminUserListSerializer, AdminUserDetailSerializer


class AdminUserListView(ListAPIView):
    """
    관리자용 사용자 목록 조회 API
    GET /api/admin/users/
    
    기능:
    - 전체 사용자 목록 조회
    - 검색: username, email, first_name, last_name
    - 필터링: is_active, is_staff, date_joined
    - 정렬: date_joined, last_login, email
    - 페이지네이션: 기본 20개씩
    """
    
    queryset = User.objects.select_related('profile').all()
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdminUser]
    
    # 검색 기능
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    # 필터링 기능
    filterset_fields = {
        'is_active': ['exact'],
        'is_staff': ['exact'],
        'is_superuser': ['exact'],
        'date_joined': ['gte', 'lte', 'exact'],
        'last_login': ['gte', 'lte', 'isnull'],
    }
    
    # 정렬 기능
    ordering_fields = ['date_joined', 'last_login', 'email', 'username']
    ordering = ['-date_joined']  # 기본 정렬: 최신 가입순
    
    def get_queryset(self):
        """
        관리자용 사용자 쿼리셋
        프로필 정보도 함께 가져오기 위해 select_related 사용
        """
        queryset = super().get_queryset()
        
        # 추가 필터링 로직 (필요시)
        role_filter = self.request.query_params.get('role', None)
        if role_filter == 'admin':
            queryset = queryset.filter(is_staff=True)
        elif role_filter == 'user':
            queryset = queryset.filter(is_staff=False)
        elif role_filter == 'superuser':
            queryset = queryset.filter(is_superuser=True)
        
        # 활성 상태 필터
        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """사용자 목록 조회 응답 커스터마이징"""
        response = super().list(request, *args, **kwargs)
        
        # 통계 정보 추가
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        staff_users = User.objects.filter(is_staff=True).count()
        
        # 응답 데이터 구조화
        custom_response = {
            'success': True,
            'message': '사용자 목록 조회가 완료되었습니다.',
            'statistics': {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users,
                'staff_users': staff_users,
                'regular_users': total_users - staff_users,
            },
            'pagination': {
                'count': response.data.get('count', 0),
                'next': response.data.get('next'),
                'previous': response.data.get('previous'),
            },
            'users': response.data.get('results', [])
        }
        
        response.data = custom_response
        return response


class AdminUserDetailView(RetrieveUpdateAPIView):
    """
    관리자용 사용자 상세 조회/수정 API
    GET/PUT /api/admin/users/{id}/
    
    기능:
    - 특정 사용자 상세 정보 조회
    - 사용자 계정 상태 수정 (활성화/비활성화)
    - 관리자 권한 부여/해제
    - 사용자 기본 정보 수정
    """
    
    queryset = User.objects.select_related('profile').all()
    serializer_class = AdminUserDetailSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id'
    
    def retrieve(self, request, *args, **kwargs):
        """사용자 상세 정보 조회"""
        try:
            user = self.get_object()
            serializer = self.get_serializer(user)
            
            # 추가 정보 수집
            login_attempts = LoginAttempt.objects.filter(
                username=user.email
            ).order_by('-attempted_at')[:10]
            
            # 최근 활동 정보
            recent_activity = {
                'login_attempts_count': login_attempts.count(),
                'last_successful_login': None,
                'failed_login_attempts': 0,
            }
            
            # 로그인 시도 분석
            for attempt in login_attempts:
                if attempt.is_successful and not recent_activity['last_successful_login']:
                    recent_activity['last_successful_login'] = attempt.attempted_at
                elif not attempt.is_successful:
                    recent_activity['failed_login_attempts'] += 1
            
            response_data = {
                'success': True,
                'message': '사용자 상세 정보 조회가 완료되었습니다.',
                'user': serializer.data,
                'recent_activity': recent_activity,
                'permissions': {
                    'can_modify': request.user.is_superuser or request.user.id != user.id,
                    'can_delete': request.user.is_superuser and request.user.id != user.id,
                    'can_change_staff_status': request.user.is_superuser,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '사용자 정보 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """사용자 정보 수정"""
        try:
            user = self.get_object()
            
            # 자기 자신의 권한 수정 방지
            if user.id == request.user.id and 'is_staff' in request.data:
                return Response({
                    'success': False,
                    'message': '자신의 관리자 권한은 수정할 수 없습니다.',
                    'error_code': 'SELF_PERMISSION_MODIFY_DENIED'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 슈퍼유저만 스태프 권한 변경 가능
            if 'is_staff' in request.data and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '관리자 권한 변경은 슈퍼유저만 가능합니다.',
                    'error_code': 'INSUFFICIENT_PERMISSION'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 슈퍼유저 권한 변경 시 추가 확인
            if 'is_superuser' in request.data and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '슈퍼유저 권한 변경은 슈퍼유저만 가능합니다.',
                    'error_code': 'SUPERUSER_PERMISSION_REQUIRED'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 데이터베이스 트랜잭션으로 안전하게 처리
            with transaction.atomic():
                # 기본 serializer 업데이트
                serializer = self.get_serializer(user, data=request.data, partial=True)
                
                if serializer.is_valid():
                    updated_user = serializer.save()
                    
                    # 관리자 활동 로그 기록
                    action_type = 'user_update'
                    if 'is_active' in request.data:
                        action_type = 'user_activation' if request.data['is_active'] else 'user_deactivation'
                    elif 'is_staff' in request.data:
                        action_type = 'staff_permission_change'
                    
                    # 로그 기록 (LoginAttempt 모델 재활용)
                    LoginAttemptService.record_attempt(
                        request,
                        f'admin_action_{action_type}',
                        request.user,
                        success=True,
                        attempt_type=f'admin_{action_type}'
                    )
                    
                    response_data = {
                        'success': True,
                        'message': '사용자 정보가 성공적으로 수정되었습니다.',
                        'user': AdminUserDetailSerializer(updated_user).data,
                        'changes': {
                            'modified_by': request.user.email,
                            'modified_at': timezone.now().isoformat(),
                            'action_type': action_type,
                        }
                    }
                    
                    return Response(response_data, status=status.HTTP_200_OK)
                
                else:
                    return Response({
                        'success': False,
                        'message': '입력 데이터가 유효하지 않습니다.',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            return Response({
                'success': False,
                'message': '사용자 정보 수정 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserBulkActionView(APIView):
    """
    관리자용 사용자 일괄 작업 API
    POST /api/admin/users/bulk-action/
    
    기능:
    - 다수 사용자 일괄 활성화/비활성화
    - 다수 사용자 일괄 삭제 (슈퍼유저만)
    - 다수 사용자 일괄 권한 변경
    """
    
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """일괄 작업 처리"""
        try:
            action = request.data.get('action')
            user_ids = request.data.get('user_ids', [])
            
            if not action or not user_ids:
                return Response({
                    'success': False,
                    'message': '작업 타입과 사용자 ID 목록이 필요합니다.',
                    'error_code': 'MISSING_PARAMETERS'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 자기 자신 제외
            user_ids = [uid for uid in user_ids if uid != request.user.id]
            
            if not user_ids:
                return Response({
                    'success': False,
                    'message': '작업할 사용자가 없습니다.',
                    'error_code': 'NO_VALID_USERS'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            users = User.objects.filter(id__in=user_ids)
            
            if not users.exists():
                return Response({
                    'success': False,
                    'message': '선택된 사용자를 찾을 수 없습니다.',
                    'error_code': 'USERS_NOT_FOUND'
                }, status=status.HTTP_404_NOT_FOUND)
            
            success_count = 0
            failed_count = 0
            
            with transaction.atomic():
                for user in users:
                    try:
                        if action == 'activate':
                            user.is_active = True
                            user.save()
                            success_count += 1
                            
                        elif action == 'deactivate':
                            user.is_active = False
                            user.save()
                            success_count += 1
                            
                        elif action == 'make_staff' and request.user.is_superuser:
                            user.is_staff = True
                            user.save()
                            success_count += 1
                            
                        elif action == 'remove_staff' and request.user.is_superuser:
                            user.is_staff = False
                            user.save()
                            success_count += 1
                            
                        else:
                            failed_count += 1
                            
                    except Exception:
                        failed_count += 1
                
                # 관리자 활동 로그
                LoginAttemptService.record_attempt(
                    request,
                    f'admin_bulk_{action}',
                    request.user,
                    success=success_count > 0,
                    attempt_type=f'admin_bulk_action'
                )
            
            return Response({
                'success': True,
                'message': f'일괄 작업이 완료되었습니다.',
                'results': {
                    'action': action,
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'total_count': len(user_ids),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '일괄 작업 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 관리자 기능 API

from .decorators import IsAdminUser, IsSuperUser
from .serializers import AdminUserListSerializer, AdminUserDetailSerializer
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserListView(APIView):
    """
    관리자용 사용자 목록 API 뷰
    GET /api/auth/admin/users/
    
    요구사항:
    1. 사용자 목록 조회 및 페이지네이션
    2. 검색 및 필터링 기능
    3. 통계 정보 포함
    4. 관리자 권한 검증
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """사용자 목록 조회"""
        try:
            # 쿼리 파라미터 추출
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            search = request.GET.get('search', '').strip()
            is_active = request.GET.get('is_active')
            is_staff = request.GET.get('is_staff')
            order_by = request.GET.get('order_by', '-date_joined')
            
            # 기본 쿼리셋
            queryset = User.objects.select_related('profile').all()
            
            # 검색 필터
            if search:
                queryset = queryset.filter(
                    Q(email__icontains=search) |
                    Q(username__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(profile__nickname__icontains=search)
                )
            
            # 활성 상태 필터
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            # 스태프 권한 필터
            if is_staff is not None:
                queryset = queryset.filter(is_staff=is_staff.lower() == 'true')
            
            # 정렬
            valid_order_fields = [
                'date_joined', '-date_joined',
                'last_login', '-last_login',
                'email', '-email',
                'is_active', '-is_active'
            ]
            if order_by in valid_order_fields:
                queryset = queryset.order_by(order_by)
            
            # 통계 정보 계산
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            staff_users = User.objects.filter(is_staff=True).count()
            
            # 페이지네이션
            paginator = Paginator(queryset, page_size)
            
            if page > paginator.num_pages:
                page = paginator.num_pages
            
            page_obj = paginator.get_page(page)
            
            # 시리얼라이저로 데이터 변환
            serializer = AdminUserListSerializer(page_obj.object_list, many=True)
            
            response_data = {
                'success': True,
                'message': '사용자 목록을 성공적으로 조회했습니다.',
                'users': serializer.data,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'page_size': page_size,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous(),
                },
                'statistics': {
                    'total_users': total_users,
                    'active_users': active_users,
                    'inactive_users': total_users - active_users,
                    'staff_users': staff_users,
                },
                'filters': {
                    'search': search,
                    'is_active': is_active,
                    'is_staff': is_staff,
                    'order_by': order_by,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '사용자 목록 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserDetailView(APIView):
    """
    관리자용 사용자 상세 API 뷰
    GET/PUT /api/auth/admin/users/{id}/
    
    요구사항:
    1. 사용자 상세 정보 조회
    2. 사용자 계정 활성화/비활성화 기능
    3. 사용자 정보 수정 기능
    4. 권한 관리 (슈퍼유저만 스태프 권한 변경 가능)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_user_or_404(self, user_id):
        """사용자 조회 또는 404 에러"""
        try:
            return User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return None
    
    def get(self, request, user_id):
        """사용자 상세 정보 조회"""
        try:
            user = self.get_user_or_404(user_id)
            if not user:
                return Response({
                    'success': False,
                    'message': '사용자를 찾을 수 없습니다.',
                    'error_code': 'USER_NOT_FOUND'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 시리얼라이저로 데이터 변환
            serializer = AdminUserDetailSerializer(user)
            
            response_data = {
                'success': True,
                'message': '사용자 상세 정보를 성공적으로 조회했습니다.',
                'user': serializer.data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '사용자 상세 정보 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, user_id):
        """사용자 정보 수정"""
        try:
            user = self.get_user_or_404(user_id)
            if not user:
                return Response({
                    'success': False,
                    'message': '사용자를 찾을 수 없습니다.',
                    'error_code': 'USER_NOT_FOUND'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 자기 자신 수정 방지
            if user.id == request.user.id:
                return Response({
                    'success': False,
                    'message': '자기 자신의 계정은 수정할 수 없습니다.',
                    'error_code': 'CANNOT_MODIFY_SELF'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 스태프 권한 변경은 슈퍼유저만 가능
            if 'is_staff' in request.data and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '스태프 권한 변경은 슈퍼유저만 가능합니다.',
                    'error_code': 'SUPERUSER_REQUIRED'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 슈퍼유저 권한 변경 방지
            if 'is_superuser' in request.data:
                return Response({
                    'success': False,
                    'message': '슈퍼유저 권한은 변경할 수 없습니다.',
                    'error_code': 'CANNOT_MODIFY_SUPERUSER'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 데이터베이스 트랜잭션으로 안전하게 수정
            with transaction.atomic():
                # 사용자 기본 정보 수정
                if 'first_name' in request.data:
                    user.first_name = request.data['first_name']
                if 'last_name' in request.data:
                    user.last_name = request.data['last_name']
                if 'is_active' in request.data:
                    user.is_active = request.data['is_active']
                if 'is_staff' in request.data and request.user.is_superuser:
                    user.is_staff = request.data['is_staff']
                
                user.save()
                
                # 관리자 활동 로그 기록
                LoginAttemptService.record_attempt(
                    request,
                    user.email,
                    request.user,
                    success=True,
                    attempt_type='admin_user_update'
                )
            
            # 업데이트된 사용자 정보 반환
            serializer = AdminUserDetailSerializer(user)
            
            response_data = {
                'success': True,
                'message': '사용자 정보가 성공적으로 수정되었습니다.',
                'user': serializer.data,
                'changes': {
                    'modified_by': request.user.email,
                    'modified_at': timezone.now().isoformat(),
                    'modified_fields': list(request.data.keys())
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '사용자 정보 수정 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserBulkActionView(APIView):
    """
    관리자용 사용자 일괄 작업 API 뷰
    POST /api/auth/admin/users/bulk-action/
    
    요구사항:
    1. 여러 사용자 일괄 활성화/비활성화
    2. 여러 사용자 일괄 스태프 권한 부여/제거 (슈퍼유저만)
    3. 작업 결과 통계 제공
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """사용자 일괄 작업 처리"""
        try:
            action = request.data.get('action')
            user_ids = request.data.get('user_ids', [])
            
            # 입력 데이터 검증
            if not action:
                return Response({
                    'success': False,
                    'message': '작업 유형을 지정해주세요.',
                    'error_code': 'ACTION_REQUIRED'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not user_ids or not isinstance(user_ids, list):
                return Response({
                    'success': False,
                    'message': '사용자 ID 목록을 제공해주세요.',
                    'error_code': 'USER_IDS_REQUIRED'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 지원하는 작업 유형 확인
            valid_actions = ['activate', 'deactivate', 'grant_staff', 'revoke_staff']
            if action not in valid_actions:
                return Response({
                    'success': False,
                    'message': f'지원하지 않는 작업 유형입니다. 사용 가능한 작업: {", ".join(valid_actions)}',
                    'error_code': 'INVALID_ACTION'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 스태프 권한 관련 작업은 슈퍼유저만 가능
            if action in ['grant_staff', 'revoke_staff'] and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '스태프 권한 관련 작업은 슈퍼유저만 가능합니다.',
                    'error_code': 'SUPERUSER_REQUIRED'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 사용자 조회
            users = User.objects.filter(id__in=user_ids)
            found_user_ids = set(users.values_list('id', flat=True))
            missing_user_ids = set(user_ids) - found_user_ids
            
            # 자기 자신 제외
            users = users.exclude(id=request.user.id)
            excluded_self = request.user.id in user_ids
            
            success_count = 0
            failed_count = 0
            results = []
            
            # 데이터베이스 트랜잭션으로 안전하게 처리
            with transaction.atomic():
                for user in users:
                    try:
                        if action == 'activate':
                            user.is_active = True
                        elif action == 'deactivate':
                            user.is_active = False
                        elif action == 'grant_staff':
                            user.is_staff = True
                        elif action == 'revoke_staff':
                            user.is_staff = False
                        
                        user.save()
                        success_count += 1
                        results.append({
                            'user_id': user.id,
                            'email': user.email,
                            'status': 'success'
                        })
                        
                    except Exception as e:
                        failed_count += 1
                        results.append({
                            'user_id': user.id,
                            'email': user.email if hasattr(user, 'email') else 'Unknown',
                            'status': 'failed',
                            'error': str(e)
                        })
                
                # 관리자 활동 로그 기록
                LoginAttemptService.record_attempt(
                    request,
                    f"bulk_action_{action}",
                    request.user,
                    success=True,
                    attempt_type='admin_bulk_action'
                )
            
            response_data = {
                'success': True,
                'message': f'일괄 작업이 완료되었습니다. 성공: {success_count}건, 실패: {failed_count}건',
                'results': {
                    'action': action,
                    'total_count': len(user_ids),
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'missing_users': len(missing_user_ids),
                    'excluded_self': excluded_self,
                    'details': results
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '일괄 작업 처리 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminStatisticsView(APIView):
    """
    관리자용 통계 API 뷰
    GET /api/auth/admin/statistics/
    
    요구사항:
    1. 전체 시스템 통계 조회
    2. 사용자 현황 통계
    3. 가입 통계 (일별, 주별, 월별)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """시스템 통계 조회"""
        try:
            # 현재 시간 기준
            now = timezone.now()
            today = now.date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # 기본 사용자 통계
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            inactive_users = total_users - active_users
            staff_users = User.objects.filter(is_staff=True).count()
            superuser_count = User.objects.filter(is_superuser=True).count()
            
            # 가입 통계
            today_registrations = User.objects.filter(date_joined__date=today).count()
            week_registrations = User.objects.filter(date_joined__date__gte=week_ago).count()
            month_registrations = User.objects.filter(date_joined__date__gte=month_ago).count()
            
            # 로그인 통계
            today_logins = User.objects.filter(last_login__date=today).count()
            week_logins = User.objects.filter(last_login__date__gte=week_ago).count()
            
            # 프로필 완성 통계
            complete_profiles = UserProfile.objects.filter(
                height__isnull=False,
                weight__isnull=False,
                age__isnull=False,
                gender__isnull=False
            ).count()
            
            # 최근 활동 사용자 (7일 이내 로그인)
            recent_active_users = User.objects.filter(
                last_login__gte=now - timedelta(days=7)
            ).count()
            
            response_data = {
                'success': True,
                'message': '시스템 통계를 성공적으로 조회했습니다.',
                'statistics': {
                    # 기본 사용자 통계
                    'total_users': total_users,
                    'active_users': active_users,
                    'inactive_users': inactive_users,
                    'staff_users': staff_users,
                    'superuser_count': superuser_count,
                    
                    # 가입 통계
                    'today_registrations': today_registrations,
                    'week_registrations': week_registrations,
                    'month_registrations': month_registrations,
                    
                    # 로그인 통계
                    'today_logins': today_logins,
                    'week_logins': week_logins,
                    'recent_active_users': recent_active_users,
                    
                    # 프로필 통계
                    'complete_profiles': complete_profiles,
                    'incomplete_profiles': total_users - complete_profiles,
                    'profile_completion_rate': round((complete_profiles / total_users * 100) if total_users > 0 else 0, 2),
                },
                'generated_at': now.isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': '통계 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========================
# 관리자 기능 API Views
# ========================

@method_decorator(csrf_exempt, name='dispatch')
class AdminUserListView(APIView):
    """
    관리자용 사용자 목록 API
    GET /api/auth/admin/users/
    
    기능:
    - 사용자 목록 조회 (페이지네이션)
    - 검색 및 필터링
    - 통계 정보 제공
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """사용자 목록 조회"""
        try:
            # 쿼리 파라미터 처리
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 20)), 100)  # 최대 100개
            search = request.GET.get('search', '').strip()
            is_active = request.GET.get('is_active')
            is_staff = request.GET.get('is_staff')
            
            # 기본 쿼리셋
            queryset = User.objects.select_related('profile').order_by('-date_joined')
            
            # 검색 필터
            if search:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(profile__nickname__icontains=search)
                )
            
            # 활성 상태 필터
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            # 스태프 상태 필터
            if is_staff is not None:
                queryset = queryset.filter(is_staff=is_staff.lower() == 'true')
            
            # 전체 통계
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            staff_users = User.objects.filter(is_staff=True).count()
            
            # 페이지네이션
            from django.core.paginator import Paginator
            paginator = Paginator(queryset, page_size)
            
            if page > paginator.num_pages:
                page = paginator.num_pages
            
            page_obj = paginator.get_page(page)
            
            # 시리얼라이저 적용
            from .serializers import AdminUserListSerializer
            serializer = AdminUserListSerializer(page_obj.object_list, many=True)
            
            response_data = {
                'success': True,
                'users': serializer.data,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'page_size': page_size,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous(),
                },
                'statistics': {
                    'total_users': total_users,
                    'active_users': active_users,
                    'inactive_users': total_users - active_users,
                    'staff_users': staff_users,
                },
                'filters': {
                    'search': search,
                    'is_active': is_active,
                    'is_staff': is_staff,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"관리자 사용자 목록 조회 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '사용자 목록 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserDetailView(APIView):
    """
    관리자용 사용자 상세 API
    GET /api/auth/admin/users/{user_id}/
    PUT /api/auth/admin/users/{user_id}/
    
    기능:
    - 사용자 상세 정보 조회
    - 사용자 정보 수정 (활성화/비활성화, 스태프 권한 등)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_user_or_404(self, user_id):
        """사용자 조회 또는 404 에러"""
        try:
            return User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return None
    
    def get(self, request, user_id):
        """사용자 상세 정보 조회"""
        try:
            user = self.get_user_or_404(user_id)
            if not user:
                return Response({
                    'success': False,
                    'message': '사용자를 찾을 수 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            from .serializers import AdminUserDetailSerializer
            serializer = AdminUserDetailSerializer(user)
            
            return Response({
                'success': True,
                'user': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"관리자 사용자 상세 조회 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '사용자 정보 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, user_id):
        """사용자 정보 수정"""
        try:
            user = self.get_user_or_404(user_id)
            if not user:
                return Response({
                    'success': False,
                    'message': '사용자를 찾을 수 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 자기 자신 수정 방지
            if user.id == request.user.id:
                return Response({
                    'success': False,
                    'message': '자기 자신의 계정은 수정할 수 없습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 슈퍼유저 권한이 필요한 작업 확인
            if 'is_staff' in request.data or 'is_superuser' in request.data:
                if not request.user.is_superuser:
                    return Response({
                        'success': False,
                        'message': '스태프 권한 변경은 슈퍼유저만 가능합니다.'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # 수정 가능한 필드들
            allowed_fields = ['first_name', 'last_name', 'is_active']
            if request.user.is_superuser:
                allowed_fields.extend(['is_staff', 'is_superuser'])
            
            # 데이터 업데이트
            updated_fields = []
            with transaction.atomic():
                for field in allowed_fields:
                    if field in request.data:
                        old_value = getattr(user, field)
                        new_value = request.data[field]
                        
                        if old_value != new_value:
                            setattr(user, field, new_value)
                            updated_fields.append(field)
                
                if updated_fields:
                    user.save()
                    
                    # 로그 기록
                    logger.info(f"관리자 {request.user.email}가 사용자 {user.email} 정보 수정: {updated_fields}")
            
            from .serializers import AdminUserDetailSerializer
            serializer = AdminUserDetailSerializer(user)
            
            return Response({
                'success': True,
                'message': '사용자 정보가 성공적으로 업데이트되었습니다.',
                'user': serializer.data,
                'changes': {
                    'updated_fields': updated_fields,
                    'modified_by': request.user.email,
                    'modified_at': timezone.now().isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"관리자 사용자 수정 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '사용자 정보 수정 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserBulkActionView(APIView):
    """
    관리자용 사용자 일괄 작업 API
    POST /api/auth/admin/users/bulk-action/
    
    기능:
    - 여러 사용자 일괄 활성화/비활성화
    - 여러 사용자 일괄 스태프 권한 부여/제거
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """일괄 작업 처리"""
        try:
            action = request.data.get('action')
            user_ids = request.data.get('user_ids', [])
            
            if not action or not user_ids:
                return Response({
                    'success': False,
                    'message': 'action과 user_ids는 필수입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 지원하는 액션 확인
            allowed_actions = ['activate', 'deactivate', 'make_staff', 'remove_staff']
            if action not in allowed_actions:
                return Response({
                    'success': False,
                    'message': f'지원하지 않는 액션입니다. 사용 가능: {allowed_actions}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 스태프 권한 변경은 슈퍼유저만 가능
            if action in ['make_staff', 'remove_staff'] and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '스태프 권한 변경은 슈퍼유저만 가능합니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 사용자 조회 (자기 자신 제외)
            users = User.objects.filter(
                id__in=user_ids
            ).exclude(id=request.user.id)
            
            success_count = 0
            failed_count = 0
            results = []
            
            with transaction.atomic():
                for user in users:
                    try:
                        if action == 'activate':
                            user.is_active = True
                        elif action == 'deactivate':
                            user.is_active = False
                        elif action == 'make_staff':
                            user.is_staff = True
                        elif action == 'remove_staff':
                            user.is_staff = False
                        
                        user.save()
                        success_count += 1
                        results.append({
                            'user_id': user.id,
                            'email': user.email,
                            'status': 'success'
                        })
                        
                    except Exception as e:
                        failed_count += 1
                        results.append({
                            'user_id': user.id,
                            'email': user.email,
                            'status': 'failed',
                            'error': str(e)
                        })
            
            # 로그 기록
            logger.info(f"관리자 {request.user.email}가 일괄 작업 수행: {action}, 성공: {success_count}, 실패: {failed_count}")
            
            return Response({
                'success': True,
                'message': f'일괄 작업이 완료되었습니다.',
                'results': {
                    'action': action,
                    'total_count': len(user_ids),
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'details': results
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"관리자 일괄 작업 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '일괄 작업 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AdminStatisticsView(APIView):
    """
    관리자용 통계 API
    GET /api/auth/admin/statistics/
    
    기능:
    - 사용자 통계 정보 제공
    - 가입 현황, 활동 상태 등
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """통계 정보 조회"""
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            now = timezone.now()
            today = now.date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # 기본 사용자 통계
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            inactive_users = total_users - active_users
            staff_users = User.objects.filter(is_staff=True).count()
            superuser_count = User.objects.filter(is_superuser=True).count()
            
            # 가입 통계
            today_registrations = User.objects.filter(date_joined__date=today).count()
            week_registrations = User.objects.filter(date_joined__date__gte=week_ago).count()
            month_registrations = User.objects.filter(date_joined__date__gte=month_ago).count()
            
            # 로그인 통계
            recent_logins = User.objects.filter(
                last_login__gte=now - timedelta(days=7)
            ).count()
            
            # 프로필 완성 통계
            complete_profiles = UserProfile.objects.filter(
                height__isnull=False,
                weight__isnull=False,
                age__isnull=False,
                gender__isnull=False
            ).count()
            
            statistics = {
                'users': {
                    'total_users': total_users,
                    'active_users': active_users,
                    'inactive_users': inactive_users,
                    'staff_users': staff_users,
                    'superuser_count': superuser_count,
                },
                'registrations': {
                    'today_registrations': today_registrations,
                    'week_registrations': week_registrations,
                    'month_registrations': month_registrations,
                },
                'activity': {
                    'recent_logins': recent_logins,
                    'complete_profiles': complete_profiles,
                    'profile_completion_rate': round(
                        (complete_profiles / total_users * 100) if total_users > 0 else 0, 2
                    ),
                },
                'generated_at': now.isoformat()
            }
            
            return Response({
                'success': True,
                'statistics': statistics
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"관리자 통계 조회 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '통계 정보 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)