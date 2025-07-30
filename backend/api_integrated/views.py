from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsOwnerOrReadOnly, IsDebugMode
from .models import MealLog, AICoachTip, WeightRecord
from .serializers import MealLogSerializer, AICoachTipSerializer, UserSerializer
from datetime import datetime, timedelta
from django.db.models import Q, Avg, Sum, Count
from django.db import models
from django.contrib.auth.models import User
from calendar import monthrange
from collections import defaultdict
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

# 파일 업로드 관련 임포트
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import pandas as pd
import base64
import requests
import re
import json
from django.conf import settings
import csv

# CSV 파일 경로 수정
CSV_FILE_PATH = os.path.join(settings.BASE_DIR, '음식만개등급화.csv')
KOREAN_FOOD_CSV_PATH = os.path.join(settings.BASE_DIR, 'korean_food_nutri_score_final.csv')

# CSV 파일 로드
food_data_df = None
try:
    if os.path.exists(CSV_FILE_PATH):
        food_data_df = pd.read_csv(CSV_FILE_PATH, encoding='utf-8')
        print(f"✅ CSV 파일 로드 성공: {CSV_FILE_PATH}")
    elif os.path.exists(KOREAN_FOOD_CSV_PATH):
        food_data_df = pd.read_csv(KOREAN_FOOD_CSV_PATH, encoding='utf-8')
        print(f"✅ 한국 음식 CSV 파일 로드 성공: {KOREAN_FOOD_CSV_PATH}")
    else:
        print(f"⚠️ CSV 파일을 찾을 수 없습니다.")
except Exception as e:
    food_data_df = None
    print(f"❌ CSV 파일 로드 실패: {e}")

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "success": True,
                "data": {
                    "username": user.username,
                    "email": user.email,
                    "token": token.key
                },
                "message": "User registered successfully"
            }, status=status.HTTP_201_CREATED)
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                "success": False, 
                "message": "Invalid credentials"
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=user_obj.username, password=password)
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "success": True,
                "data": {
                    "username": user.username,
                    "email": user.email,
                    "token": token.key
                },
                "message": "Logged in successfully"
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False, 
            "message": "Invalid credentials"
        }, status=status.HTTP_400_BAD_REQUEST)

class MealLogViewSet(viewsets.ModelViewSet):
    queryset = MealLog.objects.all()
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = MealLog.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date=report_date)
            except ValueError:
                pass
        return queryset.order_by('-date', '-time')

    def perform_create(self, serializer):
        """MealLog 생성 시 현재 사용자를 자동으로 설정"""
        try:
            meal_log = serializer.save(user=self.request.user)
            print(f"✅ MealLog 생성 성공: {meal_log}")
        except Exception as e:
            print(f"❌ MealLog 생성 실패: {e}")
            raise

class ImageUploadView(APIView):
    """이미지 파일만 업로드하는 API"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if 'image' not in request.FILES:
            return Response({
                "success": False, 
                "message": "No image file provided"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            image_file = request.FILES['image']
            
            # 파일 저장
            file_name = default_storage.save(
                os.path.join('meal_images', image_file.name), 
                ContentFile(image_file.read())
            )
            
            # 절대 URL 생성
            image_url = request.build_absolute_uri(default_storage.url(file_name))
            
            return Response({
                "success": True,
                "image_url": image_url,
                "file_name": file_name
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Image upload failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_food_nutrition_from_csv(food_name, mass=100):
    """CSV에서 음식 영양정보 추출"""
    if food_data_df is None:
        return None, None, None, None, 'C'
    
    try:
        # 1. 완전일치 검색
        row = food_data_df[food_data_df['식품명'] == food_name]
        
        # 2. 부분일치 검색
        if row.empty:
            row = food_data_df[food_data_df['식품명'].str.contains(food_name, na=False, regex=False)]
        
        # 3. 키워드 검색
        if row.empty:
            keywords = food_name.split()
            for keyword in keywords:
                if len(keyword) > 1:
                    row = food_data_df[food_data_df['식품명'].str.contains(keyword, na=False, regex=False)]
                    if not row.empty:
                        break
        
        if not row.empty:
            first_row = row.iloc[0]
            
            # 100g당 영양정보를 실제 질량에 맞게 계산
            calories_per_100g = float(first_row['에너지(kcal)']) if first_row['에너지(kcal)'] else 0
            calories = round(calories_per_100g * (mass / 100), 1)
            
            # 탄수화물 = 당류 + 식이섬유
            sugar = float(first_row['당류(g)']) if '당류(g)' in first_row and first_row['당류(g)'] else 0
            fiber = float(first_row['식이섬유(g)']) if '식이섬유(g)' in first_row and first_row['식이섬유(g)'] else 0
            carbs_per_100g = sugar + fiber
            carbs = round(carbs_per_100g * (mass / 100), 1)
            
            protein_per_100g = float(first_row['단백질(g)']) if first_row['단백질(g)'] else 0
            protein = round(protein_per_100g * (mass / 100), 1)
            
            fat_per_100g = float(first_row['포화지방산(g)']) if '포화지방산(g)' in first_row and first_row['포화지방산(g)'] else 0
            fat = round(fat_per_100g * (mass / 100), 1)
            
            grade = first_row['kfni_grade'] if 'kfni_grade' in first_row and first_row['kfni_grade'] else 'C'
            
            return calories, carbs, protein, fat, grade
        
    except Exception as e:
        print(f"CSV 영양소 추출 실패: {e}")
    
    return None, None, None, None, 'C'

def estimate_mass_from_calories(food_name, calories):
    """칼로리로부터 질량 추정"""
    if '밥' in food_name or '쌀' in food_name:
        return round(calories / 1.2, 1)
    elif '고기' in food_name or '육류' in food_name:
        return round(calories / 2.5, 1)
    elif '면' in food_name or '국수' in food_name:
        return round(calories / 1.1, 1)
    elif '빵' in food_name or '과자' in food_name:
        return round(calories / 2.8, 1)
    else:
        return round(calories / 2.0, 1)

from .ai_service import AIAnalysisService, NutritionCalculator

class AnalyzeImageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        if 'image' not in request.FILES:
            return Response({
                "success": False, 
                "message": "No image file provided"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            image_file = request.FILES['image']
            
            # 파일 저장
            file_name = default_storage.save(
                os.path.join('meal_images', image_file.name), 
                ContentFile(image_file.read())
            )
            image_path = default_storage.path(file_name)
            image_url = request.build_absolute_uri(default_storage.url(file_name))

            # AI 분석 서비스 초기화
            ai_service = AIAnalysisService()
            nutrition_calc = NutritionCalculator()
            
            # 1. MLServer 시도
            print("MLServer로 이미지 분석 시도...")
            ml_result = ai_service.analyze_image_with_mlserver(request.FILES['image'])
            
            if ml_result and 'mass_estimation' in ml_result:
                print("✅ MLServer 분석 성공!")
                mass_estimation = ml_result['mass_estimation']
                
                if 'foods' in mass_estimation and mass_estimation['foods']:
                    first_food = mass_estimation['foods'][0]
                    food_name = first_food.get('food_name', '알수없음')
                    mass = first_food.get('estimated_mass_g', 100)
                    confidence = first_food.get('confidence', 0.5)
                    
                    # CSV에서 영양정보 가져오기
                    calories, carbs, protein, fat, grade = get_food_nutrition_from_csv(food_name, mass)
                    
                    if calories is None:
                        calories = mass * 2
                        carbs = protein = fat = 0
                        grade = 'C'
                    
                    # AI 피드백 생성
                    ai_feedback = ai_service.generate_ai_feedback(
                        request.user, food_name, calories, mass, grade
                    )
                    
                    return Response({
                        "success": True,
                        "data": {
                            "mealType": request.data.get('mealType', 'lunch'),
                            "foodName": food_name,
                            "calories": calories,
                            "mass": mass,
                            "grade": grade,
                            "carbs": carbs,
                            "protein": protein,
                            "fat": fat,
                            "imageUrl": image_url,
                            "confidence": confidence,
                            "analysis_method": "MLServer",
                            "aiComment": ai_feedback
                        },
                        "message": "MLServer로 이미지 분석 완료"
                    }, status=status.HTTP_200_OK)
            
            # 2. Gemini API 백업
            print("MLServer 실패, Gemini API로 백업 분석...")
            gemini_result = ai_service.analyze_image_with_gemini(image_path)
            
            if gemini_result:
                food_name = gemini_result.get('음식명', '분석 실패')
                mass = gemini_result.get('질량', 0)
                calories = gemini_result.get('칼로리', 0)
                
                if mass == 0 and calories > 0:
                    mass = nutrition_calc.estimate_mass_from_calories(food_name, calories)
                elif mass == 0:
                    mass = 100
                    calories = 200
                
                # CSV에서 영양정보 가져오기
                csv_calories, carbs, protein, fat, grade = get_food_nutrition_from_csv(food_name, mass)
                
                if csv_calories is not None:
                    calories = csv_calories
                else:
                    carbs = protein = fat = 0
                    grade = 'C'
                
                # AI 피드백 생성
                ai_feedback = ai_service.generate_ai_feedback(
                    request.user, food_name, calories, mass, grade
                )
                
                return Response({
                    "success": True,
                    "data": {
                        "mealType": request.data.get('mealType', 'lunch'),
                        "foodName": food_name,
                        "calories": calories,
                        "mass": mass,
                        "grade": grade,
                        "carbs": carbs,
                        "protein": protein,
                        "fat": fat,
                        "imageUrl": image_url,
                        "analysis_method": "Gemini",
                        "aiComment": ai_feedback
                    },
                    "message": "Gemini API로 이미지 분석 완료"
                }, status=status.HTTP_200_OK)
            
            # 3. 분석 실패 시 기본값 반환
            return Response({
                "success": True,
                "data": {
                    "mealType": request.data.get('mealType', 'lunch'),
                    "foodName": "",
                    "calories": 0,
                    "mass": 0,
                    "grade": "C",
                    "carbs": 0,
                    "protein": 0,
                    "fat": 0,
                    "imageUrl": image_url,
                    "analysis_method": "fallback"
                },
                "message": "음식 인식에 실패했습니다. 직접 입력해 주세요."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"이미지 분석 중 오류: {e}")
            return Response({
                "success": False,
                "message": f"분석 중 오류: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MonthlyLogView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        year = int(request.query_params.get('year', datetime.now().year))
        month = int(request.query_params.get('month', datetime.now().month))

        meal_logs = MealLog.objects.filter(
            user=request.user,
            date__year=year,
            date__month=month
        ).order_by('date', 'time')

        days_data = defaultdict(lambda: {"meals": []})
        meal_types = ['breakfast', 'lunch', 'dinner', 'snack']

        num_days = monthrange(year, month)[1]
        for day in range(1, num_days + 1):
            current_date = datetime(year, month, day).strftime('%Y-%m-%d')
            for meal_type in meal_types:
                days_data[current_date]["meals"].append({
                    "type": meal_type, 
                    "hasLog": False
                })

        for log in meal_logs:
            log_date_str = log.date.strftime('%Y-%m-%d')
            if log_date_str in days_data:
                for meal_entry in days_data[log_date_str]["meals"]:
                    if meal_entry["type"] == log.mealType:
                        meal_entry["hasLog"] = True
                        break

        return Response({
            "success": True,
            "data": {
                "year": year,
                "month": month,
                "days": dict(days_data)
            },
            "message": "Monthly logs retrieved successfully"
        }, status=status.HTTP_200_OK)

class DailyReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        date_str = request.query_params.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        try:
            report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                "success": False,
                "message": "Invalid date format"
            }, status=status.HTTP_400_BAD_REQUEST)

        # 해당 날짜의 식사 기록 조회
        meal_logs = MealLog.objects.filter(
            user=request.user,
            date=report_date
        ).order_by('time')

        # 식사별로 그룹화
        meals_by_type = {
            'breakfast': [],
            'lunch': [],
            'dinner': [],
            'snack': []
        }

        total_calories = 0
        total_carbs = 0
        total_protein = 0
        total_fat = 0

        for log in meal_logs:
            meal_data = MealLogSerializer(log).data
            meals_by_type[log.mealType].append(meal_data)
            
            total_calories += log.calories or 0
            total_carbs += log.carbs or 0
            total_protein += log.protein or 0
            total_fat += log.fat or 0

        return Response({
            "success": True,
            "data": {
                "date": date_str,
                "meals": meals_by_type,
                "summary": {
                    "totalCalories": round(total_calories, 1),
                    "totalCarbs": round(total_carbs, 1),
                    "totalProtein": round(total_protein, 1),
                    "totalFat": round(total_fat, 1),
                    "mealCount": meal_logs.count()
                }
            },
            "message": "Daily report retrieved successfully"
        }, status=status.HTTP_200_OK)

class AICoachTipViewSet(viewsets.ModelViewSet):
    queryset = AICoachTip.objects.all()
    serializer_class = AICoachTipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """최신 코칭 팁 우선 정렬"""
        return AICoachTip.objects.all().order_by('-createdAt', '-priority')

class AICoachingView(APIView):
    """AI 코칭 서비스 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """일일 코칭 메시지 조회"""
        try:
            # 간단한 하드코딩된 AI 코칭 메시지들
            import random
            from datetime import datetime
            
            coaching_messages = [
                "오늘 식사 기록 잘하고 있어! 💪 단백질을 조금 더 늘려보는 건 어때?",
                "균형 잡힌 식단을 위해 채소를 더 많이 드셔보세요! 🥗",
                "칼로리 관리 잘하고 있네요! 👍 이 페이스 유지하세요.",
                "오늘도 건강한 선택을 하고 계시네요! ✨ 물도 충분히 드세요.",
                "식사 시간을 규칙적으로 가져보세요! ⏰ 건강의 기본이에요.",
                "간식 대신 과일을 선택해보는 건 어때요? 🍎 더 건강할 거예요!",
                "단백질과 탄수화물의 균형이 중요해요! 🍚🥩 골고루 드세요.",
                "오늘 하루도 수고했어요! 😊 내일도 건강한 식습관 화이팅!"
            ]
            
            message = random.choice(coaching_messages)
            
            return Response({
                "success": True,
                "data": {
                    "message": message,
                    "generated_at": datetime.now().isoformat()
                },
                "message": "AI 코칭 메시지 생성 완료"
            })
            
        except Exception as e:
            return Response({
                "success": True,
                "data": {
                    "message": "오늘도 건강한 식습관을 위해 노력해보세요! 💪",
                    "generated_at": datetime.now().isoformat()
                },
                "message": "AI 코칭 메시지 생성 완료"
            })
    
    def post(self, request):
        """맞춤형 코칭 요청"""
        try:
            from .ai_coach import AICoachingService
            
            coaching_type = request.data.get('type', 'daily')  # daily, weekly, nutrition
            print(f"🤖 맞춤형 AI 코칭 요청 - 타입: {coaching_type}, 사용자: {request.user.username}")
            
            coaching_service = AICoachingService()
            
            if coaching_type == 'weekly':
                result = coaching_service.generate_weekly_report(request.user)
                print(f"✅ 주간 리포트 생성 완료")
            elif coaching_type == 'nutrition':
                focus_nutrient = request.data.get('nutrient', 'protein')
                # 영양소 중심 코칭을 일일 코칭으로 대체
                result = coaching_service.generate_daily_coaching(request.user)
                print(f"✅ 영양소 코칭 생성 완료: {focus_nutrient}")
            else:
                result = coaching_service.generate_daily_coaching(request.user)
                print(f"✅ 일일 코칭 생성 완료")
            
            return Response({
                "success": True,
                "data": result,
                "message": f"{coaching_type} 코칭 생성 완료"
            })
            
        except Exception as e:
            print(f"❌ 맞춤형 AI 코칭 생성 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response({
                "success": False,
                "data": {
                    "message": "코칭 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
                    "generated_at": datetime.now().isoformat()
                },
                "message": "AI 코칭 서비스 오류",
                "error": str(e)
            }, status=status.HTTP_200_OK)  # 200으로 반환하여 프론트엔드에서 처리

class FoodRecommendationView(APIView):
    """음식 추천 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """개인화된 음식 추천"""
        from .recommendation_engine import FoodRecommendationEngine
        
        meal_type = request.query_params.get('meal_type', 'lunch')
        count = int(request.query_params.get('count', 5))
        
        recommendation_engine = FoodRecommendationEngine()
        recommendations = recommendation_engine.get_personalized_recommendations(
            request.user, meal_type, count
        )
        
        return Response({
            "success": True,
            "data": {
                "meal_type": meal_type,
                "recommendations": recommendations,
                "generated_at": datetime.now().isoformat()
            },
            "message": "개인화된 음식 추천 완료"
        })
    
    def post(self, request):
        """특정 조건의 음식 추천"""
        from .recommendation_engine import FoodRecommendationEngine
        
        recommendation_type = request.data.get('type', 'personalized')
        recommendation_engine = FoodRecommendationEngine()
        
        if recommendation_type == 'alternatives':
            food_name = request.data.get('food_name', '')
            count = int(request.data.get('count', 3))
            result = recommendation_engine.get_healthy_alternatives(food_name, count)
            
        elif recommendation_type == 'nutrition_focused':
            focus_nutrient = request.data.get('nutrient', 'protein')
            result = recommendation_engine.get_nutrition_focused_recommendations(
                request.user, focus_nutrient
            )
            
        elif recommendation_type == 'meal_plan':
            target_calories = int(request.data.get('target_calories', 2000))
            result = recommendation_engine.get_balanced_meal_plan(
                request.user, target_calories
            )
            
        else:
            meal_type = request.data.get('meal_type', 'lunch')
            count = int(request.data.get('count', 5))
            result = recommendation_engine.get_personalized_recommendations(
                request.user, meal_type, count
            )
        
        return Response({
            "success": True,
            "data": {
                "type": recommendation_type,
                "result": result,
                "generated_at": datetime.now().isoformat()
            },
            "message": f"{recommendation_type} 추천 완료"
        })

class NutritionAnalysisView(APIView):
    """영양 분석 API"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """영양 분석 리포트"""
        period = request.query_params.get('period', 'week')  # week, month
        
        if period == 'month':
            start_date = date.today() - timedelta(days=30)
        else:
            start_date = date.today() - timedelta(days=7)
        
        meals = MealLog.objects.filter(
            user=request.user,
            date__gte=start_date
        )
        
        # 영양소 통계
        nutrition_stats = meals.aggregate(
            total_calories=Sum('calories'),
            avg_calories=Avg('calories'),
            total_carbs=Sum('carbs'),
            total_protein=Sum('protein'),
            total_fat=Sum('fat')
        )
        
        # 등급별 분포
        grade_distribution = {}
        for grade in ['A', 'B', 'C', 'D', 'E']:
            count = meals.filter(nutriScore=grade).count()
            grade_distribution[grade] = count
        
        # 일별 칼로리 추이
        daily_calories = []
        for i in range((date.today() - start_date).days + 1):
            target_date = start_date + timedelta(days=i)
            day_calories = meals.filter(date=target_date).aggregate(
                total=Sum('calories')
            )['total'] or 0
            
            daily_calories.append({
                'date': target_date.strftime('%Y-%m-%d'),
                'calories': day_calories
            })
        
        return Response({
            "success": True,
            "data": {
                "period": period,
                "nutrition_stats": nutrition_stats,
                "grade_distribution": grade_distribution,
                "daily_calories": daily_calories,
                "total_meals": meals.count()
            },
            "message": "영양 분석 완료"
        })

# 추가 뷰들 (기존 코드에서 누락된 부분들)
class RecommendedChallengesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from challenges.models import Challenge
            from challenges.serializers import ChallengeSerializer
            
            # 사용자가 참여하지 않은 활성 챌린지 추천
            user_challenges = request.user.challenge_participations.values_list('challenge_id', flat=True)
            recommended = Challenge.objects.filter(
                is_active=True
            ).exclude(id__in=user_challenges)[:5]
            
            return Response({
                "success": True,
                "data": ChallengeSerializer(recommended, many=True).data,
                "message": "추천 챌린지 조회 성공"
            })
        except ImportError:
            return Response({
                "success": True,
                "data": [],
                "message": "챌린지 시스템이 비활성화되어 있습니다."
            })

class MyChallengesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from challenges.models import ChallengeParticipation
            from challenges.serializers import ChallengeParticipationSerializer
            
            participations = ChallengeParticipation.objects.filter(
                user=request.user
            ).select_related('challenge').order_by('-joined_at')
            
            return Response({
                "success": True,
                "data": ChallengeParticipationSerializer(participations, many=True).data,
                "message": "내 챌린지 조회 성공"
            })
        except ImportError:
            return Response({
                "success": True,
                "data": [],
                "message": "챌린지 시스템이 비활성화되어 있습니다."
            })

class UserBadgesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, username):
        try:
            from challenges.models import UserBadge
            from challenges.serializers import UserBadgeSerializer
            
            user = User.objects.get(username=username)
            badges = UserBadge.objects.filter(user=user).select_related('badge')
            
            return Response({
                "success": True,
                "data": UserBadgeSerializer(badges, many=True).data,
                "message": "사용자 배지 조회 성공"
            })
        except (ImportError, User.DoesNotExist):
            return Response({
                "success": True,
                "data": [],
                "message": "배지 시스템이 비활성화되어 있거나 사용자를 찾을 수 없습니다."
            })

class UserProfileStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # 총 식사 기록 수
        total_meals = MealLog.objects.filter(user=user).count()
        
        # 평균 칼로리
        avg_calories = MealLog.objects.filter(user=user).aggregate(
            avg=Avg('calories')
        )['avg'] or 0
        
        # 가장 많이 먹은 음식
        favorite_food_data = MealLog.objects.filter(user=user).values('foodName').annotate(
            count=models.Count('foodName')
        ).order_by('-count').first()
        
        favorite_food = favorite_food_data['foodName'] if favorite_food_data else "없음"
        
        # 최근 7일 통계
        week_ago = datetime.now().date() - timedelta(days=7)
        recent_meals = MealLog.objects.filter(user=user, date__gte=week_ago)
        weekly_avg = recent_meals.aggregate(avg=Avg('calories'))['avg'] or 0
        
        return Response({
            "success": True,
            "data": {
                "totalMeals": total_meals,
                "averageCalories": round(avg_calories, 1),
                "favoriteFood": favorite_food,
                "weeklyAverage": round(weekly_avg, 1),
                "totalDays": (datetime.now().date() - user.date_joined.date()).days
            },
            "message": "사용자 프로필 통계 조회 성공"
        })

class UserStatisticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        today = datetime.now().date()
        
        # 주간 통계 (최근 7일)
        weekly_stats = []
        for i in range(7):
            date = today - timedelta(days=i)
            day_meals = MealLog.objects.filter(user=user, date=date)
            total_calories = day_meals.aggregate(total=Sum('calories'))['total'] or 0
            
            weekly_stats.append({
                'date': date.strftime('%Y-%m-%d'),
                'day': date.strftime('%a'),
                'calories': total_calories,
                'meals': day_meals.count()
            })
        
        # 월간 통계 (최근 30일)
        monthly_stats = []
        for i in range(0, 30, 7):  # 주 단위로 그룹화
            start_date = today - timedelta(days=i+6)
            end_date = today - timedelta(days=i)
            
            week_meals = MealLog.objects.filter(
                user=user, 
                date__range=[start_date, end_date]
            )
            total_calories = week_meals.aggregate(total=Sum('calories'))['total'] or 0
            avg_calories = total_calories / 7 if total_calories > 0 else 0
            
            monthly_stats.append({
                'week': f"{start_date.strftime('%m/%d')} - {end_date.strftime('%m/%d')}",
                'avgCalories': round(avg_calories, 1),
                'totalMeals': week_meals.count()
            })
        
        return Response({
            "success": True,
            "data": {
                "weeklyStats": weekly_stats,
                "monthlyStats": monthly_stats
            },
            "message": "사용자 통계 조회 성공"
        })

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class TestMealLogView(APIView):
    """MealLog 생성 테스트용 API (개발 환경에서만 사용)"""
    permission_classes = [IsDebugMode]
    
    def post(self, request):
        
        try:
            serializer = MealLogSerializer(data=request.data)
            if serializer.is_valid():
                user = request.user if request.user.is_authenticated else None
                if not user:
                    return Response({
                        'success': False,
                        'message': '인증이 필요합니다.'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                
                meal_log = serializer.save(user=user)
                return Response({
                    'success': True,
                    'data': MealLogSerializer(meal_log).data,
                    'message': 'MealLog 생성 성공'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': '데이터 검증 실패'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': '서버 오류'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)