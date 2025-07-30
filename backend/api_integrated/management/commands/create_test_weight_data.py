# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import datetime, timedelta, date
from api_integrated.models import WeightRecord

class Command(BaseCommand):
    help = '체중 변화 테스트를 위한 체중 기록 데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='기존 테스트 데이터를 삭제하고 새로 생성합니다.',
        )

    def handle(self, *args, **options):
        self.stdout.write("⚖️ 체중 테스트 데이터 생성 시작...")
        
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com', 'first_name': 'Test', 'last_name': 'User'}
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✅ 테스트 사용자 생성: {user.username}"))
        else:
            self.stdout.write(f"✅ 기존 테스트 사용자 사용: {user.username}")

        if options['clean']:
            deleted_count = WeightRecord.objects.filter(user=user).delete()[0]
            self.stdout.write(f"🗑️ 기존 체중 데이터 {deleted_count}개 삭제")

        today = date.today()
        
        # 일주일치 체중 데이터 (현실적인 변화)
        weight_data = [
            (today - timedelta(days=6), 75.2),
            (today - timedelta(days=5), 75.0),
            (today - timedelta(days=4), 74.8),
            (today - timedelta(days=3), 74.9),
            (today - timedelta(days=2), 74.7),
            (today - timedelta(days=1), 74.5),
            (today, 74.3),
        ]

        created_count = 0
        for weight_date, weight in weight_data:
            existing = WeightRecord.objects.filter(user=user, date=weight_date).first()
            if not existing:
                WeightRecord.objects.create(
                    user=user,
                    date=weight_date,
                    weight=weight
                )
                created_count += 1
                self.stdout.write(f"⚖️ {weight_date}: {weight}kg")

        self.stdout.write(f"\n✅ 총 {created_count}개의 체중 기록이 생성되었습니다.")
        
        # 주간 통계 출력
        week_start = today - timedelta(days=6)
        weekly_weights = WeightRecord.objects.filter(
            user=user, 
            date__range=[week_start, today]
        ).order_by('date')
        
        if weekly_weights.exists():
            weights = [record.weight for record in weekly_weights]
            self.stdout.write(f"\n📊 주간 체중 통계:")
            self.stdout.write(f"   시작: {weights[0]}kg")
            self.stdout.write(f"   끝: {weights[-1]}kg")
            self.stdout.write(f"   변화: {weights[-1] - weights[0]:+.1f}kg")
            self.stdout.write(f"   최고: {max(weights)}kg")
            self.stdout.write(f"   최저: {min(weights)}kg")
            self.stdout.write(f"   평균: {sum(weights)/len(weights):.1f}kg")
        
        self.stdout.write(self.style.SUCCESS("\n🎉 체중 테스트 데이터 생성 완료!"))
        self.stdout.write("이제 대시보드에서 체중 변화 그래프를 확인해보세요.") 