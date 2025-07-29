from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, IntervalSchedule
import json

class Command(BaseCommand):
    help = '주기적 파일 정리 작업을 설정합니다'

    def handle(self, *args, **options):
        # 매일 새벽 2시에 실행되는 스케줄 생성
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=1,
            period=IntervalSchedule.DAYS,
        )

        # 주기적 작업 생성
        task, created = PeriodicTask.objects.get_or_create(
            name='cleanup_temp_files',
            defaults={
                'interval': schedule,
                'task': 'mlserver.tasks.cleanup_temp_files_task',
                'kwargs': json.dumps({'days': 7}),
                'enabled': True,
            }
        )

        if created:
            self.stdout.write("✅ 주기적 파일 정리 작업이 생성되었습니다.")
        else:
            self.stdout.write("ℹ️  주기적 파일 정리 작업이 이미 존재합니다.")
        
        self.stdout.write(f"📅 스케줄: 매일 실행")
        self.stdout.write(f"🗑️  7일 이상 된 파일 자동 정리")