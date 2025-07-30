from rest_framework import serializers
from .models import MealLog, AICoachTip, WeightRecord
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .validators import MealDataValidator, WeightDataValidator

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Token.objects.create(user=user)
        return user
    
    def validate_email(self, value):
        """이메일 중복 검증"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value
    
    def validate_username(self, value):
        """사용자명 검증"""
        if len(value) < 3:
            raise serializers.ValidationError("사용자명은 3자 이상이어야 합니다.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용 중인 사용자명입니다.")
        return value

class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = ['id', 'date', 'mealType', 'foodName', 'calories', 'carbs', 'protein', 'fat', 'nutriScore', 'imageUrl', 'time']
        read_only_fields = ['id', 'user']
    
    def validate_foodName(self, value):
        return MealDataValidator.validate_food_name(value)
    
    def validate_calories(self, value):
        return MealDataValidator.validate_calories(value)
    
    def validate_carbs(self, value):
        return MealDataValidator.validate_nutrition_value(value, "탄수화물")
    
    def validate_protein(self, value):
        return MealDataValidator.validate_nutrition_value(value, "단백질")
    
    def validate_fat(self, value):
        return MealDataValidator.validate_nutrition_value(value, "지방")
    
    def validate_mealType(self, value):
        return MealDataValidator.validate_meal_type(value)
    
    def validate_date(self, value):
        return MealDataValidator.validate_date(value)
    
    def validate_nutriScore(self, value):
        return MealDataValidator.validate_nutri_score(value)

class WeightRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightRecord
        fields = ['id', 'weight', 'date', 'time', 'created_at']
        read_only_fields = ['id', 'user', 'time', 'created_at']
    
    def validate_weight(self, value):
        return WeightDataValidator.validate_weight(value)
    
    def validate_date(self, value):
        return MealDataValidator.validate_date(value)

class AICoachTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICoachTip
        fields = '__all__'