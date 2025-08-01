# -*- coding: utf-8 -*-
import os
import django
from datetime import datetime, timedelta, date
from django.contrib.auth.models import User
import random

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api_integrated.models import MealLog, WeightRecord

def create_test_data():
    # Create test user
    username = 'testuser30days'
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': 'testuser30days@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"New test user created: {user.username}")
    else:
        print(f"Using existing test user: {user.username}")
    
    # Clean existing data
    MealLog.objects.filter(user=user).delete()
    WeightRecord.objects.filter(user=user).delete()
    print("Existing data cleaned")
    
    # Korean foods with calories (no decimals)
    korean_foods = [
        ("Kimchi Stew", 350), ("Soybean Paste Stew", 280), ("Bulgogi", 420), ("Bibimbap", 480),
        ("Cold Noodles", 380), ("Pork Belly", 520), ("Galbitang", 450), ("Kimbap", 320),
        ("Ramen", 400), ("Chicken", 580), ("Pizza", 650), ("Hamburger", 550),
        ("Jajangmyeon", 480), ("Jjamppong", 520), ("Sweet and Sour Pork", 600), ("Fried Rice", 420),
        ("Soft Tofu Stew", 250), ("Braised Ribs", 480), ("Chicken Galbi", 380), ("Tteokbokki", 320),
        ("Omurice", 450), ("Pork Cutlet", 520), ("Grilled Fish", 280), ("Vegetable Side Dish", 150),
        ("Egg Roll", 180), ("Toast", 250), ("Salad", 200), ("Fruit", 120),
        ("Yogurt", 100), ("Nuts", 180)
    ]
    
    today = date.today()
    meal_count = 0
    
    # Create 30 days meal data
    for i in range(30):
        meal_date = today - timedelta(days=29-i)
        
        # Today only breakfast
        if i == 29:  # Today
            food_name, base_calories = random.choice(korean_foods[:10])
            calories = int(base_calories * random.uniform(0.8, 1.2))
            
            MealLog.objects.create(
                user=user,
                date=meal_date,
                mealType='breakfast',
                foodName=f"Breakfast {food_name}",
                calories=calories,
                carbs=int(calories * 0.6 / 4),
                protein=int(calories * 0.2 / 4),
                fat=int(calories * 0.2 / 9),
                nutriScore=random.choice(['A', 'B', 'C']),
                time=datetime.strptime(f"{random.randint(7,9)}:{random.randint(0,59):02d}", '%H:%M').time()
            )
            meal_count += 1
            print(f"Meal {meal_date} breakfast: {food_name} ({calories}kcal)")
        else:
            # Other days: 2-4 meals per day
            meals_per_day = random.randint(2, 4)
            meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
            selected_meals = random.sample(meal_types, meals_per_day)
            
            for meal_type in selected_meals:
                food_name, base_calories = random.choice(korean_foods)
                
                # Adjust calories by meal type
                if meal_type == 'breakfast':
                    calories = int(base_calories * random.uniform(0.7, 1.0))
                    time_hour = random.randint(7, 9)
                elif meal_type == 'lunch':
                    calories = int(base_calories * random.uniform(1.0, 1.3))
                    time_hour = random.randint(12, 14)
                elif meal_type == 'dinner':
                    calories = int(base_calories * random.uniform(0.9, 1.2))
                    time_hour = random.randint(18, 20)
                else:  # snack
                    calories = int(base_calories * random.uniform(0.3, 0.6))
                    time_hour = random.randint(15, 17)
                
                meal_name_prefix = {
                    'breakfast': 'Breakfast',
                    'lunch': 'Lunch', 
                    'dinner': 'Dinner',
                    'snack': 'Snack'
                }
                
                MealLog.objects.create(
                    user=user,
                    date=meal_date,
                    mealType=meal_type,
                    foodName=f"{meal_name_prefix[meal_type]} {food_name}",
                    calories=calories,
                    carbs=int(calories * 0.6 / 4),
                    protein=int(calories * 0.2 / 4),
                    fat=int(calories * 0.2 / 9),
                    nutriScore=random.choice(['A', 'B', 'C', 'D']),
                    time=datetime.strptime(f"{time_hour}:{random.randint(0,59):02d}", '%H:%M').time()
                )
                meal_count += 1
    
    print(f"Total {meal_count} meal records created")
    
    # Create 7 days weight data (no decimals)
    base_weight = random.randint(60, 80)
    weight_count = 0
    
    for i in range(7):
        weight_date = today - timedelta(days=6-i)
        
        if i == 0:
            weight = base_weight
        else:
            weight_change = random.randint(-1, 1)
            weight = max(50, min(100, base_weight + weight_change))
            base_weight = weight
        
        WeightRecord.objects.create(
            user=user,
            weight=weight,
            date=weight_date
        )
        weight_count += 1
        print(f"Weight {weight_date}: {weight}kg")
    
    print(f"Total {weight_count} weight records created")
    print(f"Username: {user.username}")
    print("Password: testpass123")
    print("Today only breakfast is recorded")

if __name__ == '__main__':
    create_test_data()