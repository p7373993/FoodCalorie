from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Sum
from datetime import datetime, timedelta, date
from api_integrated.models import MealLog

class Command(BaseCommand):
    help = '대시보드 그래프 테스트를 위한 식사 기록 데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='기존 테스트 데이터를 삭제하고 새로 생성합니다.',
        )

    def handle(self, *args, **options):
        self.stdout.write("🚀 테스트 데이터 생성 시작...")
        
        # 테스트 사용자 생성
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✅ 테스트 사용자 생성: {user.username}"))
        else:
            self.stdout.write(f"✅ 기존 테스트 사용자 사용: {user.username}")
        
        # 기존 테스트 데이터 삭제
        if options['clean']:
            deleted_count = MealLog.objects.filter(user=user).delete()[0]
            self.stdout.write(f"🗑️ 기존 테스트 데이터 {deleted_count}개 삭제")
        
        today = date.today()
        
        # 주간 식사 데이터 생성 (실제 음식 데이터 + 이미지)
        meal_data = [
            # 6일 전
            (today - timedelta(days=6), "계란토스트", 420, "breakfast", 63, 21, 9, "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop"),
            (today - timedelta(days=6), "김치찌개", 650, "lunch", 98, 35, 15, "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop"),
            (today - timedelta(days=6), "닭가슴살샐러드", 550, "dinner", 45, 42, 18, "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"),
            
            # 5일 전
            (today - timedelta(days=5), "오트밀", 380, "breakfast", 58, 16, 8, "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&h=300&fit=crop"),
            (today - timedelta(days=5), "비빔밥", 720, "lunch", 112, 28, 22, "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"),
            (today - timedelta(days=5), "견과류", 150, "snack", 12, 8, 12, "https://images.unsplash.com/photo-1504674900240-9a9049b7d63c?w=400&h=300&fit=crop"),
            (today - timedelta(days=5), "된장찌개", 480, "dinner", 65, 32, 14, "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop"),
            
            # 4일 전
            (today - timedelta(days=4), "샌드위치", 420, "breakfast", 55, 24, 12, "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop"),
            (today - timedelta(days=4), "카레라이스", 680, "lunch", 108, 26, 18, "https://images.unsplash.com/photo-1563379091339-03246963d4a9?w=400&h=300&fit=crop"),
            (today - timedelta(days=4), "삼겹살", 520, "dinner", 35, 38, 25, "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop"),
            
            # 3일 전
            (today - timedelta(days=3), "시리얼", 350, "breakfast", 62, 12, 6, "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&h=300&fit=crop"),
            (today - timedelta(days=3), "짜장면", 750, "lunch", 125, 28, 20, "https://images.unsplash.com/photo-1563379091339-03246963d4a9?w=400&h=300&fit=crop"),
            (today - timedelta(days=3), "과일", 200, "snack", 45, 2, 1, "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop"),
            (today - timedelta(days=3), "스테이크", 600, "dinner", 25, 45, 32, "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop"),
            
            # 2일 전
            (today - timedelta(days=2), "팬케이크", 400, "breakfast", 68, 14, 10, "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop"),
            (today - timedelta(days=2), "라멘", 700, "lunch", 115, 32, 18, "https://images.unsplash.com/photo-1563379091339-03246963d4a9?w=400&h=300&fit=crop"),
            (today - timedelta(days=2), "피자", 580, "dinner", 65, 28, 22, "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop"),
            
            # 1일 전
            (today - timedelta(days=1), "토스트", 380, "breakfast", 52, 18, 12, "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop"),
            (today - timedelta(days=1), "김밥", 650, "lunch", 98, 24, 16, "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"),
            (today - timedelta(days=1), "요구르트", 180, "snack", 28, 8, 4, "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop"),
            (today - timedelta(days=1), "치킨", 520, "dinner", 45, 35, 22, "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop"),
            
            # 오늘은 기록하지 않음 (시연용)
        ]
        
        created_count = 0
        for meal_data_item in meal_data:
            meal_date, food_name, calories, meal_type, carbs, protein, fat, image_url = meal_data_item
            
            # 이미 존재하는지 확인
            existing = MealLog.objects.filter(
                user=user,
                date=meal_date,
                mealType=meal_type
            ).first()
            
            if not existing:
                meal = MealLog.objects.create(
                    user=user,
                    date=meal_date,
                    mealType=meal_type,
                    foodName=food_name,
                    calories=calories,
                    carbs=carbs,
                    protein=protein,
                    fat=fat,
                    nutriScore='B',
                    time=datetime.strptime('12:00', '%H:%M').time(),
                    imageUrl=image_url
                )
                created_count += 1
                self.stdout.write(f"🍽️ {meal_date} {meal_type}: {food_name} ({calories}kcal)")
        
        self.stdout.write(f"\n✅ 총 {created_count}개의 식사 기록이 생성되었습니다.")
        
        # 주간 통계 출력
        week_start = today - timedelta(days=6)
        weekly_stats = MealLog.objects.filter(
            user=user,
            date__range=[week_start, today]
        ).values('date').annotate(
            daily_calories=Sum('calories')
        ).order_by('date')
        
        self.stdout.write(f"\n📊 주간 칼로리 통계:")
        for stat in weekly_stats:
            self.stdout.write(f"   {stat['date']}: {stat['daily_calories']}kcal")
        
        self.stdout.write(self.style.SUCCESS("\n🎉 테스트 데이터 생성 완료!"))
        self.stdout.write("이제 대시보드에서 그래프를 확인해보세요.") 