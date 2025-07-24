from django.apps import AppConfig


class ChallengesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "challenges"
    verbose_name = '챌린지 시스템'
    
    def ready(self):
        """앱이 준비되었을 때 실행되는 메서드"""
        import challenges.signals  # 시그널 등록
