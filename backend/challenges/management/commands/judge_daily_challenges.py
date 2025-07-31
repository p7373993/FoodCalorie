"""
일일 챌린지 판정 자동화 명령어
매일 자정에 실행되어 모든 활성 챌린지의 일일 성과를 판정합니다.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from challenges.models import UserChallenge, DailyChallengeRecord
from challenges.services import ChallengeJudgmentService
import logging

logger = logging.getLogger('challenges')


class Command(BaseCommand):
    help = '일일 챌린지 판정을 실행합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='판정할 날짜 (YYYY-MM-DD 형식, 기본값: 어제)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 판정 없이 시뮬레이션만 실행',
        )

    def handle(self, *args, **options):
        # 판정 날짜 설정
        if options['date']:
            try:
                target_date = date.fromisoformat(options['date'])
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.')
                )
                return
        else:
            # 기본값: 어제
            target_date = timezone.now().date() - timedelta(days=1)

        self.stdout.write(f'📅 판정 날짜: {target_date}')
        
        # 활성 챌린지 조회
        active_challenges = UserChallenge.objects.filter(
            status='active',
            remaining_duration_days__gt=0
        ).select_related('user', 'room')

        if not active_challenges.exists():
            self.stdout.write(
                self.style.WARNING('판정할 활성 챌린지가 없습니다.')
            )
            return

        self.stdout.write(f'🎯 총 {active_challenges.count()}개의 활성 챌린지 발견')

        # 판정 서비스 초기화
        judgment_service = ChallengeJudgmentService()
        
        success_count = 0
        failure_count = 0
        error_count = 0

        for challenge in active_challenges:
            try:
                # 이미 판정된 기록이 있는지 확인
                existing_record = DailyChallengeRecord.objects.filter(
                    user_challenge=challenge,
                    date=target_date
                ).first()

                if existing_record:
                    self.stdout.write(
                        f'⏭️  {challenge.user.username} - 이미 판정됨 ({"성공" if existing_record.is_success else "실패"})'
                    )
                    continue

                if options['dry_run']:
                    self.stdout.write(
                        f'🔍 [DRY RUN] {challenge.user.username} - {challenge.room.name}'
                    )
                    continue

                # 일일 챌린지 판정 실행
                daily_record = judgment_service.judge_daily_challenge(challenge, target_date)
                
                if daily_record.is_success:
                    success_count += 1
                    status_icon = '✅'
                    status_text = '성공'
                else:
                    failure_count += 1
                    status_icon = '❌'
                    status_text = '실패'

                cheat_text = ' (치팅)' if daily_record.is_cheat_day else ''
                
                self.stdout.write(
                    f'{status_icon} {challenge.user.username} - {status_text}{cheat_text} '
                    f'({daily_record.total_calories:.0f}/{daily_record.target_calories:.0f}kcal)'
                )

            except Exception as e:
                error_count += 1
                logger.error(f'챌린지 판정 오류 - {challenge.user.username}: {e}')
                self.stdout.write(
                    self.style.ERROR(f'❌ {challenge.user.username} - 판정 오류: {e}')
                )

        # 결과 요약
        self.stdout.write('\n' + '='*50)
        self.stdout.write('📊 판정 결과 요약')
        self.stdout.write('='*50)
        self.stdout.write(f'✅ 성공: {success_count}명')
        self.stdout.write(f'❌ 실패: {failure_count}명')
        self.stdout.write(f'⚠️  오류: {error_count}명')
        self.stdout.write(f'📈 총 처리: {success_count + failure_count + error_count}명')

        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING('\n🔍 DRY RUN 모드로 실행되었습니다. 실제 판정은 수행되지 않았습니다.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n🎉 {target_date} 일일 챌린지 판정이 완료되었습니다!')
            )