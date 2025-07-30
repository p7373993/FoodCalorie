from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from challenges.models import ChallengeRoom, UserChallenge

class Command(BaseCommand):
    help = '챌린지 테스트 데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='기존 테스트 챌린지 데이터를 삭제하고 새로 생성합니다.',
        )

    def handle(self, *args, **options):
        self.stdout.write("🚀 챌린지 테스트 데이터 생성 시작...")
        
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
            deleted_count = UserChallenge.objects.filter(user=user).delete()[0]
            self.stdout.write(f"🗑️ 기존 테스트 챌린지 데이터 {deleted_count}개 삭제")
        
        # 챌린지 데이터 생성
        challenges_data = [
            {
                'name': '1500kcal_challenge',
                'target_calorie': 1500,
                'tolerance': 50,
                'description': '일주일 동안 매일 1500kcal 이하로 식사해보세요!',
                'is_active': True,
                'dummy_users_count': 23
            },
            {
                'name': '1800kcal_challenge',
                'target_calorie': 1800,
                'tolerance': 50,
                'description': '일주일 동안 매일 1800kcal 이하로 식사해보세요!',
                'is_active': True,
                'dummy_users_count': 15
            },
            {
                'name': '2000kcal_challenge',
                'target_calorie': 2000,
                'tolerance': 50,
                'description': '일주일 동안 매일 2000kcal 이하로 식사해보세요!',
                'is_active': True,
                'dummy_users_count': 28
            },
            {
                'name': 'breakfast_challenge',
                'target_calorie': 2500,
                'tolerance': 100,
                'description': '일주일 동안 매일 아침을 꼭 챙겨먹어보세요!',
                'is_active': True,
                'dummy_users_count': 19
            },
            {
                'name': 'protein_challenge',
                'target_calorie': 2200,
                'tolerance': 75,
                'description': '일주일 동안 매일 80g 이상의 단백질을 섭취해보세요!',
                'is_active': True,
                'dummy_users_count': 12
            }
        ]
        
        created_count = 0
        for challenge_data in challenges_data:
            # 챌린지 생성
            challenge, created = ChallengeRoom.objects.get_or_create(
                name=challenge_data['name'],
                defaults=challenge_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"🏆 챌린지 생성: {challenge.name}")
            
            # 사용자 챌린지 참여 (일부만)
            if challenge_data['name'] in ['1500kcal_challenge', 'breakfast_challenge']:
                user_challenge, created = UserChallenge.objects.get_or_create(
                    user=user,
                    room=challenge,
                    defaults={
                        'user_height': 170.0,
                        'user_weight': 70.0,
                        'user_target_weight': 65.0,
                        'user_challenge_duration_days': 7,
                        'user_weekly_cheat_limit': 1,
                        'min_daily_meals': 3,
                        'remaining_duration_days': 4,
                        'current_streak_days': 3,
                        'max_streak_days': 3,
                        'total_success_days': 3,
                        'total_failure_days': 0,
                        'status': 'active'
                    }
                )
                if created:
                    self.stdout.write(f"👤 사용자 챌린지 참여: {challenge.name}")
        
        self.stdout.write(self.style.SUCCESS(f"✅ 총 {created_count}개의 챌린지 생성 완료!"))
        self.stdout.write("🎯 챌린지 더미데이터가 성공적으로 생성되었습니다.") 