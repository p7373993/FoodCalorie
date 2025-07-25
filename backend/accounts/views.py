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


class LoginView(APIView):
    """로그인 API - 임시 구현"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        # TODO: 로그인 로직 구현
        return Response({
            'message': '로그인 API - 구현 예정',
            'data': request.data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """로그아웃 API - 임시 구현"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # TODO: 로그아웃 로직 구현
        return Response({
            'message': '로그아웃 API - 구현 예정'
        }, status=status.HTTP_200_OK)


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
