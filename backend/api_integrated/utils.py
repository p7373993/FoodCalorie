"""
API 통합 유틸리티 함수들
"""
import os
import pandas as pd
from django.conf import settings

def load_food_data():
    """음식 데이터 CSV 파일 로드"""
    csv_paths = [
        os.path.join(settings.BASE_DIR, '음식만개등급화.csv'),
        os.path.join(settings.BASE_DIR, 'korean_food_nutri_score_final.csv')
    ]
    
    for csv_path in csv_paths:
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path, encoding='utf-8')
                print(f"✅ 음식 데이터 로드 성공: {csv_path}")
                return df
            except Exception as e:
                print(f"❌ 음식 데이터 로드 실패: {e}")
                continue
    
    print("⚠️ 음식 데이터 파일을 찾을 수 없습니다.")
    return None

def determine_grade(food_name, calories=None):
    """음식 등급 결정"""
    food_df = load_food_data()
    
    if food_df is not None:
        # CSV에서 등급 찾기
        row = food_df[food_df['식품명'] == food_name]
        if row.empty:
            # 부분 일치 검색
            row = food_df[food_df['식품명'].str.contains(food_name, na=False, regex=False)]
        
        if not row.empty and 'kfni_grade' in row.columns:
            grade = row.iloc[0]['kfni_grade']
            if grade and grade != 'nan':
                return grade
    
    # CSV에서 찾지 못한 경우 칼로리 기반 등급 결정
    if calories is not None:
        if calories < 300:
            return 'A'
        elif calories < 600:
            return 'B'
        else:
            return 'C'
    
    return 'C'  # 기본값

def calculate_nutrition_score(food_name, calories, mass=100):
    """영양 점수 계산"""
    grade = determine_grade(food_name, calories)
    
    # 등급별 기본 점수
    grade_scores = {
        'A': 15,
        'B': 10, 
        'C': 5,
        'D': 3,
        'E': 1
    }
    
    base_score = grade_scores.get(grade, 8)
    
    # 칼로리 기반 보너스/페널티
    if calories < 300:
        bonus = 3
    elif calories < 600:
        bonus = 1
    else:
        bonus = -2
    
    final_score = max(1, min(15, base_score + bonus))
    return final_score

def get_nutrition_from_csv(food_name, mass=100):
    """CSV에서 영양정보 추출"""
    food_df = load_food_data()
    
    if food_df is None:
        return None, None, None, None, 'C'
    
    try:
        # 1. 완전일치 검색
        row = food_df[food_df['식품명'] == food_name]
        
        # 2. 부분일치 검색
        if row.empty:
            row = food_df[food_df['식품명'].str.contains(food_name, na=False, regex=False)]
        
        # 3. 키워드 검색
        if row.empty:
            keywords = food_name.split()
            for keyword in keywords:
                if len(keyword) > 1:
                    row = food_df[food_df['식품명'].str.contains(keyword, na=False, regex=False)]
                    if not row.empty:
                        break
        
        if not row.empty:
            first_row = row.iloc[0]
            
            # 100g당 영양정보를 실제 질량에 맞게 계산
            calories_per_100g = float(first_row['에너지(kcal)']) if first_row['에너지(kcal)'] else 0
            calories = round(calories_per_100g * (mass / 100), 1)
            
            # 탄수화물 계산 - CSV에 전체 탄수화물 컬럼이 없으므로 추정
            sugar = float(first_row['당류(g)']) if '당류(g)' in first_row and pd.notna(first_row['당류(g)']) else 0
            fiber = float(first_row['식이섬유(g)']) if '식이섬유(g)' in first_row and pd.notna(first_row['식이섬유(g)']) else 0
            
            # 단백질과 지방 정보 추출
            protein_per_100g = float(first_row['단백질(g)']) if pd.notna(first_row['단백질(g)']) else 0
            fat_per_100g = float(first_row['포화지방산(g)']) if '포화지방산(g)' in first_row and pd.notna(first_row['포화지방산(g)']) else 0
            
            # 탄수화물 추정: 칼로리에서 단백질과 지방 칼로리를 빼고 나머지를 탄수화물로 계산
            # 단백질 4kcal/g, 지방 9kcal/g, 탄수화물 4kcal/g
            protein_calories = protein_per_100g * 4
            fat_calories = fat_per_100g * 9
            remaining_calories = max(0, calories_per_100g - protein_calories - fat_calories)
            estimated_carbs_per_100g = remaining_calories / 4
            
            # 당류와 식이섬유의 합이 추정 탄수화물보다 크면 그 값을 사용
            known_carbs = sugar + fiber
            carbs_per_100g = max(known_carbs, estimated_carbs_per_100g)
            
            # 실제 질량에 맞게 계산
            carbs = round(carbs_per_100g * (mass / 100), 1)
            protein = round(protein_per_100g * (mass / 100), 1)
            fat = round(fat_per_100g * (mass / 100), 1)
            
            grade = first_row['kfni_grade'] if 'kfni_grade' in first_row and first_row['kfni_grade'] else 'C'
            
            return calories, carbs, protein, fat, grade
        
    except Exception as e:
        print(f"CSV 영양소 추출 실패: {e}")
    
    return None, None, None, None, 'C'

def estimate_mass_from_food_name(food_name, calories=None):
    """음식명으로부터 질량 추정"""
    if calories is None:
        calories = 200  # 기본값
    
    # 음식 종류별 칼로리 밀도 (kcal/100g)
    if '밥' in food_name or '쌀' in food_name:
        return round(calories / 1.2, 1)  # 밥: 약 120kcal/100g
    elif '고기' in food_name or '육류' in food_name or '돈까스' in food_name:
        return round(calories / 2.5, 1)  # 고기: 약 250kcal/100g
    elif '면' in food_name or '국수' in food_name or '라면' in food_name:
        return round(calories / 1.1, 1)  # 면류: 약 110kcal/100g
    elif '빵' in food_name or '과자' in food_name:
        return round(calories / 2.8, 1)  # 빵/과자: 약 280kcal/100g
    elif '과일' in food_name or '사과' in food_name or '바나나' in food_name:
        return round(calories / 0.6, 1)  # 과일: 약 60kcal/100g
    elif '야채' in food_name or '채소' in food_name or '샐러드' in food_name:
        return round(calories / 0.3, 1)  # 야채: 약 30kcal/100g
    else:
        return round(calories / 2.0, 1)  # 기본값: 200kcal/100g

def validate_meal_data(data):
    """식사 데이터 검증"""
    errors = []
    
    # 필수 필드 검증
    required_fields = ['foodName', 'calories', 'mealType', 'date']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'{field}는 필수 항목입니다.')
    
    # 칼로리 범위 검증
    if 'calories' in data:
        try:
            calories = float(data['calories'])
            if calories < 0 or calories > 5000:
                errors.append('칼로리는 0~5000 범위여야 합니다.')
        except (ValueError, TypeError):
            errors.append('칼로리는 숫자여야 합니다.')
    
    # 식사 타입 검증
    if 'mealType' in data:
        valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        if data['mealType'] not in valid_meal_types:
            errors.append(f'식사 타입은 {valid_meal_types} 중 하나여야 합니다.')
    
    return errors

def format_meal_response(meal_log):
    """식사 기록 응답 포맷"""
    return {
        'id': meal_log.id,
        'date': meal_log.date.strftime('%Y-%m-%d'),
        'mealType': meal_log.mealType,
        'foodName': meal_log.foodName,
        'calories': meal_log.calories,
        'carbs': meal_log.carbs,
        'protein': meal_log.protein,
        'fat': meal_log.fat,
        'nutriScore': meal_log.nutriScore,
        'imageUrl': meal_log.imageUrl,
        'time': meal_log.time.strftime('%H:%M:%S') if meal_log.time else None
    }