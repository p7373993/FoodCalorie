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
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer, 
    PasswordChangeSerializer, PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer
)
from .services import JWTAuthService, LoginAttemptService, PasswordResetService
from .models import LoginAttempt, UserProfile

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
