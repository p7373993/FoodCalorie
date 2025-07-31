"""
챌린지 배지 생성 명령어
기본 배지들을 데이터베이스에 생성합니다.
"""

from django.core.management.base import BaseCommand
from challenges.models import ChallengeBadge


class Command(BaseCommand):
    help = '챌린지 배지를 생성합니다'

    def handle(self, *args, **options):
        badges_data = [
            # 연속 성공 배지
            {
                'name': '첫 걸음',
                'description': '첫 번째 성공을 달성했습니다',
                'icon': '🎯',
                'condition_type': 'streak',
                'condition_value': 1
            },
            {
                'name': '3일 연속',
                'description': '3일 연속 목표를 달성했습니다',
                'icon': '🔥',
                'condition_type': 'streak',
                'condition_value': 3
            },
            {
                'name': '일주일 챔피언',
                'description': '7일 연속 목표를 달성했습니다',
                'icon': '👑',
                'condition_type': 'streak',
                'condition_value': 7
            },
            {
                'name': '2주 마스터',
                'description': '14일 연속 목표를 달성했습니다',
                'icon': '🏆',
                'condition_type': 'streak',
                'condition_value': 14
            },
            {
                'name': '한 달 레전드',
                'description': '30일 연속 목표를 달성했습니다',
                'icon': '💎',
                'condition_type': 'streak',
                'condition_value': 30
            },
            
            # 총 성공 일수 배지
            {
                'name': '꾸준함의 시작',
                'description': '총 10일의 성공을 달성했습니다',
                'icon': '🌱',
                'condition_type': 'total_success',
                'condition_value': 10
            },
            {
                'name': '성실한 도전자',
                'description': '총 30일의 성공을 달성했습니다',
                'icon': '🌿',
                'condition_type': 'total_success',
                'condition_value': 30
            },
            {
                'name': '습관의 달인',
                'description': '총 60일의 성공을 달성했습니다',
                'icon': '🌳',
                'condition_type': 'total_success',
                'condition_value': 60
            },
            {
                'name': '라이프스타일 마스터',
                'description': '총 100일의 성공을 달성했습니다',
                'icon': '🏛️',
                'condition_type': 'total_success',
                'condition_value': 100
            },
            
            # 챌린지 완료 배지
            {
                'name': '첫 완주',
                'description': '첫 번째 챌린지를 완료했습니다',
                'icon': '🎊',
                'condition_type': 'completion',
                'condition_value': 1
            },
            {
                'name': '베테랑 챌린저',
                'description': '3개의 챌린지를 완료했습니다',
                'icon': '🎖️',
                'condition_type': 'completion',
                'condition_value': 3
            },
            {
                'name': '챌린지 마니아',
                'description': '5개의 챌린지를 완료했습니다',
                'icon': '🏅',
                'condition_type': 'completion',
                'condition_value': 5
            },
            
            # 완벽한 주 배지
            {
                'name': '완벽한 한 주',
                'description': '일주일 동안 모든 목표를 달성했습니다',
                'icon': '⭐',
                'condition_type': 'perfect_week',
                'condition_value': 1
            },
            {
                'name': '완벽주의자',
                'description': '4주 연속 완벽한 주를 달성했습니다',
                'icon': '🌟',
                'condition_type': 'perfect_week',
                'condition_value': 4
            }
        ]

        created_count = 0
        updated_count = 0

        for badge_data in badges_data:
            badge, created = ChallengeBadge.objects.get_or_create(
                name=badge_data['name'],
                defaults=badge_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'✅ 배지 생성: {badge.name}')
            else:
                # 기존 배지 업데이트
                for key, value in badge_data.items():
                    if key != 'name':
                        setattr(badge, key, value)
                badge.save()
                updated_count += 1
                self.stdout.write(f'🔄 배지 업데이트: {badge.name}')

        self.stdout.write('\n' + '='*50)
        self.stdout.write('🏅 배지 생성 완료')
        self.stdout.write('='*50)
        self.stdout.write(f'✅ 새로 생성된 배지: {created_count}개')
        self.stdout.write(f'🔄 업데이트된 배지: {updated_count}개')
        self.stdout.write(f'📊 총 배지 수: {ChallengeBadge.objects.count()}개')