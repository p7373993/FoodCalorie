from django.core.management.base import BaseCommand
from chegam.models import Badge


class Command(BaseCommand):
    help = 'Create initial badges for the gamification system'

    def handle(self, *args, **options):
        badges_data = [
            {
                'name': '첫 식단 기록!',
                'description': '첫 번째 식단을 기록한 사용자에게 주어지는 배지',
                'icon': '🏅'
            },
            {
                'name': '챌린지 개설자',
                'description': '첫 번째 챌린지를 생성한 사용자에게 주어지는 배지',
                'icon': '🎯'
            },
            {
                'name': '체중 관리자',
                'description': '체중을 꾸준히 기록하는 사용자에게 주어지는 배지',
                'icon': '⚖️'
            },
            {
                'name': '챌린지 참여자',
                'description': '챌린지에 적극적으로 참여하는 사용자에게 주어지는 배지',
                'icon': '🤝'
            }
        ]

        for badge_data in badges_data:
            badge, created = Badge.objects.get_or_create(
                name=badge_data['name'],
                defaults={
                    'description': badge_data['description'],
                    'icon': badge_data['icon']
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created badge: {badge.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Badge already exists: {badge.name}')
                )

        self.stdout.write(
            self.style.SUCCESS('Initial badges creation completed!')
        )