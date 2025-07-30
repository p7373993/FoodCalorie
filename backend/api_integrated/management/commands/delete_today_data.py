# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import date
from api_integrated.models import MealLog, WeightRecord

class Command(BaseCommand):
    help = '오늘 날짜의 모든 식사 기록과 체중 데이터를 삭제합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            default='test_user',
            help='삭제할 사용자명 (기본값: test_user)',
        )

    def handle(self, *args, **options):
        self.stdout.write("🗑️ 오늘 데이터 삭제 시작...")
        
        username = options['user']
        today = date.today()
        
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f"✅ 사용자 찾음: {username}")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ 사용자를 찾을 수 없습니다: {username}"))
            return

        # 오늘 식사 기록 삭제
        meal_deleted_count = MealLog.objects.filter(
            user=user,
            date=today
        ).delete()[0]
        
        self.stdout.write(f"🍽️ 오늘 식사 기록 {meal_deleted_count}개 삭제")

        # 오늘 체중 기록 삭제
        weight_deleted_count = WeightRecord.objects.filter(
            user=user,
            date=today
        ).delete()[0]
        
        self.stdout.write(f"⚖️ 오늘 체중 기록 {weight_deleted_count}개 삭제")

        total_deleted = meal_deleted_count + weight_deleted_count
        
        if total_deleted > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ 총 {total_deleted}개의 오늘 데이터가 삭제되었습니다."))
        else:
            self.stdout.write("ℹ️ 삭제할 오늘 데이터가 없습니다.")
        
        self.stdout.write(f"📅 삭제된 날짜: {today}")
        self.stdout.write("🎉 오늘 데이터 삭제 완료!") 