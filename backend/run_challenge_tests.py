#!/usr/bin/env python
"""
챌린지 시스템 테스트 실행 스크립트
"""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

if __name__ == "__main__":
    os.environ['DJANGO_SETTINGS_MODULE'] = 'challenges.test_settings'
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # 챌린지 앱만 테스트
    failures = test_runner.run_tests(["challenges"])
    
    if failures:
        sys.exit(bool(failures))