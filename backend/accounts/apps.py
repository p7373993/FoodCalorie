from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    verbose_name = '사용자 인증'
    
    def ready(self):
        # 시그널 등록
        import accounts.signals
