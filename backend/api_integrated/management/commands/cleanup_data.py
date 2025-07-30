"""
데이터 정리 명령어
"""
from django.core.management.base import BaseCommand
from api_integrated.models import MealLog, WeightRecord
from mlserver.models import MassEstimationTask
from datetime import datetime, timedelta
from django.utils import timezone

class Command(BaseCommand):
    help = '오래된 데이터를 정리합니다'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='보관할 데이터 일수 (기본: 30일)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 삭제하지 않고 삭제될 데이터만 확인'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(f'데이터 정리 시작 (기준일: {cutoff_date.date()})')
        
        if dry_run:
            self.stdout.write('*** DRY RUN 모드 - 실제 삭제하지 않습니다 ***')
        
        # 오래된 ML 작업 정리
        old_ml_tasks = MassEstimationTask.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed']
        )
        
        self.stdout.write(f'정리할 ML 작업: {old_ml_tasks.count()}개')
        
        if not dry_run:
            deleted_count = old_ml_tasks.delete()[0]
            self.stdout.write(f'ML 작업 {deleted_count}개 삭제 완료')
        
        # 사용자가 없는 고아 데이터 정리
        orphan_meals = MealLog.objects.filter(user__isnull=True)
        orphan_weights = WeightRecord.objects.filter(user__isnull=True)
        
        self.stdout.write(f'고아 식사 기록: {orphan_meals.count()}개')
        self.stdout.write(f'고아 체중 기록: {orphan_weights.count()}개')
        
        if not dry_run:
            orphan_meals.delete()
            orphan_weights.delete()
            self.stdout.write('고아 데이터 정리 완료')
        
        self.stdout.write(
            self.style.SUCCESS('데이터 정리 완료' if not dry_run else 'DRY RUN 완료')
        )