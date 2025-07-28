"""
챌린지 시스템 테스트를 위한 Django 설정
"""

from config.settings import *

# 테스트용 데이터베이스 설정
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# 테스트 시 빠른 실행을 위한 설정
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# 캐시 비활성화
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# 이메일 백엔드 테스트용으로 변경
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# 미디어 파일 테스트 설정
MEDIA_ROOT = '/tmp/test_media'

# Celery 테스트 설정
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# 로깅 레벨 조정
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'challenges': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# 테스트 시 디버그 모드 비활성화
DEBUG = False

# 테스트용 시크릿 키
SECRET_KEY = 'test-secret-key-for-testing-only'

# 허용 호스트
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']