"""
주간 치팅 초기화 명령어
매주 월요일 자정에 실행되어 모든 사용자의 주간 치팅 사용 횟수를 초기화합니다.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from challenges.services import WeeklyResetService
import logging

logger = logging.getLogger('challenges')


class Command(BaseCommand):
    help = '주간 치팅 사용 횟수를 초기화합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 초기화 없이 시뮬레이션만 실행',
        )

    def handle(self, *args, **options):
        self.stdout.write('🔄 주간 치팅 초기화 시작...')
        
        reset_service = WeeklyResetService()
        
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN 모드로 실행됩니다.')
            )
            # 시뮬레이션: 활성 챌린지 수만 확인
            from challenges.models import UserChallenge
            active_count = UserChallenge.objects.filter(status='active').count()
            self.stdout.write(f'📊 초기화 대상: {active_count}개의 활성 챌린지')
            return
        
        try:
            updated_count = reset_service.reset_weekly_cheat_counts()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ 주간 치팅 초기화 완료! {updated_count}개의 챌린지가 업데이트되었습니다.'
                )
            )
            
            logger.info(f'Weekly cheat reset completed: {updated_count} challenges updated')
            
        except Exception as e:
            error_msg = f'주간 치팅 초기화 중 오류 발생: {e}'
            self.stdout.write(self.style.ERROR(f'❌ {error_msg}'))
            logger.error(error_msg)
            raise