from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny # IsAuthenticated, AllowAny 임포트
from .models import MealLog, AICoachTip # Only import models that still exist in api.models
from .serializers import MealLogSerializer, AICoachTipSerializer, UserSerializer # Only import serializers that still exist
from datetime import datetime, timedelta
from django.db.models import Q, Avg, Sum # Avg, Sum 임포트
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

# 유틸리티 함수 임포트
from .utils import determine_grade, calculate_nutrition_score

# CSV 파일 경로 (프로젝트 루트에 있다고 가정)
CSV_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '음식만개등급화.csv')

# CSV 파일 로드 (서버 시작 시 한 번만 로드)
try:
    food_data_df = pd.read_csv(CSV_FILE_PATH, encoding='utf-8')
except FileNotFoundError:
    food_data_df = None
    print(f"Error: CSV file not found at {CSV_FILE_PATH}")
except Exception as e:
    food_data_df = None
    print(f"Error loading CSV file: {e}")

import base64
import requests
import re
import json
from django.conf import settings
import os
import csv
from rest_framework.decorators import api_view, permission_classes

class RegisterView(APIView):
    permission_classes = [AllowAny] # 권한 추가
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "success": True,
                "data": {
                    "username": user.username,
                    "email": user.email,
                    "token": user.auth_token.key
                },
                "message": "User registered successfully"
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email') # email 필드 사용
        password = request.data.get('password')

        print(f"[DEBUG] Login attempt for email: {email}")

        try:
            user_obj = User.objects.get(email=email)
            print(f"[DEBUG] Found user object with username: {user_obj.username}")
        except User.DoesNotExist:
            print(f"[DEBUG] User with email {email} not found.")
            return Response({"success": False, "message": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=user_obj.username, password=password) # username으로 인증
        print(f"[DEBUG] authenticate returned: {user}")

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
        print(f"[DEBUG] Authentication failed for user: {user_obj.username}")
        return Response({"success": False, "message": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

class MealLogViewSet(viewsets.ModelViewSet):
    queryset = MealLog.objects.all()
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated] # 권한 추가
    lookup_field = 'id'
    
    def create(self, request, *args, **kwargs):
        print(f"=== MealLogViewSet.create 호출 ===")
        print(f"요청 사용자: {request.user}")
        print(f"인증 상태: {request.user.is_authenticated}")
        print(f"요청 데이터: {request.data}")
        print(f"Content-Type: {request.content_type}")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"❌ ViewSet create 실패: {e}")
            raise

    def get_queryset(self):
        queryset = MealLog.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date=report_date)
            except ValueError:
                pass # 유효하지 않은 날짜 형식은 무시
        return queryset

    def perform_create(self, serializer):
        """MealLog 생성 시 현재 사용자를 자동으로 설정"""
        print(f"=== MealLog 생성 시도 ===")
        print(f"요청 사용자: {self.request.user}")
        print(f"인증 상태: {self.request.user.is_authenticated}")
        print(f"요청 데이터: {self.request.data}")
        
        try:
            meal_log = serializer.save(user=self.request.user)
            print(f"✅ MealLog 생성 성공: {meal_log}")
            # 챌린지 판정은 signals.py에서 자동으로 처리됩니다.
            # MealLog 생성 시 post_save 신호가 발생하여 자동으로 챌린지 판정이 실행됩니다.
        except Exception as e:
            print(f"❌ MealLog 생성 실패: {e}")
            print(f"시리얼라이저 에러: {serializer.errors if hasattr(serializer, 'errors') else 'N/A'}")
            raise

class AICoachTipViewSet(viewsets.ModelViewSet):
    queryset = AICoachTip.objects.all()
    serializer_class = AICoachTipSerializer
    permission_classes = [IsAuthenticated] # 권한 추가

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class TestMealLogView(APIView):
    """MealLog 생성 테스트용 API"""
    permission_classes = [AllowAny]  # 임시로 AllowAny 사용
    
    def post(self, request):
        print(f"테스트 MealLog 요청 데이터: {request.data}")
        print(f"요청 사용자: {request.user}")
        
        try:
            serializer = MealLogSerializer(data=request.data)
            if serializer.is_valid():
                # 테스트용으로 임시 사용자 사용
                from django.contrib.auth import get_user_model
                User = get_user_model()
                test_user = User.objects.filter(email='test@meal.com').first()
                if not test_user:
                    test_user = request.user if request.user.is_authenticated else None
                
                meal_log = serializer.save(user=test_user)
                return Response({
                    'success': True,
                    'data': MealLogSerializer(meal_log).data,
                    'message': 'MealLog 생성 성공'
                }, status=status.HTTP_201_CREATED)
            else:
                print(f"시리얼라이저 에러: {serializer.errors}")
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': '데이터 검증 실패'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"MealLog 생성 예외: {e}")
            return Response({
                'success': False,
                'error': str(e),
                'message': '서버 오류'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ImageUploadView(APIView):
    """이미지 파일만 업로드하는 API"""
    permission_classes = [AllowAny]  # 임시로 인증 없이 허용
    
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

class AnalyzeImageView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        if 'image' not in request.FILES:
            return Response({"success": False, "message": "No image file provided"}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        file_name = default_storage.save(os.path.join('meal_images', image_file.name), ContentFile(image_file.read()))
        image_path = default_storage.path(file_name)
        image_url = request.build_absolute_uri(default_storage.url(file_name))

        # MLServer 연동 함수 추가
        def call_ml_server(image_file):
            """MLServer API 호출"""
            try:
                ml_server_url = getattr(settings, 'ML_SERVER_URL', 'http://localhost:8001')
                
                # 파일을 다시 읽어서 MLServer로 전송
                image_file.seek(0)  # 파일 포인터를 처음으로 되돌림
                files = {'file': (image_file.name, image_file, image_file.content_type)}
                
                response = requests.post(
                    f'{ml_server_url}/api/v1/estimate',
                    files=files,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result
                else:
                    print(f"MLServer 오류: {response.status_code} - {response.text}")
                    return None
                    
            except Exception as e:
                print(f"MLServer 호출 실패: {e}")
                return None

        # --- Gemini 2.5 Flash 분석 함수들 (food_calendar/utils.py, views.py 기반) ---
        def load_food_grades():
            food_grades = {}
            csv_path = os.path.join(settings.BASE_DIR, '음식만개등급화.csv')
            try:
                with open(csv_path, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        food_name = row['식품명'].strip()
                        grade = row['kfni_grade'].strip()
                        calories = float(row['에너지(kcal)']) if row['에너지(kcal)'] else 0
                        food_grades[food_name] = {
                            'grade': grade,
                            'calories': calories,
                            'category': row['식품대분류명']
                        }
            except Exception as e:
                print(f"음식 등급 데이터 로드 실패: {e}")
            return food_grades

        def estimate_mass(food_name, estimated_calories):
            food_grades = load_food_grades()
            if food_name in food_grades:
                reference_calories = food_grades[food_name]['calories']
                if reference_calories > 0:
                    estimated_mass = (estimated_calories / reference_calories) * 100
                    return round(estimated_mass, 1)
            for key in food_grades:
                if food_name in key or key in food_name:
                    reference_calories = food_grades[key]['calories']
                    if reference_calories > 0:
                        estimated_mass = (estimated_calories / reference_calories) * 100
                        return round(estimated_mass, 1)
            if '밥' in food_name or '쌀' in food_name:
                return round(estimated_calories / 1.2, 1)
            elif '고기' in food_name or '육류' in food_name or '돈까스' in food_name:
                return round(estimated_calories / 2.5, 1)
            elif '면' in food_name or '국수' in food_name:
                return round(estimated_calories / 1.1, 1)
            elif '빵' in food_name or '과자' in food_name:
                return round(estimated_calories / 2.8, 1)
            else:
                return round(estimated_calories / 2.0, 1)

        def determine_grade(food_name, calories):
            food_grades = load_food_grades()
            if food_name in food_grades:
                return food_grades[food_name]['grade']
            for key in food_grades:
                if food_name in key or key in food_name:
                    return food_grades[key]['grade']
            if calories < 300:
                return 'A'
            elif calories < 600:
                return 'B'
            else:
                return 'C'

        def process_multiple_foods(analysis_text):
            try:
                if analysis_text.strip().startswith('['):
                    data = json.loads(analysis_text)
                    if isinstance(data, list):
                        processed_foods = []
                        for item in data:
                            if isinstance(item, dict) and '음식명' in item:
                                processed_foods.append(item)
                        return processed_foods
                    return []
                if analysis_text.strip().startswith('{'):
                    data = json.loads(analysis_text)
                    if isinstance(data, dict) and '음식명' in data:
                        return [data]
                    return []
                foods = []
                food_patterns = [
                    r'(\d+\.\s*)?([^,\n]+?)\s*:\s*(\d+)\s*g\s*,\s*(\d+)\s*kcal',
                    r'([^,\n]+?)\s*(\d+)\s*g\s*(\d+)\s*kcal',
                    r'([^,\n]+?)\s*질량[:\s]*(\d+)\s*칼로리[:\s]*(\d+)',
                ]
                for pattern in food_patterns:
                    matches = re.findall(pattern, analysis_text, re.IGNORECASE)
                    for match in matches:
                        if len(match) >= 3:
                            if match[0].isdigit():
                                food_name = match[1].strip()
                                mass = int(match[2])
                                calories = int(match[3])
                            else:
                                food_name = match[0].strip()
                                mass = int(match[1])
                                calories = int(match[2])
                            foods.append({
                                '음식명': food_name,
                                '질량': mass,
                                '칼로리': calories
                            })
                if foods:
                    return foods
                return []
            except Exception as e:
                print(f"여러 음식 처리 실패: {e}")
                return []

        def calculate_nutrition_score(food_name, calories, mass):
            grade = determine_grade(food_name, calories)
            grade_scores = {'A': 15, 'B': 10, 'C': 5}
            base_score = grade_scores.get(grade, 8)
            if calories < 300:
                bonus = 3
            elif calories < 600:
                bonus = 1
            else:
                bonus = -2
            final_score = max(1, min(15, base_score + bonus))
            return final_score

        def generate_ai_feedback(food_name, calories, mass, grade):
            try:
                api_key = getattr(settings, 'GEMINI_API_KEY', None)
                api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}'

                # 오늘 먹은 음식, 남은 칼로리, 식사 종류 등 정보 계산
                user = request.user
                today = datetime.now().date()
                today_logs = MealLog.objects.filter(user=user, date=today)
                today_meal_list = ', '.join([log.foodName for log in today_logs])
                today_total_calories = sum([log.calories for log in today_logs])
                # 권장 칼로리(예: 2000kcal, 실제로는 사용자별로 다를 수 있음)
                recommended_calories = 2000
                remaining_calories = recommended_calories - today_total_calories
                # mealType은 항상 'lunch'로 들어가 있으니, food_name 등으로 대체

                prompt = f"""
오늘 {food_name}을(를) 드셨습니다.\n
- 현재까지 섭취한 총 칼로리: {today_total_calories}kcal
- 남은 권장 칼로리: {remaining_calories}kcal
- 오늘 먹은 음식 목록: {today_meal_list}

이 정보를 바탕으로, 아래 형식으로 건강한 식습관을 위한 코멘트와 구체적인 조언을 주세요.

1. 한 줄 코멘트 (예: '오늘 점심은 단백질이 풍부해서 좋아요! 남은 칼로리도 잘 관리해보세요.')
2. 구체적인 조언 (2~3문장, 예: '나트륨 섭취가 많으니 저녁에는 싱겁게 드세요. 채소를 더 추가하면 영양 균형에 도움이 됩니다.')

※ 대체 음식 추천은 하지 마세요. 이미 먹은 음식에 대한 피드백만 주세요.
※ 친근하고 격려하는 톤으로 답변해 주세요.
"""
                response = requests.post(api_url, json={
                    "contents": [
                        {"role": "user", "parts": [{"text": prompt}]}
                    ]
                }, timeout=30)
                if response.status_code == 200:
                    response_data = response.json()
                    feedback = response_data['candidates'][0]['content']['parts'][0]['text']
                    return feedback.strip()
                else:
                    return f"{food_name}의 칼로리는 {calories}kcal입니다. {'건강한 선택입니다!' if calories < 600 else '적당한 칼로리입니다.' if calories < 800 else '칼로리가 높으니 다음 식사는 가볍게 드세요.'}"
            except Exception as e:
                print(f"AI 피드백 생성 실패: {e}")
                return f"{food_name}의 칼로리는 {calories}kcal입니다. {'건강한 선택입니다!' if calories < 600 else '적당한 칼로리입니다.' if calories < 800 else '칼로리가 높으니 다음 식사는 가볍게 드세요.'}"

        # --- 실제 이미지 분석 (method 파라미터에 따라 분기) ---
        try:
            # method 파라미터 확인
            analysis_method = request.POST.get('method', 'auto')  # 기본값: auto (MLServer 우선)
            
            if analysis_method == 'gemini_only':
                # Gemini만 사용 - MLServer 건너뛰기
                print("Gemini API 전용 분석 시작...")
                ml_result = None  # MLServer 결과를 None으로 설정하여 Gemini로 넘어가도록
            else:
                # 1. MLServer 시도 (auto 모드일 때만)
                print("MLServer로 이미지 분석 시도...")
                ml_result = call_ml_server(request.FILES['image'])
            
            if ml_result and 'mass_estimation' in ml_result:
                print("MLServer 분석 성공!")
                mass_estimation = ml_result['mass_estimation']
                
                # MLServer 결과에서 첫 번째 음식 정보 추출
                if 'foods' in mass_estimation and mass_estimation['foods']:
                    first_food = mass_estimation['foods'][0]
                    food_name = first_food.get('food_name', '알수없음')
                    mass = first_food.get('estimated_mass_g', 0)
                    confidence = first_food.get('confidence', 0.5)
                    
                    print(f"MLServer 결과: {food_name}, {mass}g, 신뢰도: {confidence}")
                    
                    # CSV에서 칼로리 및 영양정보 계산
                    carbs = protein = fat = 0
                    calories = 0
                    grade = 'C'
                    
                    try:
                        if food_data_df is not None:
                            # 1. 완전일치
                            row = food_data_df[food_data_df['식품명'] == food_name]
                            # 2. 부분일치
                            if row.empty:
                                def clean_food_name(name):
                                    return re.sub(r'\s*\([^)]*\)', '', name).strip()
                                cleaned_name = clean_food_name(food_name)
                                row = food_data_df[food_data_df['식품명'].str.contains(cleaned_name, na=False, regex=False)]
                            
                            if not row.empty:
                                # 100g당 영양정보를 실제 질량에 맞게 계산
                                calories_per_100g = float(row.iloc[0]['에너지(kcal)']) if row.iloc[0]['에너지(kcal)'] else 0
                                calories = round(calories_per_100g * (mass / 100), 1)
                                
                                sugar = float(row.iloc[0]['당류(g)']) if '당류(g)' in row.columns and row.iloc[0]['당류(g)'] else 0
                                fiber = float(row.iloc[0]['식이섬유(g)']) if '식이섬유(g)' in row.columns and row.iloc[0]['식이섬유(g)'] else 0
                                carbs_per_100g = sugar + fiber
                                protein_per_100g = float(row.iloc[0]['단백질(g)']) if row.iloc[0]['단백질(g)'] else 0
                                fat_per_100g = float(row.iloc[0]['포화지방산(g)']) if '포화지방산(g)' in row.columns and row.iloc[0]['포화지방산(g)'] else 0
                                
                                carbs = round(carbs_per_100g * (mass / 100), 1)
                                protein = round(protein_per_100g * (mass / 100), 1)
                                fat = round(fat_per_100g * (mass / 100), 1)
                                
                                if 'kfni_grade' in row.columns and row.iloc[0]['kfni_grade']:
                                    grade = row.iloc[0]['kfni_grade']
                            else:
                                # CSV에서 찾지 못한 경우 기본값 사용
                                calories = mass * 2  # 기본 칼로리 추정
                                
                    except Exception as e:
                        print(f"CSV 영양소 추출 실패: {e}")
                        calories = mass * 2  # 기본 칼로리 추정
                    
                    score = calculate_nutrition_score(food_name, calories, mass)
                    ai_feedback = generate_ai_feedback(food_name, calories, mass, grade)
                    
                    return Response({
                        "success": True,
                        "data": {
                            "mealType": "lunch",
                            "foodName": food_name,
                            "calories": calories,
                            "mass": mass,  # MLServer에서 얻은 정확한 질량
                            "grade": grade,
                            "score": score,
                            "aiComment": ai_feedback,
                            "carbs": carbs,
                            "protein": protein,
                            "fat": fat,
                            "imageUrl": image_url,
                            "confidence": confidence,
                            "analysis_method": "MLServer"  # 분석 방법 표시
                        },
                        "message": "MLServer로 이미지 분석 완료"
                    }, status=status.HTTP_200_OK)
            
            # 2. MLServer 실패 시 Gemini API 백업 사용
            print("MLServer 실패, Gemini API로 백업 분석 시도...")
            with open(image_path, 'rb') as img_file:
                img_b64 = base64.b64encode(img_file.read()).decode('utf-8')
            prompt = {
                "contents": [
                    {"role": "user", "parts": [
                        {"text": "이 이미지의 음식들을 분석해주세요. 여러 음식이 있다면 각각 분석해주세요.\n\n분석 결과를 JSON 배열 형태로 답해주세요:\n[\n    {\"음식명\": \"음식1\", \"질량\": 100, \"칼로리\": 200},\n    {\"음식명\": \"음식2\", \"질량\": 150, \"칼로리\": 300}\n]\n\n질량이 추정하기 어려운 경우 0으로 표시해주세요."},
                        {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}
                    ]}
                ]
            }
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}'
            response = requests.post(api_url, json=prompt, timeout=30)
            if response.status_code == 200:
                response_data = response.json()
                text = response_data['candidates'][0]['content']['parts'][0]['text']
                text = text.replace('```json', '').replace('```', '').strip()
                json_match = re.search(r'\[.*\]', text, re.DOTALL)
                if json_match:
                    text = json_match.group(0)
                foods = process_multiple_foods(text)
                if foods and len(foods) > 0:
                    first_food = foods[0]
                    food_name = first_food.get('음식명', '분석 실패')
                    mass = first_food.get('질량', 0)
                    calories = first_food.get('칼로리', 0)
                    if mass == 0 and calories > 0:
                        mass = estimate_mass(food_name, calories)
                    grade = determine_grade(food_name, calories)
                    score = calculate_nutrition_score(food_name, calories, mass)
                    ai_feedback = generate_ai_feedback(food_name, calories, mass, grade)

                    # --- CSV에서 영양소 추출 ---
                    carbs = protein = fat = 0
                    grade = 'C'
                    try:
                        if food_data_df is not None:
                            # 1. 완전일치
                            row = food_data_df[food_data_df['식품명'] == food_name]
                            # 2. 부분일치(없으면, 괄호/영문 제거 후, regex=False)
                            if row.empty:
                                def clean_food_name(name):
                                    return re.sub(r'\s*\([^)]*\)', '', name).strip()
                                cleaned_name = clean_food_name(food_name)
                                row = food_data_df[food_data_df['식품명'].str.contains(cleaned_name, na=False, regex=False)]
                            if not row.empty:
                                # 탄수화물(g) 대신 당류(g) + 식이섬유(g), 지방(g) 대신 포화지방산(g)
                                sugar = float(row.iloc[0]['당류(g)']) if '당류(g)' in row.columns and row.iloc[0]['당류(g)'] else 0
                                fiber = float(row.iloc[0]['식이섬유(g)']) if '식이섬유(g)' in row.columns and row.iloc[0]['식이섬유(g)'] else 0
                                carbs_per_100g = sugar + fiber
                                protein_per_100g = float(row.iloc[0]['단백질(g)']) if row.iloc[0]['단백질(g)'] else 0
                                fat_per_100g = float(row.iloc[0]['포화지방산(g)']) if '포화지방산(g)' in row.columns and row.iloc[0]['포화지방산(g)'] else 0
                                carbs = round(carbs_per_100g * (mass / 100), 1)
                                protein = round(protein_per_100g * (mass / 100), 1)
                                fat = round(fat_per_100g * (mass / 100), 1)
                                if 'kfni_grade' in row.columns and row.iloc[0]['kfni_grade']:
                                    grade = row.iloc[0]['kfni_grade']
                    except Exception as e:
                        print(f"CSV 영양소 추출 실패: {e}")

                    return Response({
                        "success": True,
                        "data": {
                            "mealType": "lunch",
                            "foodName": food_name,
                            "calories": calories,
                            "mass": mass,
                            "grade": grade,
                            "score": score,
                            "aiComment": ai_feedback,
                            "carbs": carbs,
                            "protein": protein,
                            "fat": fat,
                            "imageUrl": image_url
                        },
                        "message": "Image analyzed successfully"
                    }, status=status.HTTP_200_OK)
                else:
                    # 분석 실패 시 기본값 반환
                    return Response({
                        "success": True,
                        "data": {
                            "mealType": "lunch",
                            "foodName": "",
                            "calories": 0,
                            "mass": 0,
                            "grade": "C",
                            "score": 5,
                            "aiComment": "음식 인식에 실패했습니다. 직접 입력해 주세요.",
                            "carbs": 0,
                            "protein": 0,
                            "fat": 0,
                            "imageUrl": image_url
                        },
                        "message": "분석 결과가 없습니다. 직접 입력해 주세요."
                    }, status=status.HTTP_200_OK)
            else:
                return Response({"success": False, "message": f"Gemini API 호출 실패: {response.status_code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"success": False, "message": f"분석 중 오류: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MonthlyLogView(APIView):
    permission_classes = [IsAuthenticated] # 권한 추가
    def get(self, request, *args, **kwargs):
        year = int(request.query_params.get('year', datetime.now().year))
        month = int(request.query_params.get('month', datetime.now().month))

        # Only fetch logs for the current user
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
                days_data[current_date]["meals"].append({"type": meal_type, "hasLog": False})

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
            "message": "Monthly logs fetched successfully"
        }, status=status.HTTP_200_OK)

class DailyReportView(APIView):
    permission_classes = [IsAuthenticated] # 권한 추가
    def get(self, request, *args, **kwargs):
        date_str = request.query_params.get('date', datetime.now().strftime('%Y-%m-%d'))
        try:
            report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # Only fetch logs for the current user
        meal_logs = MealLog.objects.filter(user=request.user, date=report_date)
        serializer = MealLogSerializer(meal_logs, many=True)

        total_calories = sum(log.calories for log in meal_logs)
        total_carbs = sum(log.carbs for log in meal_logs if log.carbs is not None)
        total_protein = sum(log.protein for log in meal_logs if log.protein is not None)
        total_fat = sum(log.fat for log in meal_logs if log.fat is not None)

        return Response({
            "success": True,
            "data": {
                "date": date_str,
                "totalCalories": total_calories,
                "totalCarbs": total_carbs,
                "totalProtein": total_protein,
                "totalFat": total_fat,
                "meals": serializer.data
            },
            "message": "Daily report fetched successfully"
        }, status=status.HTTP_200_OK)

class RecommendedChallengesView(APIView):
    permission_classes = [IsAuthenticated] # 권한 추가
    def get(self, request, *args, **kwargs):
        from .challenges.models import Challenge
        challenges = Challenge.objects.filter(is_active=True).order_by('-start_date')[:5] # 최신 5개
        serializer = ChallengeSerializer(challenges, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Recommended challenges fetched successfully"
        }, status=status.HTTP_200_OK)

class MyChallengesView(APIView):
    permission_classes = [IsAuthenticated] # 권한 추가
    def get(self, request, *args, **kwargs):
        print(f"[DEBUG] MyChallengesView - request.user: {request.user}")
        print(f"[DEBUG] MyChallengesView - request.auth: {request.auth}")
        from .challenges.models import Challenge
        challenges = Challenge.objects.filter(participants__user=request.user) if request.user.is_authenticated else Challenge.objects.none()
        serializer = ChallengeSerializer(challenges, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "My challenges fetched successfully"
        }, status=status.HTTP_200_OK)

class UserBadgesView(APIView):
    permission_classes = [IsAuthenticated] # 권한 추가
    def get(self, request, username, *args, **kwargs):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found", "data": []}, status=status.HTTP_404_NOT_FOUND)

        # 사용자가 획득한 배지
        from .challenges.models import Badge
        user_badges = Badge.objects.filter(user=user)
        
        # 모든 배지 정보와 사용자의 획득 여부를 함께 반환
        all_badges = Badge.objects.all()
        response_data = []
        acquired_badge_ids = set(ub.badge.id for ub in user_badges)

        for badge in all_badges:
            is_acquired = badge.id in acquired_badge_ids
            acquired_date = None
            if is_acquired:
                user_badge_instance = next((ub for ub in user_badges if ub.badge.id == badge.id), None)
                if user_badge_instance:
                    acquired_date = user_badge_instance.acquiredDate.strftime('%Y-%m-%d') if hasattr(user_badge_instance, 'acquiredDate') and user_badge_instance.acquiredDate else None
            response_data.append({
                "id": str(badge.id),
                "name": badge.name,
                "description": badge.description,
                "iconUrl": badge.icon_url if hasattr(badge, 'icon_url') else '',
                "isAcquired": is_acquired,
                "acquiredDate": acquired_date
            })

        return Response({
            "success": True,
            "data": response_data,
            "message": f"Badges for {username} fetched successfully"
        }, status=status.HTTP_200_OK)

class UserProfileStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        total_records = MealLog.objects.filter(user=user).count()
        total_calories = MealLog.objects.filter(user=user).aggregate(total=Sum('calories'))['total'] or 0
        avg_calories = MealLog.objects.filter(user=user).aggregate(avg=Avg('calories'))['avg'] or 0

        recent_records = MealLogSerializer(MealLog.objects.filter(user=user).order_by('-date', '-time')[:5], many=True).data

        return Response({
            "success": True,
            "data": {
                "total_records": total_records,
                "total_calories": total_calories,
                "avg_calories": round(avg_calories, 1),
                "recent_records": recent_records,
            },
            "message": "User profile statistics fetched successfully"
        }, status=status.HTTP_200_OK)

class UserStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # 일간/주간/월간 평균 칼로리
        daily_avg = MealLog.objects.filter(
            user=user,
            date=today
        ).aggregate(avg_calories=Avg('calories'))['avg_calories'] or 0

        weekly_avg = MealLog.objects.filter(
            user=user,
            date__gte=week_ago
        ).aggregate(avg_calories=Avg('calories'))['avg_calories'] or 0

        monthly_avg = MealLog.objects.filter(
            user=user,
            date__gte=month_ago
        ).aggregate(avg_calories=Avg('calories'))['avg_calories'] or 0

        # 음식 종류별 비율 (Pie Chart)
        food_categories = MealLog.objects.filter(
            user=user,
            date__gte=month_ago
        ).values('foodName').annotate(count=models.Count('id')).order_by('-count')[:10]

        pie_data = []
        for food in food_categories:
            pie_data.append({
                'name': food['foodName'],
                'value': food['count']
            })

        # 등급별 분포 (히트맵)
        grade_distribution = []
        for record in MealLog.objects.filter(user=user, date__gte=month_ago):
            grade = determine_grade(record.foodName, record.calories)
            grade_distribution.append({
                'grade': grade,
                'calories': record.calories,
                'count': 1 # 각 레코드를 1로 계산
            })

        # 점수 분포
        score_distribution = []
        for record in MealLog.objects.filter(user=user, date__gte=month_ago):
            score = calculate_nutrition_score(record.foodName, record.calories, record.mass)
            score_distribution.append(score)

        return Response({
            "success": True,
            "data": {
                "daily_avg": round(daily_avg, 1),
                "weekly_avg": round(weekly_avg, 1),
                "monthly_avg": round(monthly_avg, 1),
                "pie_data": pie_data,
                "grade_distribution": grade_distribution,
                "score_distribution": score_distribution,
                "total_records": MealLog.objects.filter(user=user).count(),
                "total_calories": MealLog.objects.filter(user=user).aggregate(total=Sum('calories'))['total'] or 0,
            },
            "message": "User statistics fetched successfully"
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_coaching_view(request):
    """AI 식단 코칭 API"""
    try:
        # 요청 데이터 파싱
        coaching_type = request.data.get('type', 'meal_feedback')
        meal_data = request.data.get('meal_data', {})
        
        print(f"AI 코칭 요청: type={coaching_type}, user={request.user}")
        
        # 사용자의 최근 식단 데이터 수집
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        # 오늘의 식단 데이터
        today_meals = MealLog.objects.filter(user=request.user, date=today)
        today_total_calories = sum(meal.calories for meal in today_meals)
        today_meal_list = [f"{meal.foodName}({int(meal.calories)}kcal)" for meal in today_meals]
        
        # 주간 식단 데이터
        weekly_meals = MealLog.objects.filter(user=request.user, date__gte=week_ago)
        weekly_avg_calories = weekly_meals.aggregate(Avg('calories'))['calories__avg'] or 0
        weekly_meal_count = weekly_meals.count()
        
        # 체중 데이터 (WeightRecord 모델 사용)
        from .models import WeightRecord
        recent_weights = WeightRecord.objects.filter(user=request.user, date__gte=week_ago).order_by('date')
        weight_change = 0
        if recent_weights.count() >= 2:
            weight_change = recent_weights.last().weight - recent_weights.first().weight
        
        # 코칭 타입별 처리
        if coaching_type == 'meal_feedback':
            # 개별 식사에 대한 피드백
            food_name = meal_data.get('food_name', '분석된 음식')
            calories = meal_data.get('calories', 0)
            
            coaching_result = generate_meal_coaching(
                food_name=food_name,
                calories=calories,
                today_total_calories=today_total_calories,
                today_meals=today_meal_list,
                user=request.user
            )
            
        elif coaching_type == 'detailed_meal_analysis':
            # 상세한 식사 분석
            coaching_result = generate_detailed_analysis(meal_data, request.user)
            
        elif coaching_type == 'weekly_report':
            # 주간 리포트
            coaching_result = generate_weekly_report(
                weekly_avg_calories=weekly_avg_calories,
                weekly_meal_count=weekly_meal_count,
                weight_change=weight_change,
                user=request.user
            )
            
        elif coaching_type == 'insights':
            # 고급 인사이트
            coaching_result = generate_insights(
                weekly_meals=weekly_meals,
                weight_change=weight_change,
                user=request.user
            )
            
        else:
            return Response({
                'success': False,
                'message': '지원하지 않는 코칭 타입입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'coaching': coaching_result,
            'message': 'AI 코칭이 생성되었습니다.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"AI 코칭 오류: {e}")
        return Response({
            'success': False,
            'coaching': "AI 코칭을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_meal_coaching(food_name, calories, today_total_calories, today_meals, user):
    """개별 식사에 대한 AI 코칭 생성"""
    try:
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            return "AI 코칭 서비스가 설정되지 않았습니다."
        
        # 권장 칼로리 (기본값: 2000kcal, 실제로는 사용자별 설정 가능)
        recommended_calories = 2000
        remaining_calories = recommended_calories - today_total_calories
        
        prompt = f"""
저는 건강한 식습관을 위해 노력하고 있습니다. 방금 '{food_name}'을 먹었고, 칼로리는 {calories}kcal입니다.

**오늘의 식단 현황:**
- 현재까지 총 섭취 칼로리: {today_total_calories}kcal
- 남은 권장 칼로리: {remaining_calories}kcal
- 오늘 먹은 음식: {', '.join(today_meals) if today_meals else '없음'}

이 정보를 바탕으로 아래 형식에 맞춰 친근하고 격려적인 식단 코칭을 한국어로 해주세요:

## 🍽️ 식사 평가
(이번 식사에 대한 긍정적인 평가 1-2문장)

## 💡 오늘의 조언
(남은 하루 식단 관리를 위한 구체적이고 실천 가능한 조언 2-3문장)

## 🎯 다음 식사 가이드
- (영양 균형을 위한 구체적인 제안)
- (칼로리 관리를 위한 팁)

※ 너무 길지 않게, 친근하고 격려하는 톤으로 작성해주세요.
"""
        
        return call_gemini_api(prompt)
        
    except Exception as e:
        print(f"식사 코칭 생성 실패: {e}")
        return f"'{food_name}'을 드셨네요! 칼로리는 {calories}kcal입니다. 균형 잡힌 식단을 위해 다음 식사에서는 채소와 단백질을 충분히 섭취해보세요."


def generate_detailed_analysis(meal_data, user):
    """상세한 식사 분석 생성"""
    try:
        food_name = meal_data.get('food_name', '분석된 음식')
        calories = meal_data.get('calories', 0)
        protein = meal_data.get('protein', 0)
        carbs = meal_data.get('carbs', 0)
        fat = meal_data.get('fat', 0)
        mass = meal_data.get('mass', 0)
        grade = meal_data.get('grade', 'C')
        
        # 영양소 비율 계산
        total_macro = protein + carbs + fat
        protein_ratio = (protein / total_macro * 100) if total_macro > 0 else 0
        carbs_ratio = (carbs / total_macro * 100) if total_macro > 0 else 0
        fat_ratio = (fat / total_macro * 100) if total_macro > 0 else 0
        
        prompt = f"""
영양 전문가로서 다음 음식을 상세히 분석해주세요:

**음식 정보:**
- 음식명: {food_name}
- 질량: {mass}g
- 총 칼로리: {calories}kcal
- 단백질: {protein}g ({protein_ratio:.1f}%)
- 탄수화물: {carbs}g ({carbs_ratio:.1f}%)
- 지방: {fat}g ({fat_ratio:.1f}%)
- 영양 등급: {grade}

아래 형식에 맞춰 전문적이고 실용적인 분석을 한국어로 제공해주세요:

## 🔍 영양 분석

### 칼로리 평가
(칼로리 수준이 적절한지 평가)

### 영양소 균형
(단백질, 탄수화물, 지방 비율 분석)

### 영양 등급 해석
(등급 {grade}의 의미와 건강 영향)

## 💡 개인화된 조언

### 긍정적인 점
- (이 음식의 좋은 점들)

### 주의사항
- (개선이 필요한 부분들)

## 🍽️ 다음 식사 가이드
(영양 균형을 맞추기 위한 구체적인 제안)
"""
        
        return call_gemini_api(prompt)
        
    except Exception as e:
        print(f"상세 분석 생성 실패: {e}")
        return "상세한 영양 분석을 생성하는 중 오류가 발생했습니다."


def generate_weekly_report(weekly_avg_calories, weekly_meal_count, weight_change, user):
    """주간 리포트 생성"""
    try:
        prompt = f"""
저는 지난 주 동안 건강한 식습관을 위해 노력했습니다. 

**주간 데이터:**
- 평균 일일 섭취 칼로리: {weekly_avg_calories:.0f}kcal
- 총 식사 기록 횟수: {weekly_meal_count}회
- 체중 변화: {weight_change:+.1f}kg

이 데이터를 바탕으로 아래 형식에 맞춰 격려적인 주간 리포트를 한국어로 생성해주세요:

## 📊 주간 요약
(전체적인 활동에 대한 긍정적인 총평)

## 🎉 잘한 점
- (구체적인 칭찬 포인트들)

## 🎯 다음 주 목표
- (실천 가능한 구체적인 제안들)

## 💪 격려 메시지
(동기부여가 되는 한 줄 메시지)

※ 긍정적이고 격려하는 톤으로 작성해주세요.
"""
        
        return call_gemini_api(prompt)
        
    except Exception as e:
        print(f"주간 리포트 생성 실패: {e}")
        return "주간 리포트를 생성하는 중 오류가 발생했습니다."


def generate_insights(weekly_meals, weight_change, user):
    """고급 인사이트 생성"""
    try:
        # 식단 패턴 분석
        meal_pattern = []
        days = ['월', '화', '수', '목', '금', '토', '일']
        week_ago = datetime.now().date() - timedelta(days=7)
        
        for i in range(7):
            day_date = week_ago + timedelta(days=i)
            day_meals = weekly_meals.filter(date=day_date)
            if day_meals.exists():
                total_calories = sum(meal.calories for meal in day_meals)
                meal_pattern.append(f"{days[i]}: {total_calories:.0f}kcal")
            else:
                meal_pattern.append(f"{days[i]}: 기록 없음")
        
        pattern_text = ', '.join(meal_pattern)
        
        prompt = f"""
저의 지난 일주일간 식단 패턴을 분석해주세요:

**식단 패턴:** {pattern_text}
**체중 변화:** {weight_change:+.1f}kg

이 데이터를 바탕으로 아래 형식에 맞춰 인사이트를 한국어로 제공해주세요:

## 🔍 발견된 패턴
(데이터 기반 식습관 패턴 분석)

## ✅ 긍정적인 점
- (패턴에서 발견된 좋은 부분들)

## 🎯 개선 제안
- (패턴 개선을 위한 구체적 제안들)

## 💡 맞춤 조언
(개인화된 실천 가능한 조언)

※ 데이터에 기반한 객관적이면서도 격려적인 분석을 해주세요.
"""
        
        return call_gemini_api(prompt)
        
    except Exception as e:
        print(f"인사이트 생성 실패: {e}")
        return "식단 인사이트를 생성하는 중 오류가 발생했습니다."


def call_gemini_api(prompt):
    """Gemini API 호출 공통 함수"""
    try:
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            return "AI 코칭 서비스가 설정되지 않았습니다."
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }]
        }
        
        response = requests.post(
            url,
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('candidates') and result['candidates'][0].get('content'):
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                return "AI 응답을 처리할 수 없습니다."
        else:
            print(f"Gemini API 오류: {response.status_code} - {response.text}")
            return f"AI 서비스 오류가 발생했습니다. (코드: {response.status_code})"
            
    except requests.exceptions.Timeout:
        return "AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
    except requests.exceptions.ConnectionError:
        return "AI 서비스에 연결할 수 없습니다. 네트워크 연결을 확인해주세요."
    except Exception as e:
        print(f"Gemini API 호출 실패: {e}")
        return f"AI 코칭 생성 중 오류가 발생했습니다: {str(e)}"