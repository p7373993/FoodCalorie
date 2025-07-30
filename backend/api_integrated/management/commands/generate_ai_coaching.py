"""
AI 코칭 메시지 생성 명령어
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api_integrated.ai_coach import AICoachingService
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'AI 코칭 메시지를 생성합니다'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='특정 사용자명 (지정하지 않으면 모든 활성 사용자)'
        )
        parser.add_argument(
            '--type',
            type=str,
            default='daily',
            choices=['daily', 'weekly'],
            help='코칭 타입 (daily 또는 weekly)'
        )
    
    def handle(self, *args, **options):
        username = options.get('user')
        coaching_type = options['type']
        
        coaching_service = AICoachingService()
        
        if username:
            # 특정 사용자
            try:
                user = User.objects.get(username=username)
                users = [user]
                self.stdout.write(f'사용자 {username}에 대한 {coaching_type} 코칭 생성 중...')
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'사용자 {username}을 찾을 수 없습니다.')
                )
                return
        else:
            # 최근 활동이 있는 모든 사용자
            recent_date = date.today() - timedelta(days=7)
            users = User.objects.filter(
                meallog__date__gte=recent_date
            ).distinct()
            self.stdout.write(f'활성 사용자 {users.count()}명에 대한 {coaching_type} 코칭 생성 중...')
        
        success_count = 0
        error_count = 0
        
        for user in users:
            try:
                if coaching_type == 'daily':
                    result = coaching_service.generate_daily_coaching(user)
                    self.stdout.write(f'  {user.username}: {result}')
                else:  # weekly
                    result = coaching_service.generate_weekly_report(user)
                    self.stdout.write(f'  {user.username}: 주간 리포트 생성 완료')
                    self.stdout.write(f'    평균 칼로리: {result.get("avg_daily_calories", 0)}kcal')
                    self.stdout.write(f'    총 식사 수: {result.get("total_meals", 0)}회')
                
                success_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  {user.username}: 실패 - {str(e)}')
                )
                error_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'{coaching_type} 코칭 생성 완료: 성공 {success_count}명, 실패 {error_count}명'
            )
        )