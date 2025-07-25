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
        fields = '__all__'

class AICoachTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICoachTip
        fields = '__all__'