from rest_framework import serializers
from .models import MealLog, AICoachTip
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Token.objects.create(user=user)
        return user

class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = ['id', 'date', 'mealType', 'foodName', 'calories', 'carbs', 'protein', 'fat', 'nutriScore', 'imageUrl', 'time']
        read_only_fields = ['id', 'user']  # user는 자동으로 설정되므로 읽기 전용
    
    def validate(self, data):
        print(f"=== MealLogSerializer 검증 ===")
        print(f"입력 데이터: {data}")
        return data

class AICoachTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICoachTip
        fields = '__all__'