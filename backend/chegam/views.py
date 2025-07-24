from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db.models import Q
from datetime import datetime, timedelta
from .models import UserProfile, Meal, WeightEntry, Badge, GamificationProfile, Challenge
from .serializers import (
    UserProfileSerializer, MealSerializer, MealCreateSerializer,
    WeightEntrySerializer, WeightEntryCreateSerializer, BadgeSerializer,
    GamificationProfileSerializer, ChallengeSerializer, ChallengeCreateSerializer,
    CalendarMealSerializer
)
from .services import GamificationService, AICoachingService


class UserProfileView(generics.RetrieveUpdateAPIView):
    """사용자 프로필 조회/수정"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class MealListCreateView(generics.ListCreateAPIView):
    """식단 목록 조회 및 생성"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MealCreateSerializer
        return MealSerializer
    
    def get_queryset(self):
        return Meal.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        meal = serializer.save()
        # 게임화 포인트 추가
        GamificationService.award_points(self.request.user, 'record_meal')


class MealDetailView(generics.RetrieveUpdateDestroyAPIView):
    """식단 상세 조회/수정/삭제"""
    serializer_class = MealSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Meal.objects.filter(user=self.request.user)


class WeightEntryListCreateView(generics.ListCreateAPIView):
    """체중 기록 목록 조회 및 생성"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WeightEntryCreateSerializer
        return WeightEntrySerializer
    
    def get_queryset(self):
        return WeightEntry.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        weight_entry = serializer.save()
        # 게임화 포인트 추가
        GamificationService.award_points(self.request.user, 'record_weight')


class GamificationProfileView(generics.RetrieveAPIView):
    """게임화 프로필 조회"""
    serializer_class = GamificationProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = GamificationProfile.objects.get_or_create(user=self.request.user)
        return profile


class ChallengeListCreateView(generics.ListCreateAPIView):
    """챌린지 목록 조회 및 생성"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ChallengeCreateSerializer
        return ChallengeSerializer
    
    def get_queryset(self):
        return Challenge.objects.all()
    
    def perform_create(self, serializer):
        challenge = serializer.save()
        # 게임화 포인트 및 배지 추가
        GamificationService.award_points(self.request.user, 'create_challenge')


class ChallengeDetailView(generics.RetrieveAPIView):
    """챌린지 상세 조회"""
    serializer_class = ChallengeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Challenge.objects.all()


class ChallengeJoinView(APIView):
    """챌린지 참여"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            challenge = Challenge.objects.get(pk=pk)
            if request.user not in challenge.participants.all():
                challenge.participants.add(request.user)
                # 게임화 포인트 추가
                GamificationService.award_points(request.user, 'join_challenge')
                return Response({'message': '챌린지에 참여했습니다.'})
            else:
                return Response({'message': '이미 참여 중인 챌린지입니다.'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        except Challenge.DoesNotExist:
            return Response({'error': '챌린지를 찾을 수 없습니다.'}, 
                          status=status.HTTP_404_NOT_FOUND)


class CalendarMealsView(generics.ListAPIView):
    """캘린더용 식단 조회"""
    serializer_class = CalendarMealSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        if year and month:
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
            
            return Meal.objects.filter(
                user=self.request.user,
                timestamp__date__gte=start_date.date(),
                timestamp__date__lte=end_date.date()
            )
        
        return Meal.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_coaching_view(request):
    """AI 식단 코칭"""
    meal_data = request.data.get('meal_data', {})
    coaching_type = request.data.get('type', 'meal_feedback')  # meal_feedback, weekly_report, insights
    
    try:
        if coaching_type == 'meal_feedback':
            result = AICoachingService.get_meal_coaching(meal_data)
        elif coaching_type == 'weekly_report':
            user_data = AICoachingService.get_user_weekly_data(request.user)
            result = AICoachingService.generate_weekly_report(user_data)
        elif coaching_type == 'insights':
            user_data = AICoachingService.get_user_weekly_data(request.user)
            result = AICoachingService.generate_insights(user_data)
        else:
            return Response({'error': '지원하지 않는 코칭 타입입니다.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'coaching': result})
    
    except Exception as e:
        return Response({'error': f'AI 코칭 생성 중 오류가 발생했습니다: {str(e)}'}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_gamification_view(request):
    """게임화 데이터 업데이트"""
    action = request.data.get('action')
    
    if action not in ['record_meal', 'record_weight', 'create_challenge', 'join_challenge']:
        return Response({'error': '유효하지 않은 액션입니다.'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    try:
        points_awarded, badges_awarded = GamificationService.award_points(request.user, action)
        
        # 업데이트된 프로필 반환
        profile = GamificationProfile.objects.get(user=request.user)
        serializer = GamificationProfileSerializer(profile)
        
        return Response({
            'profile': serializer.data,
            'points_awarded': points_awarded,
            'badges_awarded': badges_awarded
        })
    
    except Exception as e:
        return Response({'error': f'게임화 업데이트 중 오류가 발생했습니다: {str(e)}'}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)