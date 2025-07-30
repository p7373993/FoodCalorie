"""
API 데이터 검증 모듈
"""
from rest_framework import serializers
from datetime import datetime, date
import re

class MealDataValidator:
    """식사 데이터 검증 클래스"""
    
    @staticmethod
    def validate_food_name(food_name):
        """음식명 검증"""
        if not food_name or not food_name.strip():
            raise serializers.ValidationError("음식명은 필수입니다.")
        
        if len(food_name.strip()) > 100:
            raise serializers.ValidationError("음식명은 100자 이하여야 합니다.")
        
        # 특수문자 제한 (기본적인 한글, 영문, 숫자, 공백, 일부 특수문자만 허용)
        if not re.match(r'^[가-힣a-zA-Z0-9\s\-\(\)\[\]\.]+$', food_name.strip()):
            raise serializers.ValidationError("음식명에 허용되지 않는 문자가 포함되어 있습니다.")
        
        return food_name.strip()
    
    @staticmethod
    def validate_calories(calories):
        """칼로리 검증"""
        try:
            calories = float(calories)
        except (ValueError, TypeError):
            raise serializers.ValidationError("칼로리는 숫자여야 합니다.")
        
        if calories < 0:
            raise serializers.ValidationError("칼로리는 0 이상이어야 합니다.")
        
        if calories > 5000:
            raise serializers.ValidationError("칼로리는 5000 이하여야 합니다.")
        
        return round(calories, 1)
    
    @staticmethod
    def validate_nutrition_value(value, field_name):
        """영양소 값 검증 (탄수화물, 단백질, 지방)"""
        if value is None:
            return 0.0
        
        try:
            value = float(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError(f"{field_name}은(는) 숫자여야 합니다.")
        
        if value < 0:
            raise serializers.ValidationError(f"{field_name}은(는) 0 이상이어야 합니다.")
        
        if value > 1000:
            raise serializers.ValidationError(f"{field_name}은(는) 1000 이하여야 합니다.")
        
        return round(value, 1)
    
    @staticmethod
    def validate_meal_type(meal_type):
        """식사 타입 검증"""
        valid_types = ['breakfast', 'lunch', 'dinner', 'snack']
        
        if meal_type not in valid_types:
            raise serializers.ValidationError(f"식사 타입은 {valid_types} 중 하나여야 합니다.")
        
        return meal_type
    
    @staticmethod
    def validate_date(date_value):
        """날짜 검증"""
        if isinstance(date_value, str):
            try:
                date_value = datetime.strptime(date_value, '%Y-%m-%d').date()
            except ValueError:
                raise serializers.ValidationError("날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)")
        
        if not isinstance(date_value, date):
            raise serializers.ValidationError("올바른 날짜 형식이 아닙니다.")
        
        # 미래 날짜 제한 (최대 1일 후까지 허용)
        today = date.today()
        if date_value > today:
            raise serializers.ValidationError("미래 날짜는 입력할 수 없습니다.")
        
        # 과거 날짜 제한 (최대 1년 전까지 허용)
        from datetime import timedelta
        one_year_ago = today - timedelta(days=365)
        if date_value < one_year_ago:
            raise serializers.ValidationError("1년 이전의 날짜는 입력할 수 없습니다.")
        
        return date_value
    
    @staticmethod
    def validate_nutri_score(score):
        """영양 등급 검증"""
        valid_scores = ['A', 'B', 'C', 'D', 'E', 'UNKNOWN']
        
        if score and score not in valid_scores:
            raise serializers.ValidationError(f"영양 등급은 {valid_scores} 중 하나여야 합니다.")
        
        return score or 'C'

class WeightDataValidator:
    """체중 데이터 검증 클래스"""
    
    @staticmethod
    def validate_weight(weight):
        """체중 검증"""
        try:
            weight = float(weight)
        except (ValueError, TypeError):
            raise serializers.ValidationError("체중은 숫자여야 합니다.")
        
        if weight < 20:
            raise serializers.ValidationError("체중은 20kg 이상이어야 합니다.")
        
        if weight > 300:
            raise serializers.ValidationError("체중은 300kg 이하여야 합니다.")
        
        return round(weight, 1)

class ImageDataValidator:
    """이미지 데이터 검증 클래스"""
    
    @staticmethod
    def validate_image_file(image_file):
        """이미지 파일 검증"""
        if not image_file:
            raise serializers.ValidationError("이미지 파일이 필요합니다.")
        
        # 파일 크기 검증 (10MB 제한)
        max_size = 10 * 1024 * 1024  # 10MB
        if image_file.size > max_size:
            raise serializers.ValidationError("이미지 파일 크기는 10MB 이하여야 합니다.")
        
        # 파일 형식 검증
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp']
        if image_file.content_type not in allowed_types:
            # content_type이 없는 경우 파일 확장자로 검증
            if hasattr(image_file, 'name') and image_file.name:
                file_extension = image_file.name.lower().split('.')[-1]
                allowed_extensions = ['jpg', 'jpeg', 'png', 'bmp', 'webp']
                if file_extension not in allowed_extensions:
                    raise serializers.ValidationError(
                        f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_extensions)}"
                    )
            else:
                raise serializers.ValidationError("이미지 파일만 업로드 가능합니다.")
        
        return image_file