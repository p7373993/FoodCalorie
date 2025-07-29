from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from mlserver.models import MassEstimationTask
from api_integrated.models import MealLog
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '오래된 임시 파일과 완료된 ML 작업을 정리합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='며칠 이상 된 파일을 삭제할지 설정 (기본값: 7일)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 삭제하지 않고 삭제될 파일만 표시'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(f"🧹 {days}일 이상 된 임시 파일 정리 시작...")
        if dry_run:
            self.stdout.write("⚠️  DRY RUN 모드: 실제 삭제하지 않습니다")

        # 1. 완료/실패된 ML 작업 중 MealLog에 저장되지 않은 것들 정리
        orphaned_tasks = MassEstimationTask.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed']
        )

        deleted_files = 0
        deleted_tasks = 0
        preserved_tasks = 0

        for task in orphaned_tasks:
            # MealLog에서 이 이미지를 사용하는지 확인
            if task.image_file:
                image_url = task.image_file.url
                is_used_in_meal_log = MealLog.objects.filter(
                    imageUrl=image_url
                ).exists()

                if is_used_in_meal_log:
                    # MealLog에서 사용 중이면 보존
                    preserved_tasks += 1
                    self.stdout.write(
                        f"✅ 보존: {task.task_id} (MealLog에서 사용 중)"
                    )
                    continue

            # 사용되지 않는 파일 삭제
            if not dry_run:
                if task.image_file:
                    try:
                        task.image_file.delete(save=False)
                        deleted_files += 1
                    except Exception as e:
                        logger.error(f"파일 삭제 실패 {task.image_file.name}: {e}")
                
                task.delete()
                deleted_tasks += 1
            else:
                self.stdout.write(f"🗑️  삭제 예정: {task.task_id}")
                if task.image_file:
                    self.stdout.write(f"   파일: {task.image_file.name}")

        # 2. 고아 이미지 파일 정리 (DB에 기록되지 않은 파일들)
        from django.conf import settings
        import glob
        
        meal_images_path = os.path.join(settings.MEDIA_ROOT, 'meal_images')
        if os.path.exists(meal_images_path):
            all_files = glob.glob(os.path.join(meal_images_path, '*'))
            orphaned_files = 0
            
            for file_path in all_files:
                if os.path.isfile(file_path):
                    file_name = os.path.basename(file_path)
                    relative_path = f'meal_images/{file_name}'
                    
                    # MealLog나 MassEstimationTask에서 사용되는지 확인
                    used_in_meal_log = MealLog.objects.filter(
                        imageUrl__icontains=file_name
                    ).exists()
                    
                    used_in_task = MassEstimationTask.objects.filter(
                        image_file=relative_path
                    ).exists()
                    
                    if not used_in_meal_log and not used_in_task:
                        # 파일 생성 시간 확인
                        file_mtime = timezone.datetime.fromtimestamp(
                            os.path.getmtime(file_path), 
                            tz=timezone.get_current_timezone()
                        )
                        
                        if file_mtime < cutoff_date:
                            if not dry_run:
                                try:
                                    os.remove(file_path)
                                    orphaned_files += 1
                                    self.stdout.write(f"🗑️  고아 파일 삭제: {file_name}")
                                except Exception as e:
                                    logger.error(f"고아 파일 삭제 실패 {file_path}: {e}")
                            else:
                                self.stdout.write(f"🗑️  고아 파일 삭제 예정: {file_name}")

        # 결과 출력
        self.stdout.write("\n" + "="*50)
        self.stdout.write("🎯 정리 결과:")
        if not dry_run:
            self.stdout.write(f"   삭제된 작업: {deleted_tasks}개")
            self.stdout.write(f"   삭제된 파일: {deleted_files}개")
            self.stdout.write(f"   보존된 작업: {preserved_tasks}개")
            if 'orphaned_files' in locals():
                self.stdout.write(f"   삭제된 고아 파일: {orphaned_files}개")
        else:
            self.stdout.write(f"   삭제 예정 작업: {len(orphaned_tasks)}개")
            self.stdout.write(f"   보존될 작업: {preserved_tasks}개")
        
        self.stdout.write("✅ 정리 완료!")