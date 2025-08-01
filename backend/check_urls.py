#!/usr/bin/env python
"""
Django URL 패턴 확인 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.urls import get_resolver
from django.conf import settings

def show_urls():
    """모든 URL 패턴 출력"""
    print("🔍 Django URL 패턴 확인...")
    
    resolver = get_resolver()
    
    def print_urls(urlpatterns, prefix=''):
        for pattern in urlpatterns:
            if hasattr(pattern, 'url_patterns'):
                # Include된 URL 패턴
                print(f"{prefix}{pattern.pattern} -> Include")
                print_urls(pattern.url_patterns, prefix + '  ')
            else:
                # 개별 URL 패턴
                if hasattr(pattern, 'callback'):
                    view_name = pattern.callback.__name__ if hasattr(pattern.callback, '__name__') else str(pattern.callback)
                    print(f"{prefix}{pattern.pattern} -> {view_name}")
    
    print_urls(resolver.url_patterns)

if __name__ == '__main__':
    show_urls()